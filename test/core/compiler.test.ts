import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { describe, it } from "bdd";
import { ScssCompiler } from "~/core/compiler.ts";
import { createTestContext } from "~/test/helpers/context.ts";
import * as path from "@std/path";
import { EXAMPLE_APP_DIRS } from "~/test/setup.ts";

describe('SCSS Compiler', () => {
    const { options, logger } = createTestContext({
        globalMixins: ['variables']
    });

    const compiler = new ScssCompiler(options, logger);

    it('processes basic SCSS file', async () => {
        const basicPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss');
        const basic = await Deno.readTextFile(basicPath);
        const result = await compiler.compile(basic, 'basic.scss');

        assertEquals(result.errors.length, 0);
        assertStringIncludes(result.css, '.test-component');
        assertStringIncludes(result.css, 'background:');
    });

    it('compiles SCSS with source maps', async () => {
        const basicPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss');
        const basic = await Deno.readTextFile(basicPath);
        const result = await compiler.compile(basic, 'basic.scss');

        assertExists(result.map);
        assertEquals(JSON.parse(result.map!).version, 3);
    });

    describe('Global Mixins', () => {
        it('loads and includes global mixins', async () => {
            const { compiler } = createTestContext({
                globalMixins: ['variables']
            });

            const testScss = '.test { color: $brand-primary; }';
            const result = await compiler.compile(testScss, 'test.scss');

            assertStringIncludes(result.css, '#ff7700'); // $brand-primary value
            assertEquals(result.errors.length, 0);
        });

        it('throws error for missing global mixin', async () => {
            const { compiler } = createTestContext({
                globalMixins: ['non-existent-file']
            });

            try {
                await compiler.compile('.test {}', 'test.scss');
                throw new Error('Should have thrown error');
            } catch (error: unknown) {
                if (error instanceof Error) {
                    assertStringIncludes(error.message, 'Global mixin file not found');
                } else {
                    throw new Error('Unexpected error type');
                }
            }
        });

        it('handles multiple global mixins in correct order', async () => {
            const { compiler } = createTestContext({
                globalMixins: ['variables', '_mixins']
            });

            const testScss = `.test {
                color: $brand-primary;
                @include center;
            }`;

            const result = await compiler.compile(testScss, 'test.scss');

            assertEquals(result.errors.length, 0);
            assertStringIncludes(result.css, '#ff7700');
            assertStringIncludes(result.css, 'display: flex');
        });
    });
});
