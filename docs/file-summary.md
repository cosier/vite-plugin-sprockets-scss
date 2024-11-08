# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/scripts/build.ts

import * as esbuild from "@luca/esbuild";
// import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.8.2/mod.ts";
import * as esbuildDenoLoader from "https://deno.land/x/esbuild_deno_loader@0.8.2/mod.ts";
const denoPlugins = esbuildDenoLoader.denoPlugins;

const outdir = 'dist';

// Parse version from deno.json
const denoConfig = JSON.parse(await Deno.readTextFile('./deno.json'));
const version = denoConfig.version || '0.1.0';

// Ensure dist directory exists
await Deno.mkdir(outdir, { recursive: true });

// Build the plugin
await esbuild.build({
  entryPoints: ['./mod.ts'],
  outfile: `${outdir}/plugin.js`,
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  target: ['esnext'],
  plugins: [...denoPlugins()],
  external: [
    'vite',
    'sass',
    'path',
    'fs',
    'node:path',
    'node:fs',
    'node:fs/promises'
  ],
  define: {
    'Deno.env.get': 'process.env',
  },
  banner: {
    js: `
      // vite-plugin-sprockets-scss v${version}
      // Copyright (c) ${new Date().getFullYear()} Bailey Cosier
      // License: MIT
    `.trim(),
  },
});

// Copy type definitions
await Deno.copyFile('./mod.ts', `${outdir}/plugin.d.ts`);

// Create package.json for npm publishing
await Deno.writeTextFile(`${outdir}/package.json`, JSON.stringify({
  name: "vite-plugin-sprockets-scss",
  version: JSON.parse(await Deno.readTextFile("./deno.json")).version,
  description: "Vite plugin for Sprockets-style SCSS compilation",
  type: "module",
  main: "./plugin.js",
  types: "./plugin.d.ts",
  files: ["plugin.js", "plugin.d.ts"],
  author: "Bailey Cosier",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/cosier/vite-plugin-sprockets-scss.git"
  },
  keywords: ["vite-plugin", "scss", "sprockets", "rails"],
  peerDependencies: {
    "vite": "^5.0.0",
    "sass": "^1.69.0"
  }
}, null, 2));

// Clean up
await esbuild.stop();

console.log('Build complete! Output in dist/'); 

---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/scripts/dev.ts

/**
 * @file: .vite/plugins/sprockets-scss/scripts/dev.ts
 * @description: Development helper script
 */

/// <reference lib="dom" />

import { watch } from 'fs'
import { spawn } from 'child_process'
import path from 'path'

const BUILD_DEBOUNCE = 100
let buildTimer: NodeJS.Timeout | null = null

const build = () => {
    console.log('🔨 Building...')
    const process = spawn('bun', ['run', 'build'], { stdio: 'inherit' })

    process.on('exit', (code) => {
        if (code === 0) {
            console.log('✅ Build completed')
        } else {
            console.error('❌ Build failed')
        }
    })
}

const debouncedBuild = () => {
    if (buildTimer) clearTimeout(buildTimer)
    const timer = setTimeout(build, BUILD_DEBOUNCE) as unknown as { [Symbol.dispose](): void } & NodeJS.Timeout
    timer[Symbol.dispose] = () => clearTimeout(timer)
    buildTimer = timer
}

console.log('👀 Watching for changes...')

watch(path.resolve(__dirname, '../src'), { recursive: true }, (_, filename) => {
    if (filename?.endsWith('.ts')) {
        console.log(`📝 Changed: ${filename}`)
        debouncedBuild()
    }
})

build()


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/config/defaults.ts

/**
 * @file: .vite/plugins/sprockets-scss/config/defaults.ts
 * @description: Default configuration values
 */

import { SprocketsPluginOptions } from '../types'

export const DEFAULT_OPTIONS: SprocketsPluginOptions = {
    root: process.cwd(),
    includePaths: [],
    entryGroups: {},
    outputPath: 'public/assets/vt/sprockets',
    fileMapping: {},
    aliases: {},
    debug: false,
    ignorePartials: true,
}

export const SUPPORTED_EXTENSIONS = ['.scss', '.sass', '.css']

export const DEFAULT_GLOB_OPTIONS = {
    followSymbolicLinks: false,
    dot: false,
    ignore: ['**/node_modules/**', '**/_*.scss'], // Ignore partials by default
}

export const OUTPUT_DIRS = {
    single: 'single',
    group: 'group',
}

