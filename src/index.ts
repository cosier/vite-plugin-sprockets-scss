/**
 * @file: .vite/plugins/sprockets-scss/src/index.ts
 * @description: Main entry point for the Sprockets SCSS plugin
 */

import type { Plugin as VitePlugin } from 'vite'
import path from 'path'
import { SprocketsPluginOptions, ResolvedOptions } from './types'
import { resolveOptions } from './config/options'
import { createLogger } from './utils/logger'
import { FileManager } from './core/file-manager'
import { ScssCompiler } from './core/compiler'
import { SprocketsResolver as Resolver } from './core/resolver'
import { findFiles, createIgnorePatterns } from './utils/glob-utils'

export default function viteSprocketsScss(
    options: SprocketsPluginOptions = {}
): VitePlugin {
    let resolvedOptions: ResolvedOptions
    let logger: ReturnType<typeof createLogger>
    let fileManager: FileManager
    let compiler: ScssCompiler
    let resolver: Resolver

    return {
        name: 'vite-plugin-sprockets-scss',

        configResolved() {
            resolvedOptions = resolveOptions(options)
            logger = createLogger(resolvedOptions.debug)
            fileManager = new FileManager(resolvedOptions, logger)
            compiler = new ScssCompiler(resolvedOptions, logger)
            resolver = new Resolver(resolvedOptions, logger, fileManager)
        },

        async buildStart() {
            logger.info('Starting Sprockets SCSS processing')
            await fileManager.cleanup()
            await fileManager.ensureOutputDirectories()

            try {
                await processIndividualFiles()
                await processEntryGroups()
            } catch (error) {
                logger.error('Build process failed', error as Error)
                throw error
            }
        },
    }

    async function processIndividualFiles(): Promise<void> {
        const stylesDir = path.join(
            resolvedOptions.root,
            'app/assets/stylesheets'
        )
        const ignorePatterns = createIgnorePatterns(
            Object.values(resolvedOptions.entryGroups).flat()
        )

        const files = await findFiles(['**/*.{scss,sass}'], {
            cwd: stylesDir,
            ignore: ignorePatterns,
        })

        logger.group('Processing individual files')
        for (const file of files) {
            try {
                const fullPath = path.join(stylesDir, file)
                if (fileManager.shouldProcessFile(fullPath)) {
                    const content = await fileManager.readFile(fullPath)
                    const resolvedContent = await resolver.resolveRequires(
                        content,
                        fullPath
                    )
                    const result = await compiler.compile(
                        resolvedContent.content,
                        fullPath
                    )

                    if (result.errors && result.errors.length > 0) {
                        logger.error(
                            `Compilation errors in ${file}:`,
                            new Error(result.errors.join('\n'))
                        )
                        continue
                    }

                    await fileManager.writeProcessedFile({
                        path: file,
                        content: result.css,
                        dependencies: result.dependencies,
                    })
                }
            } catch (error) {
                logger.error(`Error processing ${file}:`, error as Error)
            }
        }
        logger.groupEnd()
    }

    async function processEntryGroups(): Promise<void> {
        const stylesDir = path.join(
            resolvedOptions.root,
            'app/assets/stylesheets'
        )

        logger.group('Processing entry groups')
        for (const [groupName, patterns] of Object.entries(
            resolvedOptions.entryGroups
        )) {
            try {
                logger.group(`Group: ${groupName}`)
                let combinedContent = ''

                const matchedFiles = await findFiles(patterns, {
                    cwd: stylesDir,
                })

                for (const file of matchedFiles) {
                    const fullPath = path.join(stylesDir, file)
                    const content = await fileManager.readFile(fullPath)
                    const resolvedContent = await resolver.resolveRequires(
                        content,
                        fullPath
                    )
                    combinedContent += resolvedContent.content
                }

                const result = await compiler.compile(
                    combinedContent,
                    `${groupName}.scss`
                )

                if (result.errors && result.errors.length > 0) {
                    logger.error(
                        `Compilation errors in group ${groupName}:`,
                        new Error(result.errors.join('\n'))
                    )
                    continue
                }

                await fileManager.writeProcessedFile(
                    {
                        path: `${groupName}.css`,
                        content: result.css,
                        dependencies: result.dependencies,
                    },
                    true
                )

                logger.groupEnd()
            } catch (error) {
                logger.error(
                    `Error processing group ${groupName}:`,
                    error as Error
                )
                logger.groupEnd()
            }
        }
        logger.groupEnd()
    }
}
