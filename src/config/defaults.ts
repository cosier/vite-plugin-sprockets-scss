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
