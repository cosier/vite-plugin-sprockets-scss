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
