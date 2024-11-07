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
