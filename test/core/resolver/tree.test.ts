import { describe, expect, test } from "bun:test";
import path from "path";
import { createTestContext } from "../../helpers/context";
import { EXAMPLE_APP_DIRS } from '../../setup';

describe('Resolver - Require Tree', () => {
    const { resolver, logger } = createTestContext();

    test('handles require_tree directive', async () => {
        const testFile = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-require-tree.scss');
        logger.debug(`Test file path: ${testFile}`);

        const withRequireTree = `
            // = require '_variables'
            // = require '_mixins'
            // = require_tree 'components'

            .main {
                @include center;
                background: $primary-color;
            }
        `;

        const resolvedContent = await resolver.resolveRequires(withRequireTree, testFile);
        expect(resolvedContent.content).toContain('.header');
        expect(resolvedContent.content).toContain('.footer');
    });
});
