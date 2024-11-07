/**
 * @file: .vite/plugins/sprockets-scss/types.ts
 * @description: Type definitions for the Sprockets SCSS plugin
 */

import type { Options as SassOptions } from 'sass';

export type Syntax = 'scss' | 'indented' | 'css';

export interface SprocketsPluginOptions {
    root?: string
    includePaths?: string[]
    entryGroups?: Record<string, string[]>
    outputPath?: string
    fileMapping?: Record<string, string>
    aliases?: Record<string, string>
    debug?: boolean
    ignorePartials?: boolean
    sourceMap?: boolean
    cache?: boolean
    cacheDirectory?: string
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
}

export interface CompilationResult {
    css: string
    map?: string
    dependencies: string[]
    errors?: string[]
    stats?: CompilationStats
    duration?: number
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
