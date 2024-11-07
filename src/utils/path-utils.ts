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
    const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
    return new RegExp(`^${regexPattern}$`).test(str)
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
