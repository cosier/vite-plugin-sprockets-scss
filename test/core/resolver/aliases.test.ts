import { describe, expect, test } from "bun:test";
import path from "path";
import { promises as fs } from 'fs';
import { createTestContext } from "../../helpers/context";
import { EXAMPLE_APP_DIRS } from '../../setup';

describe('Resolver - Aliases', () => {
    const { resolver } = createTestContext();

    test('handles aliases', async () => {
        // Create a test file at the expected location
        const testPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/component.scss');

        // Ensure directory exists
        await fs.mkdir(path.dirname(testPath), { recursive: true });
        if (!(await fs.access(testPath).then(() => true).catch(() => false))) {
            await fs.writeFile(testPath, '.test { color: red; }');
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
            
            expect(path.normalize(resolvedPath)).toContain('app/assets/stylesheets/lib/component');
        } finally {
            // done
        }
    });

    test('resolves alias paths correctly', () => {
        const aliasPath = resolver['resolveAliasPath']('~lib/component');
        expect(aliasPath).toBe('app/assets/stylesheets/lib/component');
    });
});
