import { describe, test, beforeAll, afterAll } from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';

const pluginRootDir = path.join(process.cwd())
// Test directories
export const TEST_DIRS = {
    FIXTURES: path.join(pluginRootDir, 'test', 'fixtures', 'scss'),
    OUTPUT: path.join(pluginRootDir, 'tmp', 'test-output'),
    CACHE: path.join(pluginRootDir, 'tmp', 'test-cache'),
    EXAMPLE_APP: path.join(pluginRootDir, 'tmp', 'example-app')
};

// Setup and cleanup
beforeAll(async () => {
    // Create test directories
    await fs.mkdir(TEST_DIRS.EXAMPLE_APP, { recursive: true });
    await fs.mkdir(path.join(TEST_DIRS.EXAMPLE_APP, 'components'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIRS.EXAMPLE_APP, 'lib'), { recursive: true });
    await fs.mkdir(path.join(TEST_DIRS.EXAMPLE_APP, 'vendor/lib'), { recursive: true });
    await fs.mkdir(TEST_DIRS.OUTPUT, { recursive: true });
    await fs.mkdir(TEST_DIRS.CACHE, { recursive: true });

    // Create test files
    const files = {
        'basic.scss': '.test-component { background: #fff; padding: 20px; }',
        '_variables.scss': '$primary-color: #ff7700; $font-family-base: "myriad-pro", sans-serif;',
        '_mixins.scss': '@mixin center { display: flex; align-items: center; justify-content: center; }',
        'components/_header.scss': '.header { background: $primary-color; }',
        'components/_footer.scss': '.footer { color: $primary-color; }',
        'lib/select2.scss': '.select2 { display: inline-block; }',
        'lib/select2.css': '.select2 { display: inline-block; }',
        'vendor/lib/select2.scss': '.select2-vendor { display: block; }',
        'circular-a.scss': '// = require "circular-b"\n.circular-a { color: red; }',
        'circular-b.scss': '// = require "circular-a"\n.circular-b { color: blue; }',
        'with-requires.scss': `
            // = require '_variables'
            // = require '_mixins'
            // = require_tree './components'

            .main {
                @include center;
                background: $primary-color;
            }
        `
    };

    for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(TEST_DIRS.EXAMPLE_APP, filePath);    
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        // only write file if it doesn't exist
        if (!(await fs.access(fullPath).then(() => true).catch(() => false))) {
            await fs.writeFile(fullPath, content);
        }
    }
});

afterAll(async () => {
    await fs.rm(TEST_DIRS.OUTPUT, { recursive: true, force: true });
    await fs.rm(TEST_DIRS.CACHE, { recursive: true, force: true });
    // done
});

// Import all test files
import './core/compiler.test';
import './core/file-manager.test';
import './core/resolver/aliases.test';
import './core/resolver/mapping.test';
import './core/resolver/requires.test';
import './core/resolver/tree.test';
import './error-handling/circular-deps.test';
import './error-handling/missing-files.test';
import './plugin.test';
import './rails-paths.test';