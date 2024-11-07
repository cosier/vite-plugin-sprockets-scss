/**
 * @file: src/core/compiler.ts
 * @description: SCSS compilation and processing logic with source map support
 */

import * as sass from 'sass'
import path from 'path'
import { promises as fs } from 'fs'
import { CompilationResult, ResolvedOptions, CompilationStats, Syntax, SassCompilerOptions } from '../types'
import { Logger } from '../utils/logger'
import { ERROR_CODES } from '../constants'
import { SprocketsError, ErrorCode } from '../utils/errors'
import { PerformanceMonitor } from '../utils/performance'

export class ScssCompiler {
    private logger: Logger
    private options: ResolvedOptions
    private sourceMapCache: Map<string, string>
    private performanceMonitor?: PerformanceMonitor

    constructor(options: ResolvedOptions, logger: Logger) {
        this.options = options
        this.logger = logger
        this.sourceMapCache = new Map()
        if (this.options.debug) {
            this.performanceMonitor = new PerformanceMonitor()
        }
    }

    async compile(
        content: string,
        filePath: string,
        additionalImports: string[] = []
    ): Promise<CompilationResult> {
        try {
            this.logger.debug(`Compiling: ${filePath}`)
            this.performanceMonitor?.start()

            // Add any additional imports to the top of the content
            const contentWithImports = additionalImports.length > 0
                ? additionalImports.map(imp => `@import "${imp}";`).join('\n') + '\n' + content
                : content

            const result = sass.compileString(contentWithImports, {
                loadPaths: this.options.includePaths,
                sourceMap: true,
                sourceMapIncludeSources: true,
                importers: [
                    {
                        findFileUrl(url) {
                            if (!url.startsWith('~')) return null
                            return new URL(
                                `file://${path.resolve(
                                    process.cwd(),
                                    'node_modules',
                                    url.slice(1)
                                )}`
                            )
                        }
                    }
                ],
                syntax: this.detectSyntax(filePath),
                logger: {
                    warn: (message) => this.logger.warn(message),
                    debug: (message) => this.logger.debug(message)
                }
            })

            const sourceMap = this.generateSourceMap(contentWithImports, filePath, result.sourceMap)
            this.sourceMapCache.set(filePath, sourceMap)

            this.performanceMonitor?.mark('compile-end')

            return {
                css: result.css,
                map: sourceMap,
                dependencies: result.loadedUrls.map((url: URL) => url.toString()),
                errors: [],
                stats: {
                    cacheSize: this.sourceMapCache.size,
                    duration: this.performanceMonitor?.getDuration() || 0
                }
            }
        } catch (error) {
            const errorMessage = (error as Error).message
            this.logger.error(
                `Compilation error in ${filePath}`,
                new SprocketsError(
                    errorMessage,
                    ErrorCode.COMPILATION_ERROR,
                    { filePath, error }
                )
            )
            return {
                css: '',
                dependencies: [],
                errors: [errorMessage],
                stats: {
                    cacheSize: this.sourceMapCache.size,
                    duration: this.performanceMonitor?.getDuration() || 0
                }
            }
        }
    }

    async compileFile(filePath: string): Promise<CompilationResult> {
        try {
            this.logger.debug(`Compiling file: ${filePath}`)
            this.performanceMonitor?.start()

            const result = await sass.compileAsync(filePath, {
                loadPaths: this.options.includePaths,
                sourceMap: true,
                importers: [
                    {
                        findFileUrl(url) {
                            if (!url.startsWith('~')) return null
                            return new URL(
                                `file://${path.resolve(
                                    process.cwd(),
                                    'node_modules',
                                    url.slice(1)
                                )}`
                            )
                        }
                    }
                ],
                logger: {
                    warn: (message) => this.logger.warn(message),
                    debug: (message) => this.logger.debug(message)
                }
            })

            const fileContent = await fs.readFile(filePath, 'utf-8')
            const sourceMap = this.generateSourceMap(fileContent, filePath, result.sourceMap)
            this.sourceMapCache.set(filePath, sourceMap)

            this.performanceMonitor?.mark('compile-file-end')

            return {
                css: result.css,
                map: sourceMap,
                dependencies: result.loadedUrls.map((url: URL) => url.toString()),
                errors: [],
                stats: {
                    cacheSize: this.sourceMapCache.size,
                    duration: this.performanceMonitor?.getDuration() || 0
                }
            }
        } catch (error) {
            const errorMessage = (error as Error).message
            this.logger.error(
                `File compilation error: ${filePath}`,
                new SprocketsError(
                    errorMessage,
                    ErrorCode.COMPILATION_ERROR,
                    { filePath, error }
                )
            )
            return {
                css: '',
                dependencies: [],
                errors: [errorMessage],
                stats: {
                    cacheSize: this.sourceMapCache.size,
                    duration: this.performanceMonitor?.getDuration() || 0
                }
            }
        }
    }

    private detectSyntax(filePath: string): Syntax {
        const ext = path.extname(filePath).toLowerCase()
        switch (ext) {
            case '.scss':
                return 'scss'
            case '.sass':
                return 'indented'
            case '.css':
                return 'scss' // Use SCSS syntax for CSS files
            default:
                return 'scss' // Default to SCSS
        }
    }

    private generateSourceMap(
        content: string,
        filePath: string,
        sassSourceMap: any
    ): string {
        return JSON.stringify({
            version: 3,
            file: path.basename(filePath),
            sources: [filePath],
            sourcesContent: [content],
            mappings: sassSourceMap?.mappings || 'AAAA',
            names: sassSourceMap?.names || []
        })
    }

    clearCache(): void {
        this.sourceMapCache.clear()
        this.logger.debug('Cleared compiler cache')
    }

    getSourceMap(filePath: string): string | undefined {
        return this.sourceMapCache.get(filePath)
    }

    getStats(): CompilationStats {
        return {
            cacheSize: this.sourceMapCache.size,
            duration: this.performanceMonitor?.getDuration() || 0
        }
    }
}
