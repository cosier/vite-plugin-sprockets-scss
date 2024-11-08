/**
 * @file: src/core/compiler.ts
 * @description: SCSS compilation and processing logic with source map support
 */

import * as sass from 'sass'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { CompilationResult, ResolvedOptions, CompilationStats, Syntax } from '../types'
import { Logger } from '../utils/logger'
import { ERROR_CODES } from '../constants'
import { SprocketsError, ErrorCode, CompilationError } from '../utils/errors'
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

    private async loadGlobalMixins(): Promise<string[]> {
        if (!this.options.globalMixins?.length) return [];

        const results = await Promise.all(
            this.options.globalMixins.map(async (mixinPath) => {
                try {
                    // Try various file patterns
                    const variations = [
                        mixinPath,
                        `_${mixinPath}`,
                        `${mixinPath}.scss`,
                        `_${mixinPath}.scss`,
                        'lib/' + mixinPath,
                        `lib/_${mixinPath}`,
                        `lib/${mixinPath}.scss`,
                        `lib/_${mixinPath}.scss`
                    ];

                    for (const variant of variations) {
                        const fullPath = path.isAbsolute(variant)
                            ? variant
                            : path.join(this.options.root, 'app/assets/stylesheets', variant);

                        try {
                            const content = await fs.readFile(fullPath, 'utf-8');
                            return { path: fullPath, content };
                        } catch (e) {
                            // Continue to next variation
                            continue;
                        }
                    }

                    throw new Error(`Global mixin file not found: ${mixinPath}`);
                } catch (error) {
                    this.logger.error(`Failed to load global mixin: ${mixinPath}`, error as Error);
                    throw new Error(`Failed to load global mixin '${mixinPath}': ${(error as Error).message}`);
                }
            })
        );

        return results.map(({ path: filePath, content }) => {
            const relativePath = path.relative(this.options.root, filePath);
            return `// Global mixin from: ${relativePath}\n${content}\n`;
        });
    }

    async compile(
        content: string,
        filePath: string,
        additionalImports: string[] = []
    ): Promise<CompilationResult> {
        try {
            this.logger.debug(`Compiling: ${filePath}`)
            this.performanceMonitor?.start()

            let globalMixins: string[];
            try {
                globalMixins = await this.loadGlobalMixins();
            } catch (error) {
                this.logger.error('Failed to load global mixins', error as Error);
                throw error;
            }

            const contentWithImports = [
                ...globalMixins,
                ...additionalImports.map(imp => `@import "${imp}";`),
                content
            ].join('\n')

            console.log(`[compile] ${filePath}:\n`, contentWithImports, "\n")

            const result = sass.compileString(contentWithImports, {
                loadPaths: [...this.options.includePaths, path.join(this.options.root, 'app/assets/stylesheets')],
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

            const compilationResult = {
                css: result.css,
                map: sourceMap,
                dependencies: result.loadedUrls.map((url: URL) => url.toString()),
                intermediateScss: this.options.preserveIntermediateScss ? contentWithImports : undefined,
                errors: [],
                stats: {
                    cacheSize: this.sourceMapCache.size,
                    duration: this.performanceMonitor?.getDuration() || 0
                }
            }

            if (this.options.preserveIntermediateScss) {
                await this.writeIntermediateScss(filePath, contentWithImports);
            }

            return compilationResult;

        } catch (error) {
            const sassError = error as sass.Exception
            const location = {
                line: sassError.span?.start.line || 0,
                column: sassError.span?.start.column || 0,
                content: sassError.span && sassError.source ? this.formatErrorSource(sassError) : undefined
            }
            const compilationError = new CompilationError(
                sassError.message || 'Unknown compilation error',
                location,
                filePath
            )
            this.logger.error(compilationError.formatError())
            return {
                css: '',
                dependencies: [],
                errors: [compilationError],
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

            let globalMixins: string[];
            try {
                globalMixins = await this.loadGlobalMixins();
            } catch (error) {
                this.logger.error('Failed to load global mixins', error as Error);
                throw error;
            }

            const fileContent = await fs.readFile(filePath, 'utf-8');
            const contentWithMixins = [...globalMixins, fileContent].join('\n');

            const result = await sass.compileAsync(filePath, {
                loadPaths: [...this.options.includePaths, path.join(this.options.root, 'app/assets/stylesheets')],
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

            const sourceMap = this.generateSourceMap(contentWithMixins, filePath, result.sourceMap)
            this.sourceMapCache.set(filePath, sourceMap)

            this.performanceMonitor?.mark('compile-file-end')

            if (this.options.preserveIntermediateScss) {
                await this.writeIntermediateScss(filePath, contentWithMixins);
            }

            return {
                css: result.css,
                map: sourceMap,
                dependencies: result.loadedUrls.map((url: URL) => url.toString()),
                intermediateScss: this.options.preserveIntermediateScss ? contentWithMixins : undefined,
                errors: [],
                stats: {
                    cacheSize: this.sourceMapCache.size,
                    duration: this.performanceMonitor?.getDuration() || 0
                }
            }
        } catch (error) {
            const sassError = error as sass.Exception
            const location = {
                line: sassError.span?.start.line || 0,
                column: sassError.span?.start.column || 0,
                content: sassError.span && sassError.source ? this.formatErrorSource(sassError) : undefined
            }
            const compilationError = new CompilationError(
                sassError.message || 'Unknown compilation error',
                location,
                filePath
            )
            this.logger.error(compilationError.formatError())
            return {
                css: '',
                dependencies: [],
                errors: [compilationError],
                stats: {
                    cacheSize: this.sourceMapCache.size,
                    duration: this.performanceMonitor?.getDuration() || 0
                }
            }
        }
    }

    private formatErrorSource(error: sass.Exception): string {
        if (!error.span || !error.source) return '';

        const lines = error.source.split('\n');
        const errorLine = lines[error.span.start.line - 1];
        const pointer = ' '.repeat(error.span.start.column) + '^';

        return [
            `${error.span.start.line} | ${errorLine}`,
            `${' '.repeat(String(error.span.start.line).length)} | ${pointer}`
        ].join('\n');
    }

    private async writeIntermediateScss(filePath: string, content: string): Promise<void> {
        const intermediatePath = this.options.intermediateOutputPath ||
            path.join(this.options.outputPath, 'intermediate');
        const outputPath = path.join(
            intermediatePath,
            path.basename(filePath)
        );

        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, content);
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
