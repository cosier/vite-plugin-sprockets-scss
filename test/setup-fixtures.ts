import * as path from "https://deno.land/std/path/mod.ts";
import { TEST_DIRS } from './setup.ts';

export async function setupFixtures(): Promise<void> {
    const railsRoot = path.join(TEST_DIRS.FIXTURES, 'rails');

    // Clean up existing fixtures
    try {
        await Deno.remove(railsRoot, { recursive: true });
    } catch (error) {
        // Ignore if directory doesn't exist
    }

    // Create Rails-like directory structure
    const directories = [
        'app/assets/stylesheets/components',
        'vendor/assets/stylesheets',
        'node_modules/bootstrap/scss'
    ];

    for (const dir of directories) {
        await Deno.mkdir(path.join(railsRoot, dir), { recursive: true });
    }

    // Create test files
    const files = {
        'app/assets/stylesheets/application.scss': `
            // = require '_variables'
            // = require '_shared'
            // = require_tree './components'
        `,
        'app/assets/stylesheets/_variables.scss': `
            $primary-color: #ff7700;
            $font-family-base: 'myriad-pro', sans-serif;
        `,
        'app/assets/stylesheets/_shared.scss': `
            @import '_variables';
            .app-shared { color: blue; }
        `,
        'vendor/assets/stylesheets/_shared.scss': '.vendor-shared { color: red; }',
        'app/assets/stylesheets/components/_header.scss': '.header { color: $primary-color; }'
    };

    for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(railsRoot, filePath);
        await Deno.mkdir(path.dirname(fullPath), { recursive: true });
        try {
            await Deno.stat(fullPath);
        } catch {
            await Deno.writeTextFile(fullPath, content.trim() + '\n');
        }
    }
}
