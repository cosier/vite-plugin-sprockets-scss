import { describe, it, beforeAll } from "@std/testing/bdd";
import { assertEquals, assertExists, assertStringIncludes, assert } from "@std/assert";
import * as path from "@std/path";
import { createTestContext } from './helpers/context.ts';
import { EXAMPLE_APP_DIRS } from './setup.ts';

describe('Rails Path Resolution', () => {
    const { resolver } = createTestContext();

    beforeAll(async () => {
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
            const fullPath = path.join(EXAMPLE_APP_DIRS.ROOT, filePath);
            await Deno.mkdir(path.dirname(fullPath), { recursive: true });
            try {
                await Deno.stat(fullPath);
            } catch {
                await Deno.writeTextFile(fullPath, content.trim());
            }
        }
    });

    it('resolves application.scss with all dependencies', async () => {
        const applicationScss = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'application.scss');
        const content = await Deno.readTextFile(applicationScss);

        const result = await resolver.resolveRequires(content, applicationScss);

        assertStringIncludes(result.content, 'primary-color');
        assertStringIncludes(result.content, 'header');
        assertExists(result.dependencies.length > 0);
    });

    it('prefers app/assets over vendor/assets', async () => {
        const content = `// = require '_shared'`;
        const result = await resolver.resolveRequires(
            content,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'test.scss')
        );

        assertStringIncludes(result.content, 'app-shared');
        assert(!result.content.includes('vendor-shared'));
    });
});
