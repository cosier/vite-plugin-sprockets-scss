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
