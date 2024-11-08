/**
 * @file: .vite/plugins/sprockets-scss/core/file-manager.ts
 * @description: File system operations and management
 */

import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { ProcessedFile, ResolvedOptions } from '../types'
import { Logger } from '../utils/logger'
import { OUTPUT_DIRS } from '../config/defaults'

export class FileManager {
    private logger: Logger
    private options: ResolvedOptions
    private fileCache: Map<string, string>

    constructor(options: ResolvedOptions, logger: Logger) {
        this.options = options
        this.logger = logger
        this.fileCache = new Map()
    }

    async readFile(filePath: string): Promise<string> {
        try {
            // Check cache first
            if (this.fileCache.has(filePath)) {
                this.logger.debug(`Cache hit: ${filePath}`)
                return this.fileCache.get(filePath)!
            }

            const content = await fs.readFile(filePath, 'utf-8')
            this.fileCache.set(filePath, content)
            return content
        } catch (error) {
            this.logger.error(
                `Failed to read file: ${filePath}`,
                error as Error
            )
            throw error
        }
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true })
            await fs.writeFile(filePath, content)
            this.logger.debug(`Written file: ${filePath}`)
        } catch (error) {
            this.logger.error(
                `Failed to write file: ${filePath}`,
                error as Error
            )
            throw error
        }
    }

    async ensureOutputDirectories(): Promise<void> {
        const dirs = [
            ...Object.values(OUTPUT_DIRS),
            this.options.preserveIntermediateScss ? 'intermediate' : null
        ]
        .filter(Boolean)
        .map((dir) => path.join(this.options.outputPath, dir as string))

        for (const dir of dirs) {
            if (!existsSync(dir)) {
                await fs.mkdir(dir, { recursive: true })
                this.logger.debug(`Created directory: ${dir}`)
            }
        }
    }

    getOutputPath(fileName: string, isGroup: boolean = false): string {
        const dir = isGroup ? OUTPUT_DIRS.group : OUTPUT_DIRS.single
        return path.join(
            this.options.outputPath,
            dir,
            fileName.replace(/\.s[ac]ss$/, '.css')
        )
    }

    getIntermediateScssPath(fileName: string, isGroup: boolean): string {
        const dir = isGroup ? 'group' : 'single'
        const intermediatePath = this.options.intermediateOutputPath ||
            path.join(this.options.outputPath, 'intermediate')

        return path.join(
            intermediatePath,
            dir,
            fileName
        )
    }

    async writeProcessedFile(
        processedFile: ProcessedFile,
        isGroup: boolean = false
    ): Promise<void> {
        const outputPath = this.getOutputPath(processedFile.path, isGroup)
        await this.writeFile(outputPath, processedFile.content)

        if (this.options.preserveIntermediateScss) {
            const intermediateScss = this.getIntermediateScssPath(processedFile.path, isGroup)
            await this.writeFile(
                intermediateScss,
                processedFile.intermediateScss || processedFile.content
            )
        }
    }

    async cleanup(): Promise<void> {
        try {
            await fs.rm(this.options.outputPath, {
                recursive: true,
                force: true,
            })
            this.logger.debug(
                `Cleaned up output directory: ${this.options.outputPath}`
            )

            if (this.options.intermediateOutputPath) {
                await fs.rm(this.options.intermediateOutputPath, {
                    recursive: true,
                    force: true,
                })
                this.logger.debug(
                    `Cleaned up intermediate directory: ${this.options.intermediateOutputPath}`
                )
            }
        } catch (error) {
            this.logger.error(
                'Failed to cleanup directories',
                error as Error
            )
        }
        this.clearCache()
    }

    clearCache(): void {
        this.fileCache.clear()
        this.logger.debug('Cleared file cache')
    }

    isPartial(filePath: string): boolean {
        return path.basename(filePath).startsWith('_')
    }

    shouldProcessFile(filePath: string): boolean {
        return !this.options.ignorePartials || !this.isPartial(filePath)
    }
}