export const DIRECTIVE_PATTERNS = {
    require:
        /(?:\/\/|\/\*|#)\s*=\s*(require|require_tree)\s+['"]?([^'"\n]+)['"]?/g,
    importStatement: /@import\s+['"]([^'"]+)['"]/g,
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/config/options.ts

/**
 * @file: .vite/plugins/sprockets-scss/config/options.ts
 * @description: Plugin configuration and options management
 */

import { SprocketsPluginOptions, ResolvedOptions } from '../types'
import { DEFAULT_OPTIONS } from './defaults'
import path from 'path'

function ensurePath(...parts: (string | undefined)[]): string {
    const validParts = parts.filter((part): part is string => typeof part === 'string')
    return path.resolve(...validParts)
}

export function resolveOptions(
    options: SprocketsPluginOptions
): ResolvedOptions {
    const resolved: ResolvedOptions = {
        ...DEFAULT_OPTIONS,
        // Ensure required string fields have default values
        root: ensurePath(options.root || process.cwd()),
        outputPath: ensurePath(options.outputPath || DEFAULT_OPTIONS.outputPath),
        cacheDirectory: ensurePath(options.cacheDirectory || DEFAULT_OPTIONS.cacheDirectory),
        // Handle global mixins
        globalMixins: options.globalMixins || DEFAULT_OPTIONS.globalMixins,
        // Merge arrays and objects
        includePaths: [
            ...(DEFAULT_OPTIONS.includePaths || []),
            ...(options.includePaths || []),
        ].filter((value, index, self) => self.indexOf(value) === index),
        entryGroups: {
            ...DEFAULT_OPTIONS.entryGroups,
            ...options.entryGroups,
        },
        fileMapping: {
            ...DEFAULT_OPTIONS.fileMapping,
            ...options.fileMapping,
        },
        aliases: {
            ...DEFAULT_OPTIONS.aliases,
            ...options.aliases,
        },
        // Handle boolean options
        debug: Boolean(options.debug ?? DEFAULT_OPTIONS.debug),
        ignorePartials: Boolean(
            options.ignorePartials ?? DEFAULT_OPTIONS.ignorePartials
        ),
        sourceMap: Boolean(options.sourceMap ?? DEFAULT_OPTIONS.sourceMap),
        cache: Boolean(options.cache ?? DEFAULT_OPTIONS.cache),
    } as ResolvedOptions;

    // Ensure all include paths are absolute
    resolved.includePaths = resolved.includePaths.map((p) =>
        path.isAbsolute(p) ? p : path.resolve(resolved.root, p)
    )

    validateOptions(resolved)
    return resolved
}

export function validateOptions(options: ResolvedOptions): void {
    if (!options.root) {
        throw new Error('Root directory must be specified')
    }

    if (!options.outputPath) {
        throw new Error('Output path must be specified')
    }

    // Validate entry groups
    if (typeof options.entryGroups !== 'object') {
        throw new Error('Entry groups must be an object')
    }

    // Validate file mapping
    if (typeof options.fileMapping !== 'object') {
        throw new Error('File mapping must be an object')
    }

    // Validate aliases
    if (typeof options.aliases !== 'object') {
        throw new Error('Aliases must be an object')
    }

    // Validate include paths
    if (!Array.isArray(options.includePaths)) {
        throw new Error('Include paths must be an array')
    }

    // Validate each path exists
    for (const includePath of options.includePaths) {
        if (!path.isAbsolute(includePath)) {
            throw new Error(`Include path must be absolute: ${includePath}`)
        }
    }

    // Validate global mixins
    if (options.globalMixins && !Array.isArray(options.globalMixins)) {
        throw new Error('Global mixins must be an array of strings')
    }

    if (options.globalMixins) {
        for (const mixin of options.globalMixins) {
            if (typeof mixin !== 'string') {
                throw new Error(`Invalid global mixin: ${mixin}. Must be a string path.`)
            }
        }
    }
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/constants/index.ts

/**
 * @file: .vite/plugins/sprockets-scss/src/constants/index.ts
 * @description: Constants and error codes for the Sprockets SCSS plugin
 */

export const ERROR_CODES = {
    FILE_NOT_FOUND: 'SPROCKETS_FILE_NOT_FOUND',
    COMPILATION_ERROR: 'SPROCKETS_COMPILATION_ERROR',
    INVALID_CONFIG: 'SPROCKETS_INVALID_CONFIG',
    CIRCULAR_DEPENDENCY: 'SPROCKETS_CIRCULAR_DEPENDENCY',
    RESOLVE_ERROR: 'SPROCKETS_RESOLVE_ERROR',
    WRITE_ERROR: 'SPROCKETS_WRITE_ERROR',
    READ_ERROR: 'SPROCKETS_READ_ERROR'
} as const

export const ERROR_MESSAGES = {
    [ERROR_CODES.FILE_NOT_FOUND]: 'File not found: {path}',
    [ERROR_CODES.COMPILATION_ERROR]: 'SCSS compilation error: {message}',
    [ERROR_CODES.INVALID_CONFIG]: 'Invalid configuration: {message}',
    [ERROR_CODES.CIRCULAR_DEPENDENCY]: 'Circular dependency detected: {path}',
    [ERROR_CODES.RESOLVE_ERROR]: 'Failed to resolve import: {path}',
    [ERROR_CODES.WRITE_ERROR]: 'Failed to write file: {path}',
    [ERROR_CODES.READ_ERROR]: 'Failed to read file: {path}'
} as const

export const BOUNDARY_MARKERS = {
    START: '/* FILE_BOUNDARY: {path} - START */',
    END: '/* FILE_BOUNDARY: {path} - END */'
} as const

export const SUPPORTED_EXTENSIONS = ['.scss', '.sass', '.css'] as const

export const DEFAULT_PATHS = {
    OUTPUT: 'public/assets/vt/sprockets',
    STYLES: 'app/assets/stylesheets'
} as const

export const DIRECTIVE_REGEX = {
    REQUIRE: /(?:\/\/|\/\*|#)\s*=\s*(require|require_tree)\s+['"]?([^'"\n]+)['"]?/g,
    IMPORT: /@import\s+['"]([^'"]+)['"]/g
} as const

export const FILE_TYPES = {
    SINGLE: 'single',
    GROUP: 'group'
} as const


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/core/compiler.ts

/**
 * @file: src/core/compiler.ts
 * @description: SCSS compilation and processing logic with source map support
 */

import * as sass from 'sass'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import type { CompilationResult, ResolvedOptions, CompilationStats, Syntax } from "~/types/index.ts";
import { Logger } from "~/utils/logger.ts";
// import { ERROR_CODES } from "~/constants.ts";
import { SprocketsError, ErrorCode, CompilationError } from "~/utils/errors.ts";
import { PerformanceMonitor } from "~/utils/performance.ts";

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


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/core/file-manager.ts

/**
 * @file: .vite/plugins/sprockets-scss/core/file-manager.ts
 * @description: File system operations and management
 */

import * as fs from "@std/fs/promises";
import { existsSync } from "@std/fs";
import * as path from "@std/path";
import type { ProcessedFile, ResolvedOptions } from "~/types/index.ts";
import type { Logger } from "~/utils/logger.ts";
import { OUTPUT_DIRS } from "~/config/defaults.ts";

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


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/core/index.ts

/**
 * @file: .vite/plugins/sprockets-scss/src/core/index.ts
 * @description: Core module exports
 */

export { ScssCompiler } from './compiler'
export { FileManager } from './file-manager'
export { SprocketsResolver } from './resolver'

// Common types used across core modules
export type { CompilationResult, ResolvedContent } from '../types'


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/core/resolver.ts

import path from 'path'
import { existsSync } from 'fs'
import { ResolvedOptions, ResolvedContent } from '../types'
import { Logger } from '../utils/logger'
import { FileManager } from './file-manager'
import { SUPPORTED_EXTENSIONS, DIRECTIVE_PATTERNS } from '../config/defaults'
import {
   createBoundaryMarker,
   matchWildcard,
} from '../utils/path-utils'
import { findFiles } from '../utils/glob-utils'
import { CircularDependencyError, FileNotFoundError } from '../utils/errors'
import { promises as fs } from 'fs'

export class SprocketsResolver {
    private processingFiles: Set<string>;
    private logger: Logger;
    private options: ResolvedOptions;
    private fileManager: FileManager;

    constructor(options: ResolvedOptions, logger: Logger, fileManager: FileManager) {
        this.options = options;
        this.logger = logger;
        this.fileManager = fileManager;
        this.processingFiles = new Set();
    }

    async resolveRequires(content: string, filePath: string): Promise<ResolvedContent> {
        this.logger.debug(`Resolving requires for file: ${filePath}`);
        const currentDir = path.dirname(filePath);
        this.logger.debug(`Current directory: ${currentDir}`);

        // Check for circular dependencies
        if (this.processingFiles.has(filePath)) {
            throw new CircularDependencyError(filePath);
        }

        // Add current file to processing set
        this.processingFiles.add(filePath);

        try {
            let resolvedContent = content;
            const dependencies: string[] = [];

            // Handle require directives
            const requireMatches = content.match(/\/\/\s*=\s*require\s+['"]([^'"]+)['"]/g);
            if (requireMatches) {
                for (const match of requireMatches) {
                    const directiveMatch = match.match(/['"]([^'"]+)['"]/);
                    if (!directiveMatch) continue;

                    const directivePath = directiveMatch[1];
                    const resolvedPath = await this.resolveImportPath(directivePath, currentDir, filePath);

                    if (resolvedPath) {
                        const fileContent = await this.fileManager.readFile(resolvedPath);
                        // Recursively resolve requires in the imported content
                        const resolved = await this.resolveRequires(fileContent, resolvedPath);
                        resolvedContent = resolvedContent.replace(match, resolved.content);
                        dependencies.push(resolvedPath);
                        dependencies.push(...resolved.dependencies);
                    }
                }
            }

            // Handle require_tree directives
            const treeMatches = content.match(/\/\/\s*=\s*require_tree\s+['"]([^'"]+)['"]/g);
            if (treeMatches) {
                for (const match of treeMatches) {
                    const treeMatch = match.match(/['"]([^'"]+)['"]/);
                    if (!treeMatch) continue;

                    const treePath = treeMatch[1];
                    const { content: treeContent, dependencies: treeDeps } = await this.resolveTree(
                        treePath,
                        currentDir
                    );
                    resolvedContent = resolvedContent.replace(match, treeContent);
                    dependencies.push(...treeDeps);
                }
            }

            return {
                content: resolvedContent,
                dependencies: [...new Set(dependencies)]
            };
        } finally {
            // Remove current file from processing set when done
            this.processingFiles.delete(filePath);
        }
    }

   public async resolveImportPath(
       importPath: string,
       currentDir: string,
       parentFile: string
   ): Promise<string | null> {
       this.logger.debug(`Resolving: ${importPath} from ${currentDir}`)

       // First resolve any aliases in the import path
       const aliasedPath = this.resolveAliasPath(importPath)
       this.logger.debug(`Alias resolved path: ${aliasedPath}`)

       // Try to find the file using the aliased path
       const resolvedPath = this.findFileInPaths(aliasedPath, currentDir)
       if (!resolvedPath) {
           throw new FileNotFoundError(importPath)
       }

       // Check for circular dependencies
       if (this.processingFiles.has(resolvedPath)) {
           throw new CircularDependencyError(resolvedPath)
       }

       return resolvedPath
   }

   private async resolveTree(treePath: string, currentDir: string): Promise<ResolvedContent> {
       this.logger.debug(`Resolving tree: ${treePath} from currentDir: ${currentDir}`)

       // Remove any leading ./ from the treePath
       const normalizedPath = treePath.replace(/^\.\//, '')

       // Resolve the full directory path relative to currentDir
       const fullPath = path.resolve(currentDir, normalizedPath)
       this.logger.debug(`Resolved full path: ${fullPath}`)

       try {
           const stats = await fs.stat(fullPath)
           if (!stats.isDirectory()) {
               this.logger.debug(`Path exists but is not a directory: ${fullPath}`)
               return { content: '', dependencies: [] }
           }

           this.logger.debug(`Found directory: ${fullPath}`)

           // Read directory contents
           const files = await fs.readdir(fullPath)
           this.logger.debug(`Directory contents: ${files.join(', ')}`)

           // Filter and process files
           const scssFiles = files
               .filter(file => file.endsWith('.scss'))
               .sort() // Ensure consistent ordering

           this.logger.debug(`SCSS files found: ${scssFiles.join(', ')}`)

           // Process each file in the directory
           const results = await Promise.all(
               scssFiles.map(async file => {
                   const filePath = path.join(fullPath, file)
                   const content = await fs.readFile(filePath, 'utf-8')
                   const resolved = await this.resolveRequires(content, filePath);
                   return {
                       content: resolved.content,
                       filePath,
                       dependencies: resolved.dependencies
                   }
               })
           )

           // Combine all file contents with boundaries
           const combinedContent = results.map(result => `
/* FILE_BOUNDARY: ${result.filePath} - START */
${result.content}
/* FILE_BOUNDARY: ${result.filePath} - END */
`).join('\n')

           return {
               content: combinedContent,
               dependencies: results.flatMap(r => [r.filePath, ...r.dependencies])
           }
       } catch (error) {
           this.logger.debug(`Error accessing directory: ${fullPath}`, error)
           return { content: '', dependencies: [] }
       }
   }

   private async processFile(
       filePath: string,
       depth: number = 0
   ): Promise<ResolvedContent> {
       if (this.processingFiles.has(filePath)) {
           throw new CircularDependencyError(filePath)
       }

       this.processingFiles.add(filePath)
       const content = await this.fileManager.readFile(filePath)
       const resolvedContent = await this.resolveRequires(content, filePath)

       const boundary = createBoundaryMarker(filePath)
       this.processingFiles.delete(filePath)

       return {
           content: boundary.start + resolvedContent.content + boundary.end,
           dependencies: [filePath, ...resolvedContent.dependencies],
       }
   }

   private resolveAliasPath(importPath: string): string {
       for (const [alias, aliasPath] of Object.entries(this.options.aliases)) {
           if (importPath.startsWith(alias)) {
               const resolved = importPath.replace(alias, aliasPath)
               this.logger.debug(`Alias resolved: ${importPath} -> ${resolved}`)
               return resolved
           }
       }
       return importPath
   }

   private resolveMappedPath(importPath: string): string | null {
       this.logger.debug(`Checking file mapping for: ${importPath}`)
       this.logger.debug(`Available mappings: ${JSON.stringify(this.options.fileMapping)}`)

       for (const [pattern, mappedPath] of Object.entries(this.options.fileMapping)) {
           this.logger.debug(`Checking pattern: ${pattern} against ${importPath}`)
           if (matchWildcard(pattern, importPath)) {
               const fullPath = path.join(this.options.root, mappedPath)
               this.logger.debug(`Trying exact mapped path: ${fullPath}`)

               if (existsSync(fullPath)) {
                   this.logger.debug(`Found mapped file: ${fullPath}`)
                   return fullPath
               }

               const scssPath = path.join(
                   this.options.root,
                   path.dirname(mappedPath),
                   path.basename(mappedPath, path.extname(mappedPath)) + '.scss'
               )
               this.logger.debug(`Trying SCSS fallback: ${scssPath}`)

               if (existsSync(scssPath)) {
                   this.logger.debug(`Found SCSS fallback: ${scssPath}`)
                   return scssPath
               }

               for (const includePath of this.options.includePaths) {
                   const includeScssPath = path.join(
                       includePath,
                       path.dirname(mappedPath),
                       path.basename(mappedPath, path.extname(mappedPath)) + '.scss'
                   )

                   if (existsSync(includeScssPath)) {
                       this.logger.debug(
                           `Mapped path resolved (includePath SCSS): ${importPath} -> ${includeScssPath}`
                       )
                       return includeScssPath
                   }
               }
           }
       }
       return null
   }

   findFileInPaths(
       importPath: string,
       currentDir: string
   ): string | null {
       this.logger.debug(`Finding file: ${importPath} in ${currentDir}`)

       const mappedPath = this.resolveMappedPath(importPath)
       if (mappedPath) {
           const fullPath = path.isAbsolute(mappedPath) ? mappedPath : path.join(this.options.root, mappedPath)
           if (existsSync(fullPath)) {
               this.logger.debug(`Found mapped file: ${fullPath}`)
               return fullPath
           }
       }

       const searchPaths = [
           currentDir,
           ...this.options.includePaths,
           ...(this.options.fallbackDirs || []).map(dir =>
               path.isAbsolute(dir) ? dir : path.join(this.options.root, dir)
           )
       ]
       const extensions = importPath.includes('.') ? [''] : SUPPORTED_EXTENSIONS

       for (const searchPath of searchPaths) {
           for (const ext of extensions) {
               const fullPath = path.resolve(searchPath, importPath + ext)
               if (existsSync(fullPath)) {
                   this.logger.debug(`Found file: ${fullPath}`)
                   return fullPath
               }

               const partialDir = path.dirname(importPath)
               const partialBase = path.basename(importPath)
               const partialPath = path.resolve(
                   searchPath,
                   partialDir,
                   `_${partialBase}${ext}`
               )
               if (existsSync(partialPath)) {
                   this.logger.debug(`Found partial file: ${partialPath}`)
                   return partialPath
               }
           }
       }

       this.logger.debug(`File not found: ${importPath}`)
       return null
   }

   getMappedFiles(): string[] {
       return Object.values(this.options.fileMapping)
   }

   clearCache(): void {
       this.processingFiles.clear();
       this.logger.debug('Cleared resolver cache')
   }
}

export type { SprocketsResolver as Resolver }


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/index.ts

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
import { CompilationError } from './utils/errors'

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
                if (error instanceof CompilationError) {
                    logger.error(error.formatError())
                } else {
                    logger.error('Build process failed: ' + (error as Error).message)
                }
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

                    if (result.errors?.length) {
                        const errors = result.errors
                            .map(error => error instanceof CompilationError ?
                                error.formatError() :
                                String(error)
                            )
                            .join('\n')

                        logger.error(`Failed to compile ${file}:\n${errors}`)
                        continue
                    }

                    await fileManager.writeProcessedFile({
                        path: file,
                        content: result.css,
                        dependencies: result.dependencies,
                    })
                }
            } catch (error: unknown) {
                if (error instanceof CompilationError) {
                    logger.error(error.formatError())
                } else {
                    logger.error(`Error processing ${file}: ${(error as Error).message}`)
                }
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

                if (result.errors?.length) {
                    const errors = result.errors
                        .map(error => error instanceof CompilationError ?
                            error.formatError() :
                            String(error)
                        )
                        .join('\n')

                    logger.error(`Failed to compile group ${groupName}:\n${errors}`)
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
            } catch (error: unknown) {
                if (error instanceof CompilationError) {
                    logger.error(error.formatError())
                } else {
                    logger.error(`Error processing group ${groupName}: ${(error as Error).message}`)
                }
                logger.groupEnd()
            }
        }
        logger.groupEnd()
    }
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/types/index.ts

/**
 * @file: .vite/plugins/sprockets-scss/types.ts
 * @description: Type definitions for the Sprockets SCSS plugin
 */

import type { Options as SassOptions } from 'sass';

export type Syntax = 'scss' | 'indented' | 'css';

export interface SprocketsPluginOptions {
    root?: string
    includePaths?: string[]
    fallbackDirs?: string[]
    entryGroups?: Record<string, string[]>
    outputPath?: string
    fileMapping?: Record<string, string>
    aliases?: Record<string, string>
    debug?: boolean
    ignorePartials?: boolean
    sourceMap?: boolean
    cache?: boolean
    cacheDirectory?: string
    globalMixins?: string[]
    preserveIntermediateScss?: boolean
    intermediateOutputPath?: string
}

export interface ResolvedOptions extends Required<SprocketsPluginOptions> {}

export interface FileMapping {
    pattern: string
    path: string
}

export interface ProcessedFile {
    path: string
    content: string
    dependencies: string[]
    sourceMap?: string
    intermediateScss?: string
}

export interface CompilationResult {
    css: string
    map?: string
    dependencies: string[]
    errors?: string[]
    stats?: CompilationStats
    duration?: number
    intermediateScss?: string
}

export interface BoundaryMarker {
    start: string
    end: string
    path: string
}

export interface DirectiveMatch {
    fullMatch: string
    directive: 'require' | 'require_tree'
    path: string
    resolved?: string
}

export interface ResolvedContent {
    content: string
    dependencies: string[]
    sourceMap?: string
    errors?: string[]
    intermediateScss?: string
}

export interface BuildContext {
    root: string
    outDir: string
    command: 'build' | 'serve'
    mode: 'development' | 'production'
    processingFiles?: Set<string>
}

export interface CompilationStats {
    cacheSize: number
    duration: number
    filesProcessed?: number
    totalFiles?: number
    startTime?: number
    endTime?: number
    circularDeps?: string[]
}

export interface SassCompilerOptions extends SassOptions<'sync'> {
    syntax?: Syntax
    sourceMap?: boolean
    sourceMapIncludeSources?: boolean
    processingFiles?: Set<string>
}

export interface SourceMapOptions {
    enabled: boolean
    inline?: boolean
    includeSources?: boolean
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/types/vite-env.d.ts

/**
 * @file: .vite/plugins/sprockets-scss/vite-env.d.ts
 * @description: Vite environment type declarations
 */

/// <reference types="vite/client" />

declare module 'virtual:sprockets-scss/*' {
    const content: string
    export default content
}

declare module 'vite' {
    import type { Plugin, UserConfig } from 'vite'

    export { Plugin, UserConfig }

    export interface ResolvedConfig extends UserConfig {
        sprocketsScss?: import('./types').SprocketsPluginOptions
    }
}

declare module '*.scss' {
    const content: string
    export default content
}

declare module '*.sass' {
    const content: string
    export default content
}

declare module '*.css' {
    const content: string
    export default content
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/utils/errors.ts

import path from 'node:path'

// Define error codes enum
export enum ErrorCode {
    CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    COMPILATION_ERROR = 'COMPILATION_ERROR',
    INVALID_CONFIG = 'INVALID_CONFIG',
    PARSE_ERROR = 'PARSE_ERROR'
}

export interface SourceLocation {
    line: number;
    column: number;
    file?: string;
    content?: string;
}

export class SprocketsError extends Error {
    constructor(
        message: string,
        public readonly code: ErrorCode,
        public readonly details?: Record<string, unknown>
    ) {
        super(message)
        this.name = 'SprocketsError'
    }
}

export class CompilationError extends SprocketsError {
    constructor(
        message: string,
        public readonly location: SourceLocation,
        public readonly sourceFile: string,
    ) {
        super(
            message,
            ErrorCode.COMPILATION_ERROR,
            { location, sourceFile }
        );
        this.name = 'CompilationError';
    }

    formatError(): string {
        const location = this.location;
        const fileName = path.relative(process.cwd(), this.sourceFile);

        return [
            '',
            `Error in ${fileName}:${location.line}:${location.column}`,
            `${this.message}`,
            location.content ? [
                '▼ Source:',
                location.content,
            ].join('\n') : '',
            ''
        ].join('\n');
    }
}

export class CircularDependencyError extends SprocketsError {
    constructor(path: string) {
        super(
            `Circular dependency detected: ${path}`,
            ErrorCode.CIRCULAR_DEPENDENCY,
            { path }
        )
    }
}

export class FileNotFoundError extends SprocketsError {
    constructor(path: string) {
        super(
            `File not found: ${path}`,
            ErrorCode.FILE_NOT_FOUND,
            { path }
        )
    }
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/utils/glob-utils.ts

/**
 * @file: .vite/plugins/sprockets-scss/utils/glob-utils.ts
 * @description: Glob pattern matching and file discovery utilities
 */

import fastGlob from 'fast-glob'
import { DEFAULT_GLOB_OPTIONS } from '../config/defaults'
import path from 'path'

interface GlobOptions {
    cwd?: string
    ignore?: string[]
    absolute?: boolean
    onlyFiles?: boolean
    followSymbolicLinks?: boolean
}

export async function findFiles(
    patterns: string | string[],
    options: GlobOptions = {}
): Promise<string[]> {
    const globOptions = {
        ...DEFAULT_GLOB_OPTIONS,
        ...options,
    }

    try {
        const files = await fastGlob(patterns, globOptions)

        // Ensure consistent order across different platforms
        return files.sort((a, b) => {
            const normA = path.normalize(a)
            const normB = path.normalize(b)
            return normA.localeCompare(normB)
        })
    } catch (error) {
        console.error('Error finding files:', error)
        return []
    }
}

export function createIgnorePatterns(patterns: string[]): string[] {
    return patterns.map((pattern) =>
        pattern.startsWith('!') ? pattern : `!${pattern}`
    )
}

export function matchGlobPattern(pattern: string, filePath: string): boolean {
    const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]')

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(filePath)
}

export function normalizeGlobPatterns(patterns: string | string[]): string[] {
    const normalizedPatterns = Array.isArray(patterns) ? patterns : [patterns]
    return normalizedPatterns.map((pattern) =>
        path.normalize(pattern).replace(/\\/g, '/')
    )
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/utils/index.ts

/**
 * @file: .vite/plugins/sprockets-scss/utils/index.ts
 * @description: Consolidated exports for utility functions
 */

export * from './logger'
export * from './errors'
export * from './glob-utils'
export * from './path-utils'


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/utils/logger.ts

/**
 * @file: .vite/plugins/sprockets-scss/utils/logger.ts
 * @description: Logging and debugging utilities
 */

import { CompilationError } from "~/utils/errors.ts";

export class Logger {
    private isDebug: boolean
    private prefix: string = '[Sprockets-SCSS]'
    private depth: number = 0

    constructor(debug: boolean = false) {
        this.isDebug = debug
    }

    setDepth(depth: number): void {
        this.depth = depth
    }

    private getIndent(): string {
        return '  '.repeat(this.depth)
    }

    info(message: string, ...args: any[]): void {
        console.log(`${this.prefix} ${this.getIndent()}${message}`, ...args)
    }

    error(message: string | Error): void {
        if (message instanceof CompilationError) {
            console.error(message.formatError())
            return
        }

        console.error(
            `${this.prefix} Error: ${typeof message === 'string' ? message : message.message}`
        )

        if (message instanceof Error && this.isDebug) {
            console.error(message.stack)
        }
    }

    warn(message: string, ...args: any[]): void {
        console.warn(
            `${this.prefix} Warning: ${this.getIndent()}${message}`,
            ...args
        )
    }

    debug(message: string, ...args: any[]): void {
        if (this.isDebug) {
            console.debug(
                `${this.prefix} Debug: ${this.getIndent()}${message}`,
                ...args
            )
        }
    }

    trace(message: string, ...args: any[]): void {
        if (this.isDebug) {
            console.log(
                `${this.prefix} Trace: ${this.getIndent()}${message}`,
                ...args
            )
        }
    }

    group(label: string): void {
        if (this.isDebug) {
            console.group(`${this.prefix} ${label}`)
            this.depth++
        }
    }

    groupEnd(): void {
        if (this.isDebug) {
            console.groupEnd()
            this.depth = Math.max(0, this.depth - 1)
        }
    }
}

export const createLogger = (debug: boolean = false): Logger => {
    return new Logger(debug)
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/utils/path-utils.ts

/**
 * @file: .vite/plugins/sprockets-scss/utils/path-utils.ts
 * @description: Path manipulation and normalization utilities
 */

import path from 'path'
import { BoundaryMarker } from '../types'

export function normalizePath(filepath: string): string {
    return filepath.replace(/\\/g, '/')
}

export function createBoundaryMarker(filePath: string): BoundaryMarker {
    const normalizedPath = normalizePath(filePath)
    return {
        start: `\n/* FILE_BOUNDARY: ${normalizedPath} - START */\n`,
        end: `\n/* FILE_BOUNDARY: ${normalizedPath} - END */\n`,
        path: normalizedPath,
    }
}

export function matchWildcard(pattern: string, str: string): boolean {
    // Normalize paths
    pattern = normalizePath(pattern)
    str = normalizePath(str)

    // Escape special regex chars except * and ?
    const regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        // Handle ** (match any number of path segments)
        .replace(/\*\*/g, '@@GLOBSTAR@@')
        // Handle * (match anything within a path segment)
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]')
        // Replace globstar placeholder
        .replace(/@@GLOBSTAR@@/g, '.*')

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(str)
}

export function isAbsoluteOrRelativePath(path: string): boolean {
    return (
        path.startsWith('/') || path.startsWith('./') || path.startsWith('../')
    )
}

export function resolveRelativePath(from: string, to: string): string {
    const normalizedFrom = normalizePath(from)
    const normalizedTo = normalizePath(to)
    return path.relative(path.dirname(normalizedFrom), normalizedTo)
}

export function getExtension(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    return ext
}

export function removeExtension(filePath: string): string {
    return filePath.replace(/\.[^/.]+$/, '')
}

export function joinPaths(...paths: string[]): string {
    return normalizePath(path.join(...paths))
}

export function isPartialPath(filePath: string): boolean {
    return path.basename(filePath).startsWith('_')
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/src/utils/performance.ts

export class PerformanceMonitor {
    private startTime: number = 0;
    private marks: Map<string, number> = new Map();

    start(): void {
        this.startTime = performance.now();
    }

    mark(label: string): void {
        this.marks.set(label, performance.now());
    }

    getDuration(label?: string): number {
        if (label) {
            const mark = this.marks.get(label);
            return mark ? mark - this.startTime : 0;
        }
        return performance.now() - this.startTime;
    }

    getMarks(): Map<string, number> {
        return new Map(this.marks);
    }

    reset(): void {
        this.startTime = 0;
        this.marks.clear();
    }
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/core/compiler.test.ts

import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { describe, it } from "bdd";
import { ScssCompiler } from "~/core/compiler.ts";
import { createTestContext } from "~/test/helpers/context.ts";
import * as path from "@std/path";
import { EXAMPLE_APP_DIRS } from "~/test/setup.ts";

describe('SCSS Compiler', () => {
    const { options, logger } = createTestContext({
        globalMixins: ['variables']
    });

    const compiler = new ScssCompiler(options, logger);

    it('processes basic SCSS file', async () => {
        const basicPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss');
        const basic = await Deno.readTextFile(basicPath);
        const result = await compiler.compile(basic, 'basic.scss');

        assertEquals(result.errors.length, 0);
        assertStringIncludes(result.css, '.test-component');
        assertStringIncludes(result.css, 'background:');
    });

    it('compiles SCSS with source maps', async () => {
        const basicPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss');
        const basic = await Deno.readTextFile(basicPath);
        const result = await compiler.compile(basic, 'basic.scss');

        assertExists(result.map);
        assertEquals(JSON.parse(result.map!).version, 3);
    });

    describe('Global Mixins', () => {
        it('loads and includes global mixins', async () => {
            const { compiler } = createTestContext({
                globalMixins: ['variables']
            });

            const testScss = '.test { color: $brand-primary; }';
            const result = await compiler.compile(testScss, 'test.scss');

            assertStringIncludes(result.css, '#ff7700'); // $brand-primary value
            assertEquals(result.errors.length, 0);
        });

        it('throws error for missing global mixin', async () => {
            const { compiler } = createTestContext({
                globalMixins: ['non-existent-file']
            });

            try {
                await compiler.compile('.test {}', 'test.scss');
                throw new Error('Should have thrown error');
            } catch (error: unknown) {
                if (error instanceof Error) {
                    assertStringIncludes(error.message, 'Global mixin file not found');
                } else {
                    throw new Error('Unexpected error type');
                }
            }
        });

        it('handles multiple global mixins in correct order', async () => {
            const { compiler } = createTestContext({
                globalMixins: ['variables', '_mixins']
            });

            const testScss = `.test {
                color: $brand-primary;
                @include center;
            }`;

            const result = await compiler.compile(testScss, 'test.scss');

            assertEquals(result.errors.length, 0);
            assertStringIncludes(result.css, '#ff7700');
            assertStringIncludes(result.css, 'display: flex');
        });
    });
});


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/core/file-manager.test.ts

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createTestContext } from "~/test/helpers/context.ts";

describe('File Manager', () => {
    const { fileManager } = createTestContext();

    it('handles partial files correctly', () => {
        assertEquals(fileManager.isPartial('_variables.scss'), true);
        assertEquals(fileManager.isPartial('main.scss'), false);
    });
});


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/core/resolver/aliases.test.ts

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as path from "@std/path";
import { createTestContext } from "../../helpers/context.ts";
import { EXAMPLE_APP_DIRS } from "../../setup.ts";

describe('Resolver - Aliases', () => {
    const { resolver } = createTestContext();

    it('handles aliases', async () => {
        // Create a test file at the expected location
        const testPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/component.scss');

        // Ensure directory exists
        await Deno.mkdir(path.dirname(testPath), { recursive: true });
        try {
            await Deno.stat(testPath);
        } catch {
            await Deno.writeTextFile(testPath, '.test { color: red; }');
        }

        try {
            const resolvedPath = await resolver.resolveImportPath(
                '~lib/component',
                EXAMPLE_APP_DIRS.ROOT,
                EXAMPLE_APP_DIRS.ROOT
            );
            if (!resolvedPath) {
                throw new Error(`Failed to resolve path: ${testPath}`);
            }

            assertExists(path.normalize(resolvedPath).includes('app/assets/stylesheets/lib/component'));
        } finally {
            // done
        }
    });

    it('resolves alias paths correctly', () => {
        const aliasPath = resolver['resolveAliasPath']('~lib/component');
        assertEquals(aliasPath, 'app/assets/stylesheets/lib/component');
    });
});


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/core/resolver/mapping.test.ts

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as path from "@std/path";
import { createTestContext } from "../../helpers/context.ts";
import { EXAMPLE_APP_DIRS } from '../../setup.ts';

describe('Resolver - File Mapping', () => {
    const { resolver, logger, options } = createTestContext();

    it('handles file mapping with includePaths fallback', async () => {
        // Create vendor file
        const vendorPath = path.join(EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS, 'lib/select2.scss');
        await Deno.mkdir(path.dirname(vendorPath), { recursive: true });

        try {
            await Deno.stat(vendorPath);
        } catch {
            await Deno.writeTextFile(vendorPath, '.select2-vendor { display: block; }');
        }

        // Ensure app paths don't exist
        const appCssPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.css');
        const appScssPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.scss');

        try {
            // Debug current state
            logger.debug('Test setup:');
            logger.debug(`Vendor file: ${vendorPath}`);
            logger.debug(`App CSS file (should not exist): ${appCssPath}`);
            logger.debug(`App SCSS file (should not exist): ${appScssPath}`);
            logger.debug('Include paths:', options.includePaths);
            logger.debug('File mappings:', options.fileMapping);

            const resolvedPath = resolver.findFileInPaths('select2', EXAMPLE_APP_DIRS.ROOT);
            logger.debug(`Resolved path: ${resolvedPath}`);

            assertExists(resolvedPath);
            assertEquals(resolvedPath?.includes('vendor/assets/stylesheets/lib/select2.scss'), true);

            // Verify content if resolved
            if (resolvedPath) {
                const content = await Deno.readTextFile(resolvedPath);
                assertEquals(content, '.select2-vendor { display: block; }');
            }
        } finally {
            // Cleanup handled by test framework
        }
    });
});


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/core/resolver/requires.test.ts

import { assertEquals, assertStringIncludes, assert } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as path from "@std/path";
import { createTestContext } from "~/test/helpers/context.ts";
import { EXAMPLE_APP_DIRS } from "~/test/setup.ts";

describe('Resolver - Require Directives', () => {
    const { resolver } = createTestContext();

    it('processes require directives', async () => {
        const withRequires = await Deno.readTextFile(
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );

        const resolvedContent = await resolver.resolveRequires(
            withRequires,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );

        const normalizedDeps = resolvedContent.dependencies.map((dep: string) => path.basename(dep));

        assertEquals(resolvedContent.content, '$primary-color');
        assertEquals(resolvedContent.content, '@mixin center');
        assertEquals(normalizedDeps, ['_variables.scss', '_mixins.scss']);
    });

    it('respects file ordering', async () => {
        const testFile = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss');
        const withRequires = `
            // = require '_variables'
            // = require '_mixins'
            // = require_tree './components'

            .main {
                @include center;
                background: $primary-color;
            }
        `;

        const resolvedContent = await resolver.resolveRequires(withRequires, testFile);
        const content = resolvedContent.content;

        const variablesIndex = content.indexOf('$primary-color');
        const mainIndex = content.indexOf('.main');

        assert(variablesIndex < mainIndex);
    });
});


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/core/resolver/tree.test.ts

import { describe, expect, test } from "bun:test";
import path from "path";
import { createTestContext } from "../../helpers/context";
import { EXAMPLE_APP_DIRS } from '../../setup';

describe('Resolver - Require Tree', () => {
    const { resolver, logger } = createTestContext();

    test('handles require_tree directive', async () => {
        const testFile = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-require-tree.scss');
        logger.debug(`Test file path: ${testFile}`);

        const withRequireTree = `
            // = require '_variables'
            // = require '_mixins'
            // = require_tree 'components'

            .main {
                @include center;
                background: $primary-color;
            }
        `;

        const resolvedContent = await resolver.resolveRequires(withRequireTree, testFile);
        expect(resolvedContent.content).toContain('.header');
        expect(resolvedContent.content).toContain('.footer');
    });
});


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/error-handling/circular-deps.test.ts

// Updated resolveRequires method in SprocketsResolver class

import * as path from "https://deno.land/std/path/mod.ts";
import { CircularDependencyError } from "../utils/errors.ts";
import { Logger } from "../utils/logger.ts";
import { FileManager } from "./file-manager.ts";
import { ResolvedContent } from "../types.ts";

export class SprocketsResolver {
    private processingFiles: Set<string> = new Set();
    private logger: Logger;
    private fileManager: FileManager;

    constructor(options: any, logger: Logger, fileManager: FileManager) {
        this.logger = logger;
        this.fileManager = fileManager;
    }

    async resolveRequires(content: string, filePath: string): Promise<ResolvedContent> {
        this.logger.debug(`Resolving requires for file: ${filePath}`)
        const currentDir = path.dirname(filePath)
        this.logger.debug(`Current directory: ${currentDir}`)

        // Check for circular dependencies
        if (this.processingFiles.has(filePath)) {
            throw new CircularDependencyError(filePath);
        }

        // Add current file to processing set
        this.processingFiles.add(filePath);

        try {
            let resolvedContent = content
            const dependencies: string[] = []

            // Handle require directives
            const requireMatches = content.match(/\/\/\s*=\s*require\s+['"]([^'"]+)['"]/g)
            if (requireMatches) {
                for (const match of requireMatches) {
                    const directiveMatch = match.match(/['"]([^'"]+)['"]/)
                    if (!directiveMatch) continue

                    const directivePath = directiveMatch[1]
                    const resolvedPath = await this.resolveImportPath(directivePath, currentDir, filePath)

                    if (resolvedPath) {
                        const fileContent = await this.fileManager.readFile(resolvedPath)
                        // Recursively resolve requires in the imported content
                        const resolved = await this.resolveRequires(fileContent, resolvedPath)
                        resolvedContent = resolvedContent.replace(match, resolved.content)
                        dependencies.push(resolvedPath)
                        dependencies.push(...resolved.dependencies)
                    }
                }
            }

            // Handle require_tree directives
            const treeMatches = content.match(/\/\/\s*=\s*require_tree\s+['"]([^'"]+)['"]/g)
            if (treeMatches) {
                for (const match of treeMatches) {
                    const treeMatch = match.match(/['"]([^'"]+)['"]/)
                    if (!treeMatch) continue

                    const treePath = treeMatch[1]
                    const { content: treeContent, dependencies: treeDeps } = await this.resolveTree(
                        treePath,
                        currentDir
                    )
                    resolvedContent = resolvedContent.replace(match, treeContent)
                    dependencies.push(...treeDeps)
                }
            }

            return {
                content: resolvedContent,
                dependencies: [...new Set(dependencies)]
            }
        } finally {
            // Remove current file from processing set when done
            this.processingFiles.delete(filePath)
        }
    }
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/error-handling/missing-files.test.ts

import { assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { FileNotFoundError } from "../../src/utils/errors.ts";
import { createTestContext } from "../helpers/context.ts";

describe('Error Handling - Missing Files', () => {
    const { resolver } = createTestContext();

    it('handles missing files gracefully', async () => {
        const missing = `//= require 'non-existent-file'`;
        await assertThrows(
            async () => {
                await resolver.resolveRequires(missing, 'test.scss');
            },
            FileNotFoundError
        );
    });
});


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/helpers/context.ts

import * as path from "@std/path";
import { FileManager } from "~/core/file-manager.ts";
import { ScssCompiler } from "~/core/compiler.ts";
import { SprocketsResolver } from "~/core/resolver.ts";
import { createLogger } from "~/utils/logger.ts";
import { resolveOptions } from "~/config/options.ts";
import type { TestContext } from "~/test/types/index.ts";
import { TEST_DIRS, EXAMPLE_APP_DIRS } from "~/test/setup.ts";

export function createTestContext({
    globalMixins = [],
    debug = true
}: {
    globalMixins?: string[],
    debug?: boolean
}): TestContext {
    const options = resolveOptions({
        root: EXAMPLE_APP_DIRS.ROOT,
        debug: debug,
        includePaths: [
            EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS,
            EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS,
            path.join(EXAMPLE_APP_DIRS.NODE_MODULES, 'bootstrap/scss'),
            ...(globalMixins || [])
        ],
        entryGroups: {
            application: ['application.scss'],
            admin: ['admin/**/*.scss'],
            components: ['components/**/*.scss']
        },
        fileMapping: {
            'select2': 'lib/select2.css',
            'jquery-ui/*': path.join('vendor/jquery-ui/themes/base/*.css'),
            'bootstrap/**': path.join('node_modules/bootstrap/scss/**/*.scss')
        },
        aliases: {
            '~lib': 'app/assets/stylesheets/lib',
            '~vendor': 'vendor/assets/stylesheets',
            '~components': 'app/assets/stylesheets/components'
        },
        outputPath: path.join(TEST_DIRS.OUTPUT, 'assets')
    })

    const logger = createLogger(true)
    const fileManager = new FileManager(options, logger)
    const compiler = new ScssCompiler(options, logger)
    const resolver = new SprocketsResolver(options, logger, fileManager)

    return {
        options,
        logger,
        fileManager,
        compiler,
        resolver
    }
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/helpers/files.ts

import { join, dirname } from "https://deno.land/std/path/mod.ts";
import { TEST_DIRS } from '../setup.ts';

export async function readFixture(fileName: string): Promise<string> {
    try {
        const filePath = join(TEST_DIRS.FIXTURES, fileName);
        return await Deno.readTextFile(filePath);
    } catch (error) {
        throw new Error(
            `Failed to read fixture file ${fileName}: ${error.message}`
        );
    }
}

export async function writeFixture(
    fileName: string,
    content: string
): Promise<void> {
    try {
        const filePath = join(TEST_DIRS.FIXTURES, fileName);
        await Deno.mkdir(dirname(filePath), { recursive: true });
        try {
            await Deno.stat(filePath);
        } catch {
            await Deno.writeTextFile(filePath, content);
        }
    } catch (error) {
        throw new Error(
            `Failed to write fixture file ${fileName}: ${error.message}`
        );
    }
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/helpers/index.ts

export * from './context'
export * from './files'
export { setupFixtures } from '../setup-fixtures'

---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/index.test.ts

import { describe, test, beforeAll, afterAll } from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';

const pluginRootDir = path.join(process.cwd())
// Test directories
export const TEST_DIRS = {
    FIXTURES: path.join(pluginRootDir, 'test', 'fixtures', 'scss'),
    OUTPUT: path.join(pluginRootDir, 'tmp', 'test-output'),
    CACHE: path.join(pluginRootDir, 'tmp', 'test-cache'),
    EXAMPLE_APP: path.join(pluginRootDir, 'tmp', 'example-app')
};

// Setup and cleanup
beforeAll(async () => {
    // Create test directories
    await fs.mkdir(TEST_DIRS.EXAMPLE_APP, { recursive: true });
    await fs.mkdir(path.join(TEST_DIRS.EXAMPLE_APP, 'components'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIRS.EXAMPLE_APP, 'lib'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIRS.EXAMPLE_APP, 'vendor/lib'), { recursive: true });
    await fs.mkdir(TEST_DIRS.OUTPUT, { recursive: true });
    await fs.mkdir(TEST_DIRS.CACHE, { recursive: true });

    // Create test files
    const files = {
        'basic.scss': '.test-component { background: #fff; padding: 20px; }',
        '_variables.scss': '$primary-color: #ff7700; $font-family-base: "myriad-pro", sans-serif;',
        '_mixins.scss': '@mixin center { display: flex; align-items: center; justify-content: center; }',
        'components/_header.scss': '.header { background: $primary-color; }',
        'components/_footer.scss': '.footer { color: $primary-color; }',
        'lib/select2.scss': '.select2 { display: inline-block; }',
        'lib/select2.css': '.select2 { display: inline-block; }',
        'vendor/lib/select2.scss': '.select2-vendor { display: block; }',
        'circular-a.scss': '// = require "circular-b"\n.circular-a { color: red; }',
        'circular-b.scss': '// = require "circular-a"\n.circular-b { color: blue; }',
        'with-requires.scss': `
            // = require '_variables'
            // = require '_mixins'
            // = require_tree './components'

            .main {
                @include center;
                background: $primary-color;
            }
        `
    };

    for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(TEST_DIRS.EXAMPLE_APP, filePath);    
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        // only write file if it doesn't exist
        if (!(await fs.access(fullPath).then(() => true).catch(() => false))) {
            await fs.writeFile(fullPath, content);
        }
    }
});

afterAll(async () => {
    await fs.rm(TEST_DIRS.OUTPUT, { recursive: true, force: true });
    await fs.rm(TEST_DIRS.CACHE, { recursive: true, force: true });
    // done
});

// Import all test files
import './core/compiler.test';
import './core/file-manager.test';
import './core/resolver/aliases.test';
import './core/resolver/mapping.test';
import './core/resolver/requires.test';
import './core/resolver/tree.test';
import './error-handling/circular-deps.test';
import './error-handling/missing-files.test';
import './plugin.test';
import './rails-paths.test';

---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/integration.test.ts

/**
 * @file: .vite/plugins/sprockets-scss/test/integration.test.ts
 */

import { assert, assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import viteSprocketsScss from "../mod.ts";
import * as path from "@std/path";
import { TEST_DIRS } from "./setup.ts";

describe('Plugin Integration', () => {
    it('processes complete stylesheet with real-world patterns', async () => {
        const plugin = viteSprocketsScss({
            root: TEST_DIRS.EXAMPLE_APP,
            includePaths: ['app/assets/stylesheets'],
            entryGroups: {
                application: ['application.scss'],
                admin: ['admin/**/*.scss'],
                judging: ['judging/**/*.scss']
            },
            fileMapping: {
                'select2': 'app/assets/stylesheets/lib/select2.css',
                'jquery-ui/*': 'vendor/jquery-ui/themes/base/*.css'
            },
            aliases: {
                '~vendor': 'vendor/assets/stylesheets',
                '~lib': 'app/assets/stylesheets/lib'
            },
            debug: true
        });

        // Configure plugin
        await plugin.configResolved.handler();

        // Test plugin hooks
        assertEquals(plugin.name, 'vite-plugin-sprockets-scss');
        assert(typeof plugin.buildStart.handler === 'function');
    });

    it('handles real-world SCSS patterns', async () => {
        const scss = `
            //= require jquery-ui/resizable
            //= require bootstrap_and_overrides
            //= require common

            .article-wrapper {
                color: #333;
                margin: 40px auto 0;
                position: relative;

                .article-title {
                    margin: 30px auto;

                    h1 {
                        color: #333;
                        font-family: 'myriad-pro', sans-serif;
                        font-size: 28px;
                        line-height: 36px;
                        margin-bottom: 15px;
                    }
                }
            }
        `;

        const plugin = viteSprocketsScss({
            root: TEST_DIRS.EXAMPLE_APP,
            debug: true
        });

        // Configure plugin before testing
        await plugin.configResolved.handler();

        // Now buildStart should work
        await plugin.buildStart.handler();
    });
});


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/main_test.ts

import { describe } from "@std/testing/bdd";

// Import all test files
import "./core/compiler.test.ts";
import "./core/file-manager.test.ts";
import "./core/resolver/aliases.test.ts";
import "./core/resolver/mapping.test.ts";
import "./core/resolver/requires.test.ts";
import "./core/resolver/tree.test.ts";
import "./error-handling/circular-deps.test.ts";
import "./error-handling/missing-files.test.ts";
import "./utils/glob-utils.test.ts";
import "./utils/logger.test.ts";
import "./utils/path-utils.test.ts";
import "./integration.test.ts";
import "./plugin.test.ts";
import "./rails-paths.test.ts";

describe("Sprockets SCSS Plugin Tests", () => {
  // Tests will be imported from the files above
}); 

---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/plugin.test.ts

/**
 * @file: .vite/plugins/sprockets-scss/test/plugin.test.ts
 * @description: Plugin test suite
 */

import { 
  assertEquals, 
  assertMatch, 
  assertExists,
  assert,
  assertRejects,
  assertNotEquals 
} from "@std/assert";
import { describe, it, beforeAll, afterEach } from "@std/testing/bdd";
import * as path from "@std/path";
import { createLogger } from "~/utils/logger.ts";
import { resolveOptions } from "~/config/options.ts";
import { FileManager } from "~/core/file-manager.ts";
import { ScssCompiler } from "~/core/compiler.ts";
import { SprocketsResolver } from "~/core/resolver.ts";
import type { ResolvedOptions } from "~/types/index.ts";
import { CircularDependencyError, FileNotFoundError } from "~/utils/errors.ts";
import { PerformanceMonitor } from "~/utils/performance.ts";
import { TEST_DIRS, EXAMPLE_APP_DIRS } from './setup.ts';

describe('Sprockets SCSS Plugin', () => {
    let logger: ReturnType<typeof createLogger>;
    let compiler: ScssCompiler;
    let resolver: SprocketsResolver;
    let fileManager: FileManager;
    let options: ResolvedOptions;
    let performance: PerformanceMonitor;

    async function ensureTestFiles() {
        // Define all required directories
        const requiredDirs = [
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib'),
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'components'),
            path.join(EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS, 'lib'),
        ];

        // Create all required directories
        for (const dir of requiredDirs) {
            await Deno.mkdir(dir, { recursive: true });
        }

        // Create test files in example app structure
        const files = [
            ['app/assets/stylesheets/basic.scss', '.test-component { background: #fff; padding: 20px; }'],
            ['app/assets/stylesheets/circular-a.scss', '// = require "circular-b"\n.circular-a { color: red; }'],
            ['app/assets/stylesheets/circular-b.scss', '// = require "circular-a"\n.circular-b { color: blue; }'],
            ['app/assets/stylesheets/lib/select2.css', '.select2 { color: blue; }'],
            ['app/assets/stylesheets/lib/select2.scss', '.select2-container { display: block; }'],
            ['vendor/assets/stylesheets/lib/select2.scss', '.select2-vendor { display: block; }'],
            ['app/assets/stylesheets/_variables.scss', '$primary-color: #ff7700; $font-family-base: "myriad-pro", sans-serif;'],
            ['app/assets/stylesheets/_mixins.scss', '@mixin center { display: flex; align-items: center; justify-content: center; }'],
            ['app/assets/stylesheets/components/_header.scss', `
                .header {
                    background: #fff;
                    border-bottom: 1px solid #e1e1e1;
                    height: 60px;
                    position: fixed;
                    top: 0;
                    width: 100%;
                    z-index: 100;
                }
            `],
            ['app/assets/stylesheets/with-requires.scss', `
                //= require '_variables'
                //= require '_mixins'
                //= require_tree './components'

                .main {
                    @include center;
                    background: $primary-color;
                    font-family: $font-family-base;
                }
            `],
        ];

        for (const [filePath, content] of files) {
            const fullPath = path.join(EXAMPLE_APP_DIRS.ROOT, filePath);
            await Deno.mkdir(path.dirname(fullPath), { recursive: true });
            try {
                await Deno.stat(fullPath);
            } catch {
                await Deno.writeTextFile(fullPath, content);
            }
        }

        logger?.debug(`Created test files: ${files.map(([f]) => f).join(', ')}`);
    }

    beforeAll(async () => {
        await ensureTestFiles();

        options = resolveOptions({
            root: EXAMPLE_APP_DIRS.ROOT,
            debug: true,
            includePaths: [
                EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS,
                EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS
            ],
            entryGroups: {
                application: ['application.scss'],
                admin: ['admin/**/*.scss']
            },
            fileMapping: {
                'select2': path.join('lib', 'select2.css'),
                'jquery-ui/*': path.join('vendor', 'jquery-ui', 'themes', 'base', '*.css')
            },
            aliases: {
                '~lib': 'app/assets/stylesheets/lib'
            },
            outputPath: path.join(TEST_DIRS.OUTPUT, 'assets')
        });

        logger = createLogger(true);
        fileManager = new FileManager(options, logger);
        compiler = new ScssCompiler(options, logger);
        resolver = new SprocketsResolver(options, logger, fileManager);
        performance = new PerformanceMonitor();

        logger.debug('Test setup complete');
    });

    afterEach(() => {
        resolver.clearCache();
        compiler.clearCache();
        fileManager.clearCache();
    });

    it('processes basic SCSS file', async () => {
        performance.start();
        const basic = await Deno.readTextFile(path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss'));
        const result = await compiler.compile(basic, 'basic.scss');

        assertEquals(result.errors.length, 0);
        assertMatch(result.css, /\.test-component/);
        assertMatch(result.css, /background:/);
        assert(performance.getDuration() < 5000);
    });

    it('processes require directives', async () => {
        const withRequires = await Deno.readTextFile(
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );

        const resolvedContent = await resolver.resolveRequires(
            withRequires,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );
        const normalizedDeps = resolvedContent.dependencies.map((d: string) => path.basename(d));

        assertMatch(resolvedContent.content, /\$primary-color/);
        assertMatch(resolvedContent.content, /@mixin center/);
        assertEquals(normalizedDeps.includes('_variables.scss'), true);
        assertEquals(normalizedDeps.includes('_mixins.scss'), true);
    });

    it('handles require_tree directive', async () => {
        const testFile = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss');
        const withRequireTree = `
                // = require '_variables'
                // = require '_mixins'
                // = require_tree 'components'

                .main {
                    @include center;
                    background: $primary-color;
                }
            `;

        const resolvedContent = await resolver.resolveRequires(withRequireTree, testFile)
        assertMatch(resolvedContent.content, /\.header/);
        assertMatch(resolvedContent.content, /\.footer/);
    });

    it('respects file ordering', async () => {
        const withRequires = await Deno.readTextFile(
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );

        const resolvedContent = await resolver.resolveRequires(
            withRequires,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );
        const content = resolvedContent.content;

        const variablesIndex = content.indexOf('$primary-color');
        const mainIndex = content.indexOf('.main');

        assert(variablesIndex < mainIndex);
    });

    it('handles file mapping with SCSS fallback', async () => {
        const libDir = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib');
        await Deno.mkdir(libDir, { recursive: true });

        try {
            await Deno.stat(path.join(libDir, 'select2.scss'));
        } catch {
            await Deno.writeTextFile(
                path.join(libDir, 'select2.scss'),
                '.select2-container { display: block; }'
            );
        }

        // First test with CSS file present
        const resolvedCssPath = resolver.findFileInPaths('select2', EXAMPLE_APP_DIRS.ROOT);
        assertNotEquals(resolvedCssPath, null);
        assertEquals(path.basename(resolvedCssPath!), 'select2.scss');

        // Test SCSS fallback
        const originalPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.css');
        const backupPath = originalPath + '.bak';

        try {
            await Deno.rename(originalPath, backupPath);

            const resolvedScssPath = resolver.findFileInPaths('select2', EXAMPLE_APP_DIRS.ROOT);
            assertNotEquals(resolvedScssPath, null);
            assertMatch(resolvedScssPath!, /select2\.scss$/);

            // Verify the content is loaded correctly
            if (resolvedScssPath) {
                const content = await fileManager.readFile(resolvedScssPath);
                assertMatch(content, /select2-container/);
            }
        } finally {
            try {
                await Deno.rename(backupPath, originalPath);
            } catch {
                // Ignore if backup didn't exist
            }
        }
    });

    it('handles file mapping with includePaths fallback', async () => {
        const vendorPath = path.join(EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS, 'lib/select2.scss');
        await Deno.mkdir(path.dirname(vendorPath), { recursive: true });
        try {
            await Deno.stat(vendorPath);
        } catch {
            await Deno.writeTextFile(vendorPath, '.select2-vendor { display: block; }');
        }

        const originalPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.css');
        const scssPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.scss');

        try {
            // Remove original files if they exist
            await Deno.remove(originalPath);
            await Deno.remove(scssPath);

            // Test resolution from include path
            const resolvedPath = resolver.findFileInPaths('select2', EXAMPLE_APP_DIRS.ROOT);
            assertNotEquals(resolvedPath, null);
            assertMatch(resolvedPath!, /vendor\/assets\/stylesheets\/lib\/select2\.scss$/);

            // Verify content
            if (resolvedPath) {
                const content = await fileManager.readFile(resolvedPath);
                assertMatch(content, /select2-vendor/);
            }
        } finally {
            try {
                await Deno.remove(vendorPath);
            } catch { /* ignore */ }
        }
    });

    it('handles aliases', async () => {
        const aliasPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/component.scss');
        await Deno.mkdir(path.dirname(aliasPath), { recursive: true });
        try {
            await Deno.stat(aliasPath);
        } catch {
            await Deno.writeTextFile(aliasPath, '.component { color: blue; }');
        }

        try {
            const resolvedPath = await resolver.resolveImportPath('~lib/component', EXAMPLE_APP_DIRS.ROOT, EXAMPLE_APP_DIRS.ROOT);
            if (!resolvedPath) {
                throw new Error('Failed to resolve import path');
            }

            assertNotEquals(resolvedPath, null);
            assertMatch(path.normalize(resolvedPath), /app\/assets\/stylesheets\/lib\/component/);
        } finally {
            // done
        }
    });

    it('handles partial files correctly', () => {
        assertEquals(fileManager.isPartial('_variables.scss'), true);
        assertEquals(fileManager.isPartial('main.scss'), false);
    });

    it('compiles SCSS with source maps', async () => {
        const basic = await Deno.readTextFile(path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss'));
        const result = await compiler.compile(basic, 'basic.scss');

        assertExists(result.map);
        assertEquals(JSON.parse(result.map!).version, 3);
    });

    it('handles circular dependencies', async () => {
        const circularAPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'circular-a.scss');
        const circularBPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'circular-b.scss');

        // Create test files with minimal whitespace
        try {
            await Deno.stat(circularAPath);
        } catch {
            await Deno.writeTextFile(circularAPath, '// = require "circular-b"\n.circular-a { color: red; }');
        }
        try {
            await Deno.stat(circularBPath);
        } catch {
            await Deno.writeTextFile(circularBPath, '// = require "circular-a"\n.circular-b { color: blue; }');
        }

        try {
            const content = await Deno.readTextFile(circularAPath);
            await assertRejects(
                async () => await resolver.resolveRequires(content, circularAPath),
                CircularDependencyError
            );
        } finally {
            // done
        }
    });

    it('handles missing files gracefully', async () => {
        const missing = `//= require 'non-existent-file'`;
        await assertRejects(
            async () => await resolver.resolveRequires(missing, 'test.scss'),
            FileNotFoundError
        );
    });
});


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/rails-paths.test.ts

import { describe, it, beforeAll } from "@std/testing/bdd";
import { assertEquals, assertExists, assertStringIncludes, assert } from "@std/assert";
import * as path from "@std/path";
import { createTestContext } from './helpers/context.ts';
import { EXAMPLE_APP_DIRS } from './setup.ts';

describe('Rails Path Resolution', () => {
    const { resolver } = createTestContext();

    beforeAll(async () => {
        // Create test files
        const files = {
            'app/assets/stylesheets/application.scss': `
                // = require '_variables'
                // = require '_shared'
                // = require_tree './components'
            `,
            'app/assets/stylesheets/_variables.scss': `
                $primary-color: #ff7700;
                $font-family-base: 'myriad-pro', sans-serif;
            `,
            'app/assets/stylesheets/_shared.scss': `
                @import '_variables';
                .app-shared { color: blue; }
            `,
            'vendor/assets/stylesheets/_shared.scss': '.vendor-shared { color: red; }',
            'app/assets/stylesheets/components/_header.scss': '.header { color: $primary-color; }'
        };

        for (const [filePath, content] of Object.entries(files)) {
            const fullPath = path.join(EXAMPLE_APP_DIRS.ROOT, filePath);
            await Deno.mkdir(path.dirname(fullPath), { recursive: true });
            try {
                await Deno.stat(fullPath);
            } catch {
                await Deno.writeTextFile(fullPath, content.trim());
            }
        }
    });

    it('resolves application.scss with all dependencies', async () => {
        const applicationScss = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'application.scss');
        const content = await Deno.readTextFile(applicationScss);

        const result = await resolver.resolveRequires(content, applicationScss);

        assertStringIncludes(result.content, 'primary-color');
        assertStringIncludes(result.content, 'header');
        assertExists(result.dependencies.length > 0);
    });

    it('prefers app/assets over vendor/assets', async () => {
        const content = `// = require '_shared'`;
        const result = await resolver.resolveRequires(
            content,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'test.scss')
        );

        assertStringIncludes(result.content, 'app-shared');
        assert(!result.content.includes('vendor-shared'));
    });
});


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/setup-fixtures.test.ts

// test/setup-fixtures.test.ts
import { describe, expect, test } from 'bun:test'
import { setupFixtures } from './setup-fixtures'
import { promises as fs } from 'fs'
import path from 'path'
import { TEST_DIRS } from './setup'

describe('Setup Fixtures', () => {
    test('creates all required directories', async () => {
        await setupFixtures()

        const dirs = [
            'app/assets/stylesheets/components',
            'vendor/assets/stylesheets',
            'node_modules/bootstrap/scss',
        ]

        for (const dir of dirs) {
            const fullPath = path.join(TEST_DIRS.FIXTURES, 'rails', dir)
            const exists = await fs
                .stat(fullPath)
                .then((stats) => stats.isDirectory())
                .catch(() => false)

            expect(exists).toBe(true)
        }
    })

    test('creates all required files with correct content', async () => {
        await setupFixtures()

        const files = [
            'app/assets/stylesheets/application.scss',
            'app/assets/stylesheets/_variables.scss',
            'app/assets/stylesheets/_shared.scss',
            'vendor/assets/stylesheets/_shared.scss',
            'app/assets/stylesheets/components/_header.scss',
        ]

        for (const file of files) {
            const fullPath = path.join(TEST_DIRS.FIXTURES, 'rails', file)
            const exists = await fs
                .stat(fullPath)
                .then((stats) => stats.isFile())
                .catch(() => false)

            expect(exists).toBe(true)
        }
    })

    test('cleanup works correctly', async () => {
        await setupFixtures()
        const railsRoot = path.join(TEST_DIRS.FIXTURES, 'rails')

        // Run setup again (should clean up first)
        await setupFixtures()

        const exists = await fs
            .stat(railsRoot)
            .then((stats) => stats.isDirectory())
            .catch(() => false)

        expect(exists).toBe(true)
    })
})


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/setup-fixtures.ts

import * as path from "https://deno.land/std/path/mod.ts";
import { TEST_DIRS } from './setup.ts';

export async function setupFixtures(): Promise<void> {
    const railsRoot = path.join(TEST_DIRS.FIXTURES, 'rails');

    // Clean up existing fixtures
    try {
        await Deno.remove(railsRoot, { recursive: true });
    } catch (error) {
        // Ignore if directory doesn't exist
    }

    // Create Rails-like directory structure
    const directories = [
        'app/assets/stylesheets/components',
        'vendor/assets/stylesheets',
        'node_modules/bootstrap/scss'
    ];

    for (const dir of directories) {
        await Deno.mkdir(path.join(railsRoot, dir), { recursive: true });
    }

    // Create test files
    const files = {
        'app/assets/stylesheets/application.scss': `
            // = require '_variables'
            // = require '_shared'
            // = require_tree './components'
        `,
        'app/assets/stylesheets/_variables.scss': `
            $primary-color: #ff7700;
            $font-family-base: 'myriad-pro', sans-serif;
        `,
        'app/assets/stylesheets/_shared.scss': `
            @import '_variables';
            .app-shared { color: blue; }
        `,
        'vendor/assets/stylesheets/_shared.scss': '.vendor-shared { color: red; }',
        'app/assets/stylesheets/components/_header.scss': '.header { color: $primary-color; }'
    };

    for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(railsRoot, filePath);
        await Deno.mkdir(path.dirname(fullPath), { recursive: true });
        try {
            await Deno.stat(fullPath);
        } catch {
            await Deno.writeTextFile(fullPath, content.trim() + '\n');
        }
    }
}


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/setup.ts

// .vite/plugins/sprockets-scss/test/setup.ts

import { describe, it, beforeAll, afterAll } from "@std/testing/bdd";
import * as path from "@std/path";

const pluginRootDir = path.join(Deno.cwd());

export const TEST_DIRS = {
    TMP: path.join(pluginRootDir, 'tmp'),
    FIXTURES: path.join(pluginRootDir, 'test', 'fixtures'),
    OUTPUT: path.join(pluginRootDir, 'tmp', 'test-output'),
    CACHE: path.join(pluginRootDir, 'tmp', 'test-cache'),
    EXAMPLE_APP: path.join(pluginRootDir, 'test', 'fixtures', 'rails'),
}

export const EXAMPLE_APP_DIRS = {
    ROOT: TEST_DIRS.EXAMPLE_APP,
    ASSETS: {
        ROOT: path.join(TEST_DIRS.EXAMPLE_APP, 'app/assets'),
        STYLESHEETS: path.join(TEST_DIRS.EXAMPLE_APP, 'app/assets/stylesheets'),
        COMPONENTS: path.join(
            TEST_DIRS.EXAMPLE_APP,
            'app/assets/stylesheets/components'
        ),
    },
    VENDOR: {
        ROOT: path.join(TEST_DIRS.EXAMPLE_APP, 'vendor'),
        ASSETS: path.join(TEST_DIRS.EXAMPLE_APP, 'vendor/assets'),
        STYLESHEETS: path.join(
            TEST_DIRS.EXAMPLE_APP,
            'vendor/assets/stylesheets'
        ),
    },
    PUBLIC: {
        ROOT: path.join(TEST_DIRS.EXAMPLE_APP, 'public'),
        ASSETS: path.join(TEST_DIRS.EXAMPLE_APP, 'public/assets'),
    },
    NODE_MODULES: path.join(TEST_DIRS.EXAMPLE_APP, 'node_modules'),
}

// Setup before all tests
beforeAll(async () => {
    // Create all necessary directories
    for (const dir of Object.values(EXAMPLE_APP_DIRS)) {
        if (typeof dir === 'string') {
            await Deno.mkdir(dir, { recursive: true })
        } else {
            for (const subdir of Object.values(dir)) {
                await Deno.mkdir(subdir, { recursive: true })
            }
        }
    }

    await Deno.mkdir(TEST_DIRS.OUTPUT, { recursive: true })
    await Deno.mkdir(TEST_DIRS.CACHE, { recursive: true })

    debugger
    // Create test files
    const files = {
        'app/assets/stylesheets/basic.scss':
            '.test-component { background: #fff; padding: 20px; }',
        'app/assets/stylesheets/_variables.scss':
            '$primary-color: #ff7700; $font-family-base: "myriad-pro", sans-serif;',
        'app/assets/stylesheets/_mixins.scss':
            '@mixin center { display: flex; align-items: center; justify-content: center; }',
        'app/assets/stylesheets/components/_header.scss':
            '.header { background: $primary-color; }',
        'app/assets/stylesheets/components/_footer.scss':
            '.footer { color: $primary-color; }',
        'app/assets/stylesheets/lib/select2.scss':
            '.select2 { display: inline-block; }',
        'app/assets/stylesheets/lib/select2.css':
            '.select2 { display: inline-block; }',
        'vendor/assets/stylesheets/lib/select2.scss':
            '.select2-vendor { display: block; }',
        'app/assets/stylesheets/with-requires.scss': `
            // = require '_variables'
            // = require '_mixins'
            // = require_tree './components'

            .main {
                @include center;
                background: $primary-color;
            }
        `,
    }

    for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(TEST_DIRS.EXAMPLE_APP, filePath)
        await Deno.mkdir(path.dirname(fullPath), { recursive: true })
        console.debug(`Writing file: ${fullPath}`)
        try {
            await Deno.stat(fullPath)
        } catch {
            await Deno.writeTextFile(fullPath, content)
        }
    }
})

// Clean up after all tests
afterAll(async () => {
    await Deno.remove(TEST_DIRS.TMP, { recursive: true })
})


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/setup/global.ts

import { mkdir } from 'fs/promises'
import path from 'path'
import { TestDirs } from '../types'

export const TEST_DIRS: TestDirs = {
    FIXTURES: path.join(process.cwd(), 'test', 'fixtures', 'scss'),
    OUTPUT: path.join(process.cwd(), 'tmp', 'test-output'),
    CACHE: path.join(process.cwd(), 'tmp', 'test-cache')
}

// Initialize test directories
export async function initTestDirs() {
    // Ensure all required test directories exist
    for (const dir of Object.values(TEST_DIRS)) {
        await mkdir(dir, { recursive: true })
    }

    // Ensure fixtures subdirectories exist
    const fixturesDirs = [
        'components',
        'lib',
        'vendor/lib'
    ].map(d => path.join(TEST_DIRS.FIXTURES, d))

    for (const dir of fixturesDirs) {
        await mkdir(dir, { recursive: true })
    }
} 

---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/types/index.ts

import { ResolvedOptions } from '../../src/types'
import { Logger } from '../../src/utils/logger'
import { FileManager } from '../../src/core/file-manager'
import { ScssCompiler } from '../../src/core/compiler'
import { SprocketsResolver } from '../../src/core/resolver'

export interface TestContext {
    options: ResolvedOptions;
    logger: Logger;
    fileManager: FileManager;
    compiler: ScssCompiler;
    resolver: SprocketsResolver;
}

export interface TestDirs {
    FIXTURES: string;
    OUTPUT: string;
    CACHE: string;
} 

---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/utils/glob-utils.test.ts

// test/utils/glob-utils.test.ts
import { assertEquals, assertArrayIncludes } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as path from "@std/path";
import { 
  findFiles,
  createIgnorePatterns,
  matchGlobPattern,
  normalizeGlobPatterns 
} from "~/utils/glob-utils.ts";
import { TEST_DIRS } from '../setup.ts'

describe('Glob Utilities', () => {
    const testDir = path.join(TEST_DIRS.TMP, 'glob-test')

    it('findFiles finds matching files', async () => {
        // Setup test directory
        await Deno.mkdir(path.join(testDir, 'nested'), { recursive: true })
        try {
            await Deno.stat(path.join(testDir, 'test1.scss'))
        } catch {
            await Deno.writeTextFile(path.join(testDir, 'test1.scss'), '')
        }
        try {
            await Deno.stat(path.join(testDir, 'nested/test2.scss'))
        } catch {
            await Deno.writeTextFile(path.join(testDir, 'nested/test2.scss'), '')
        }

        const files = await findFiles('**/*.scss', { cwd: testDir })
        assertEquals(files.length, 2)
        assertArrayIncludes(files, ['test1.scss'])
        assertArrayIncludes(files, ['nested/test2.scss'])
    })

    it('createIgnorePatterns formats patterns correctly', () => {
        const patterns = ['*.scss', 'nested/*.css']
        const ignored = createIgnorePatterns(patterns)

        assertEquals(ignored.length, 2)
        assertEquals(ignored[0], '!*.scss')
        assertEquals(ignored[1], '!nested/*.css')
    })

    it('matchGlobPattern matches patterns correctly', () => {
        assertEquals(matchGlobPattern('*.scss', 'test.scss'), true)
        assertEquals(matchGlobPattern('nested/*.scss', 'nested/test.scss'), true)
        assertEquals(matchGlobPattern('*.scss', 'test.css'), false)
    })

    it('normalizeGlobPatterns handles different input types', () => {
        assertEquals(normalizeGlobPatterns('test/*.scss'), ['test/*.scss'])
        assertEquals(normalizeGlobPatterns(['*.scss', '*.css']), [
            '*.scss',
            '*.css',
        ])
        assertEquals(normalizeGlobPatterns('test\\*.scss'), ['test/*.scss'])
    })
})


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/utils/logger.test.ts

// test/utils/logger.test.ts
import { assertEquals, assertInstanceOf, assertStringIncludes } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { Logger, createLogger } from "~/utils/logger.ts";

// Add state variables
let consoleLogs: string[] = [];
let consoleErrors: string[] = [];
let consoleWarns: string[] = [];
let consoleDebugs: string[] = [];
let consoleGroups: string[] = [];
let groupDepth = 0;

// Create a proper Console mock with all required methods
const mockConsole = {
  log: (msg: string) => consoleLogs.push(msg),
  error: (msg: string) => consoleErrors.push(msg),
  warn: (msg: string) => consoleWarns.push(msg),
  debug: (msg: string) => consoleDebugs.push(msg),
  info: (msg: string) => consoleLogs.push(msg),
  group: (label: string) => {
    consoleGroups.push(label);
    groupDepth++;
  },
  groupEnd: () => {
    groupDepth = Math.max(0, groupDepth - 1);
  },
  groupCollapsed: () => {},
  assert: () => {},
  clear: () => {},
  count: () => {},
  countReset: () => {},
  dir: () => {},
  dirxml: () => {},
  table: () => {},
  time: () => {},
  timeEnd: () => {},
  timeLog: () => {},
  trace: () => {},
  profile: () => {},
  profileEnd: () => {},
  timeStamp: () => {},
} as unknown as Console;

beforeEach(() => {
  // Reset state
  consoleLogs = [];
  consoleErrors = [];
  consoleWarns = [];
  consoleDebugs = [];
  consoleGroups = [];
  groupDepth = 0;
  
  // Set mock console
  globalThis.console = mockConsole;
});

describe('Logger', () => {
    it('creates logger with debug mode', () => {
        const logger = createLogger(true);
        assertInstanceOf(logger, Logger);
    });

    it('logs info messages with proper prefix', () => {
        const logger = new Logger(true);
        logger.info('Test message');
        assertStringIncludes(consoleLogs[0], '[Sprockets-SCSS]');
        assertStringIncludes(consoleLogs[0], 'Test message');
    });

    it('logs error messages with stack trace', () => {
        const logger = new Logger(true);
        const error = new Error('Test error');
        logger.error(error);
        assertStringIncludes(consoleErrors[0], 'Test error');
    });

    it('logs warning messages with prefix', () => {
        const logger = new Logger(true);
        logger.warn('Warning message');
        assertStringIncludes(consoleWarns[0], 'Warning:');
        assertStringIncludes(consoleWarns[0], 'Warning message');
    });

    it('respects debug mode setting', () => {
        const debugLogger = new Logger(true);
        const nonDebugLogger = new Logger(false);

        debugLogger.debug('Debug message');
        assertEquals(consoleDebugs.length, 1);

        nonDebugLogger.debug('Should not appear');
        assertEquals(consoleDebugs.length, 1);
    });

    it('handles trace messages in debug mode', () => {
        const logger = new Logger(true);
        logger.trace('Trace message');
        assertStringIncludes(consoleLogs[0], 'Trace:');
        assertStringIncludes(consoleLogs[0], 'Trace message');
    });

    it('manages group depth correctly', () => {
        const logger = new Logger(true);

        logger.info('Base level');
        logger.group('Group 1');
        logger.info('Level 1');
        logger.group('Group 2');
        logger.info('Level 2');
        logger.groupEnd();
        logger.info('Back to Level 1');
        logger.groupEnd();

        assertEquals(groupDepth, 0);
        assertEquals(consoleGroups.length, 2);
    });

    it('ignores groups when debug is false', () => {
        const logger = new Logger(false);
        logger.group('Should not appear');
        logger.info('Test message');
        logger.groupEnd();

        assertEquals(consoleGroups.length, 0);
    });
});


---

# /mnt/raid0/developer/work/lc/.vite/plugins/sprockets-scss/test/utils/path-utils.test.ts

// test/utils/path-utils.test.ts
import {
    assertEquals,
    assertStringIncludes,
    assertFalse,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
    normalizePath,
    createBoundaryMarker,
    matchWildcard,
    isAbsoluteOrRelativePath,
    resolveRelativePath,
    getExtension,
    removeExtension,
    joinPaths,
    isPartialPath,
} from '../../src/utils/path-utils.ts';

describe('Path Utilities', () => {
    it('normalizePath handles different path formats', () => {
        assertEquals(normalizePath('path\\to\\file'), 'path/to/file')
        assertEquals(normalizePath('path/to/file'), 'path/to/file')
        assertEquals(normalizePath('path\\to\\file.scss'), 'path/to/file.scss')
    })

    it('createBoundaryMarker generates correct markers', () => {
        const marker = createBoundaryMarker('path/to/file.scss')
        assertStringIncludes(marker.start, 'FILE_BOUNDARY')
        assertStringIncludes(marker.end, 'FILE_BOUNDARY')
        assertEquals(marker.path, 'path/to/file.scss')
    })

    it('matchWildcard handles different patterns', () => {
        assertEquals(matchWildcard('*.scss', 'file.scss'), true)
        assertEquals(matchWildcard('*.scss', 'file.css'), false)
        assertEquals(matchWildcard('test/**.scss', 'test/nested/file.scss'), true)
        assertEquals(matchWildcard('test/*.scss', 'test/file.scss'), true)
        assertEquals(matchWildcard('test/*.scss', 'test/nested/file.scss'), false)
    })

    it('isAbsoluteOrRelativePath detects path types', () => {
        assertEquals(isAbsoluteOrRelativePath('/absolute/path'), true)
        assertEquals(isAbsoluteOrRelativePath('./relative/path'), true)
        assertEquals(isAbsoluteOrRelativePath('../relative/path'), true)
        assertEquals(isAbsoluteOrRelativePath('non/relative/path'), false)
    })

    it('resolveRelativePath resolves paths correctly', () => {
        assertFalse(resolveRelativePath('/root/src/file.scss', '/root/dist/output.css').includes('/root/src'))
        assertEquals(resolveRelativePath('src/file.scss', 'dist/output.css'), '../dist/output.css')
    })

    it('getExtension returns correct file extensions', () => {
        assertEquals(getExtension('file.scss'), '.scss')
        assertEquals(getExtension('path/to/file.CSS'), '.css')
        assertEquals(getExtension('no-extension'), '')
    })

    it('removeExtension strips file extensions', () => {
        assertEquals(removeExtension('file.scss'), 'file')
        assertEquals(removeExtension('path/to/file.css'), 'path/to/file')
        assertEquals(removeExtension('no-extension'), 'no-extension')
    })

    it('joinPaths combines paths correctly', () => {
        assertEquals(joinPaths('path', 'to', 'file'), 'path/to/file')
        assertEquals(joinPaths('path/', '/to/', '/file'), 'path/to/file')
        assertEquals(joinPaths('path\\to', 'file'), 'path/to/file')
    })

    it('isPartialPath identifies partial files', () => {
        assertEquals(isPartialPath('_partial.scss'), true)
        assertEquals(isPartialPath('regular.scss'), false)
        assertEquals(isPartialPath('path/to/_partial.scss'), true)
    })
})

