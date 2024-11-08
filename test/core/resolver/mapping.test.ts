import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as path from "@std/path";
import { createTestContext } from "../../helpers/context.ts";
import { EXAMPLE_APP_DIRS } from '../../setup.ts';

describe('Resolver - File Mapping', () => {
    const { resolver, logger, options } = createTestContext();

    it('handles file mapping with includePaths fallback', async () => {
        // Create vendor file
        const vendorPath = path.join(EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS, 'lib/select2.scss');
        await Deno.mkdir(path.dirname(vendorPath), { recursive: true });

        try {
            await Deno.stat(vendorPath);
        } catch {
            await Deno.writeTextFile(vendorPath, '.select2-vendor { display: block; }');
        }

        // Ensure app paths don't exist
        const appCssPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.css');
        const appScssPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.scss');

        try {
            // Debug current state
            logger.debug('Test setup:');
            logger.debug(`Vendor file: ${vendorPath}`);
            logger.debug(`App CSS file (should not exist): ${appCssPath}`);
            logger.debug(`App SCSS file (should not exist): ${appScssPath}`);
            logger.debug('Include paths:', options.includePaths);
            logger.debug('File mappings:', options.fileMapping);

            const resolvedPath = resolver.findFileInPaths('select2', EXAMPLE_APP_DIRS.ROOT);
            logger.debug(`Resolved path: ${resolvedPath}`);

            assertExists(resolvedPath);
            assertEquals(resolvedPath?.includes('vendor/assets/stylesheets/lib/select2.scss'), true);

            // Verify content if resolved
            if (resolvedPath) {
                const content = await Deno.readTextFile(resolvedPath);
                assertEquals(content, '.select2-vendor { display: block; }');
            }
        } finally {
            // Cleanup handled by test framework
        }
    });
});
