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
