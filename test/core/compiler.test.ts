import { describe, expect, test } from "bun:test";
import { ScssCompiler } from '~/core/compiler';
import { createTestContext } from '../helpers';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EXAMPLE_APP_DIRS } from '../setup';

describe('SCSS Compiler', () => {
    const { options, logger } = createTestContext();
    const compiler = new ScssCompiler(options, logger);

    test('processes basic SCSS file', async () => {
        const basicPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss');
        const basic = await fs.readFile(basicPath, 'utf-8');
        const result = await compiler.compile(basic, 'basic.scss');

        expect(result.errors).toHaveLength(0);
        expect(result.css).toContain('.test-component');
        expect(result.css).toContain('background:');
    });

    test('compiles SCSS with source maps', async () => {
        const basicPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss');
        const basic = await fs.readFile(basicPath, 'utf-8');
        const result = await compiler.compile(basic, 'basic.scss');

        expect(result.map).toBeDefined();
        expect(JSON.parse(result.map!)).toHaveProperty('version', 3);
    });

    describe('Global Mixins', () => {
        test('loads and includes global mixins', async () => {
            const { compiler } = createTestContext({
                globalMixins: ['variables']
            });

            const testScss = '.test { color: $brand-primary; }';
            const result = await compiler.compile(testScss, 'test.scss');

            expect(result.css).toContain('#ff7700'); // $brand-primary value
            expect(result.errors).toHaveLength(0);
        });

        test('throws error for missing global mixin', async () => {
            const { compiler } = createTestContext({
                globalMixins: ['non-existent-file']
            });

            await expect(
                compiler.compile('.test {}', 'test.scss')
            ).rejects.toThrow('Global mixin file not found');
        });

        test('handles multiple global mixins in correct order', async () => {
            const { compiler } = createTestContext({
                globalMixins: ['variables', '_mixins']
            });

            const testScss = `.test {
                color: $brand-primary;
                @include center;
            }`;

            const result = await compiler.compile(testScss, 'test.scss');

            expect(result.errors).toHaveLength(0);
            expect(result.css).toContain('#ff7700');
            expect(result.css).toContain('display: flex');
        });
    });
});
