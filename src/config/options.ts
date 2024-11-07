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
}
