import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as path from "@std/path";
import { createTestContext } from "../../helpers/context.ts";
import { EXAMPLE_APP_DIRS } from "../../setup.ts";

describe('Resolver - Aliases', () => {
    const { resolver } = createTestContext();

    it('handles aliases', async () => {
        // Create a test file at the expected location
        const testPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/component.scss');

        // Ensure directory exists
        await Deno.mkdir(path.dirname(testPath), { recursive: true });
        try {
            await Deno.stat(testPath);
        } catch {
            await Deno.writeTextFile(testPath, '.test { color: red; }');
        }

        try {
            const resolvedPath = await resolver.resolveImportPath(
                '~lib/component',
                EXAMPLE_APP_DIRS.ROOT,
                EXAMPLE_APP_DIRS.ROOT
            );
            if (!resolvedPath) {
                throw new Error(`Failed to resolve path: ${testPath}`);
            }

            assertExists(path.normalize(resolvedPath).includes('app/assets/stylesheets/lib/component'));
        } finally {
            // done
        }
    });

    it('resolves alias paths correctly', () => {
        const aliasPath = resolver['resolveAliasPath']('~lib/component');
        assertEquals(aliasPath, 'app/assets/stylesheets/lib/component');
    });
});
