import { assertEquals, assertStringIncludes, assert } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as path from "@std/path";
import { createTestContext } from "~/test/helpers/context.ts";
import { EXAMPLE_APP_DIRS } from "~/test/setup.ts";

describe('Resolver - Require Directives', () => {
    const { resolver } = createTestContext();

    it('processes require directives', async () => {
        const withRequires = await Deno.readTextFile(
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );

        const resolvedContent = await resolver.resolveRequires(
            withRequires,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );

        const normalizedDeps = resolvedContent.dependencies.map((dep: string) => path.basename(dep));

        assertEquals(resolvedContent.content, '$primary-color');
        assertEquals(resolvedContent.content, '@mixin center');
        assertEquals(normalizedDeps, ['_variables.scss', '_mixins.scss']);
    });

    it('respects file ordering', async () => {
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

        assert(variablesIndex < mainIndex);
    });
});
