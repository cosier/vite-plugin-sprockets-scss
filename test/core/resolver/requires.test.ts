import { describe, expect, test } from "bun:test";
import path from "path";
import { promises as fs } from 'fs';
import { createTestContext } from "@test/helpers";
import { EXAMPLE_APP_DIRS } from '../../setup';

describe('Resolver - Require Directives', () => {
    const { resolver } = createTestContext();

    test('processes require directives', async () => {
        const withRequires = await fs.readFile(
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss'),
            'utf-8'
        );

        const resolvedContent = await resolver.resolveRequires(
            withRequires,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );

        const normalizedDeps = resolvedContent.dependencies.map(dep => path.basename(dep));

        expect(resolvedContent.content).toContain('$primary-color');
        expect(resolvedContent.content).toContain('@mixin center');
        expect(normalizedDeps).toContain('_variables.scss');
        expect(normalizedDeps).toContain('_mixins.scss');
    });

    test('respects file ordering', async () => {
        const testFile = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss');
        const withRequires = `
            // = require '_variables'
            // = require '_mixins'
            // = require_tree './components'

            .main {
                @include center;
                background: $primary-color;
            }
        `;

        const resolvedContent = await resolver.resolveRequires(withRequires, testFile);
        const content = resolvedContent.content;

        const variablesIndex = content.indexOf('$primary-color');
        const mainIndex = content.indexOf('.main');

        expect(variablesIndex).toBeLessThan(mainIndex);
    });
});
