// .vite/plugins/sprockets-scss/test/setup.ts

import { describe, it, beforeAll, afterAll } from "@std/testing/bdd";
import * as path from "@std/path";

const pluginRootDir = path.join(Deno.cwd());

export const TEST_DIRS = {
    TMP: path.join(pluginRootDir, 'tmp'),
    FIXTURES: path.join(pluginRootDir, 'test', 'fixtures'),
    OUTPUT: path.join(pluginRootDir, 'tmp', 'test-output'),
    CACHE: path.join(pluginRootDir, 'tmp', 'test-cache'),
    EXAMPLE_APP: path.join(pluginRootDir, 'test', 'fixtures', 'rails'),
}

export const EXAMPLE_APP_DIRS = {
    ROOT: TEST_DIRS.EXAMPLE_APP,
    ASSETS: {
        ROOT: path.join(TEST_DIRS.EXAMPLE_APP, 'app/assets'),
        STYLESHEETS: path.join(TEST_DIRS.EXAMPLE_APP, 'app/assets/stylesheets'),
        COMPONENTS: path.join(
            TEST_DIRS.EXAMPLE_APP,
            'app/assets/stylesheets/components'
        ),
    },
    VENDOR: {
        ROOT: path.join(TEST_DIRS.EXAMPLE_APP, 'vendor'),
        ASSETS: path.join(TEST_DIRS.EXAMPLE_APP, 'vendor/assets'),
        STYLESHEETS: path.join(
            TEST_DIRS.EXAMPLE_APP,
            'vendor/assets/stylesheets'
        ),
    },
    PUBLIC: {
        ROOT: path.join(TEST_DIRS.EXAMPLE_APP, 'public'),
        ASSETS: path.join(TEST_DIRS.EXAMPLE_APP, 'public/assets'),
    },
    NODE_MODULES: path.join(TEST_DIRS.EXAMPLE_APP, 'node_modules'),
}

// Setup before all tests
beforeAll(async () => {
    // Create all necessary directories
    for (const dir of Object.values(EXAMPLE_APP_DIRS)) {
        if (typeof dir === 'string') {
            await Deno.mkdir(dir, { recursive: true })
        } else {
            for (const subdir of Object.values(dir)) {
                await Deno.mkdir(subdir, { recursive: true })
            }
        }
    }

    await Deno.mkdir(TEST_DIRS.OUTPUT, { recursive: true })
    await Deno.mkdir(TEST_DIRS.CACHE, { recursive: true })

    debugger
    // Create test files
    const files = {
        'app/assets/stylesheets/basic.scss':
            '.test-component { background: #fff; padding: 20px; }',
        'app/assets/stylesheets/_variables.scss':
            '$primary-color: #ff7700; $font-family-base: "myriad-pro", sans-serif;',
        'app/assets/stylesheets/_mixins.scss':
            '@mixin center { display: flex; align-items: center; justify-content: center; }',
        'app/assets/stylesheets/components/_header.scss':
            '.header { background: $primary-color; }',
        'app/assets/stylesheets/components/_footer.scss':
            '.footer { color: $primary-color; }',
        'app/assets/stylesheets/lib/select2.scss':
            '.select2 { display: inline-block; }',
        'app/assets/stylesheets/lib/select2.css':
            '.select2 { display: inline-block; }',
        'vendor/assets/stylesheets/lib/select2.scss':
            '.select2-vendor { display: block; }',
        'app/assets/stylesheets/with-requires.scss': `
            // = require '_variables'
            // = require '_mixins'
            // = require_tree './components'

            .main {
                @include center;
                background: $primary-color;
            }
        `,
    }

    for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(TEST_DIRS.EXAMPLE_APP, filePath)
        await Deno.mkdir(path.dirname(fullPath), { recursive: true })
        console.debug(`Writing file: ${fullPath}`)
        try {
            await Deno.stat(fullPath)
        } catch {
            await Deno.writeTextFile(fullPath, content)
        }
    }
})

// Clean up after all tests
afterAll(async () => {
    await Deno.remove(TEST_DIRS.TMP, { recursive: true })
})
