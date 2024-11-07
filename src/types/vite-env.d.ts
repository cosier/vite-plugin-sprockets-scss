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
