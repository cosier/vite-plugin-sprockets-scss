import { promises as fs } from 'fs'
import path from 'path'
import { TEST_DIRS } from './setup'

export async function setupFixtures(): Promise<void> {
    const railsRoot = path.join(TEST_DIRS.FIXTURES, 'rails')
    
    // Clean up existing fixtures
    try {
        await fs.rm(railsRoot, { recursive: true, force: true })
    } catch (error) {
        // Ignore if directory doesn't exist
    }

    // Create Rails-like directory structure
    const directories = [
        'app/assets/stylesheets/components',
        'vendor/assets/stylesheets',
        'node_modules/bootstrap/scss'
    ]

    for (const dir of directories) {
        await fs.mkdir(path.join(railsRoot, dir), { recursive: true })
    }

    // Create test files
    const files = {
        'app/assets/stylesheets/application.scss': `
            // = require '_variables'
            // = require '_shared'
            // = require_tree './components'
        `,
        'app/assets/stylesheets/_variables.scss': `
            $primary-color: #ff8100;
            $font-family-base: 'myriad-pro', sans-serif;
        `,
        'app/assets/stylesheets/_shared.scss': `
            @import '_variables';
            .app-shared { color: blue; }
        `,
        'vendor/assets/stylesheets/_shared.scss': '.vendor-shared { color: red; }',
        'app/assets/stylesheets/components/_header.scss': '.header { color: $primary-color; }'
    }

    for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(railsRoot, filePath)
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, content.trim() + '\n')
    }
} 