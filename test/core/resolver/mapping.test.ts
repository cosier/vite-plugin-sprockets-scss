import { describe, expect, test } from "bun:test";
import { promises as fs } from 'fs';
import path from "path";
import { createTestContext } from "../../helpers/context";
import { EXAMPLE_APP_DIRS } from '../../setup';

describe('Resolver - File Mapping', () => {
    const { resolver, logger, options } = createTestContext();

    test('handles file mapping with includePaths fallback', async () => {
        // Create vendor file
        const vendorPath = path.join(EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS, 'lib/select2.scss');
        await fs.mkdir(path.dirname(vendorPath), { recursive: true });

        if (!(await fs.access(vendorPath).then(() => true).catch(() => false))) {
            await fs.writeFile(vendorPath, '.select2-vendor { display: block; }');
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

            expect(resolvedPath).not.toBeNull();
            expect(resolvedPath).toContain('vendor/assets/stylesheets/lib/select2.scss');

            // Verify content if resolved
            if (resolvedPath) {
                const content = await fs.readFile(resolvedPath, 'utf-8');
                expect(content).toBe('.select2-vendor { display: block; }');
            }
        } finally {
            /
        }
    });
});
