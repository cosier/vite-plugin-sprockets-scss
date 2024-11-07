import { describe, expect, test } from "bun:test";
import { ScssCompiler } from '~/core/compiler';
import { createTestContext } from '@test/helpers';
import { promises as fs } from 'fs';
import path from 'path';
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
});
