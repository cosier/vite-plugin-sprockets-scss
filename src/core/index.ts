/**
 * @file: .vite/plugins/sprockets-scss/src/core/index.ts
 * @description: Core module exports
 */

export { ScssCompiler } from './compiler'
export { FileManager } from './file-manager'
export { SprocketsResolver } from './resolver'

// Common types used across core modules
export type { CompilationResult, ResolvedContent } from '../types'
