/**
 * @file: .vite/plugins/sprockets-scss/test/plugin.test.ts
 * @description: Plugin test suite
 */

import { 
  assertEquals, 
  assertMatch, 
  assertExists,
  assert,
  assertRejects,
  assertNotEquals 
} from "@std/assert";
import { describe, it, beforeAll, afterEach } from "@std/testing/bdd";
import * as path from "@std/path";
import { createLogger } from "~/utils/logger.ts";
import { resolveOptions } from "~/config/options.ts";
import { FileManager } from "~/core/file-manager.ts";
import { ScssCompiler } from "~/core/compiler.ts";
import { SprocketsResolver } from "~/core/resolver.ts";
import type { ResolvedOptions } from "~/types/index.ts";
import { CircularDependencyError, FileNotFoundError } from "~/utils/errors.ts";
import { PerformanceMonitor } from "~/utils/performance.ts";
import { TEST_DIRS, EXAMPLE_APP_DIRS } from './setup.ts';

describe('Sprockets SCSS Plugin', () => {
    let logger: ReturnType<typeof createLogger>;
    let compiler: ScssCompiler;
    let resolver: SprocketsResolver;
    let fileManager: FileManager;
    let options: ResolvedOptions;
    let performance: PerformanceMonitor;

    async function ensureTestFiles() {
        // Define all required directories
        const requiredDirs = [
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib'),
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'components'),
            path.join(EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS, 'lib'),
        ];

        // Create all required directories
        for (const dir of requiredDirs) {
            await Deno.mkdir(dir, { recursive: true });
        }

        // Create test files in example app structure
        const files = [
            ['app/assets/stylesheets/basic.scss', '.test-component { background: #fff; padding: 20px; }'],
            ['app/assets/stylesheets/circular-a.scss', '// = require "circular-b"\n.circular-a { color: red; }'],
            ['app/assets/stylesheets/circular-b.scss', '// = require "circular-a"\n.circular-b { color: blue; }'],
            ['app/assets/stylesheets/lib/select2.css', '.select2 { color: blue; }'],
            ['app/assets/stylesheets/lib/select2.scss', '.select2-container { display: block; }'],
            ['vendor/assets/stylesheets/lib/select2.scss', '.select2-vendor { display: block; }'],
            ['app/assets/stylesheets/_variables.scss', '$primary-color: #ff7700; $font-family-base: "myriad-pro", sans-serif;'],
            ['app/assets/stylesheets/_mixins.scss', '@mixin center { display: flex; align-items: center; justify-content: center; }'],
            ['app/assets/stylesheets/components/_header.scss', `
                .header {
                    background: #fff;
                    border-bottom: 1px solid #e1e1e1;
                    height: 60px;
                    position: fixed;
                    top: 0;
                    width: 100%;
                    z-index: 100;
                }
            `],
            ['app/assets/stylesheets/with-requires.scss', `
                //= require '_variables'
                //= require '_mixins'
                //= require_tree './components'

                .main {
                    @include center;
                    background: $primary-color;
                    font-family: $font-family-base;
                }
            `],
        ];

        for (const [filePath, content] of files) {
            const fullPath = path.join(EXAMPLE_APP_DIRS.ROOT, filePath);
            await Deno.mkdir(path.dirname(fullPath), { recursive: true });
            try {
                await Deno.stat(fullPath);
            } catch {
                await Deno.writeTextFile(fullPath, content);
            }
        }

        logger?.debug(`Created test files: ${files.map(([f]) => f).join(', ')}`);
    }

    beforeAll(async () => {
        await ensureTestFiles();

        options = resolveOptions({
            root: EXAMPLE_APP_DIRS.ROOT,
            debug: true,
            includePaths: [
                EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS,
                EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS
            ],
            entryGroups: {
                application: ['application.scss'],
                admin: ['admin/**/*.scss']
            },
            fileMapping: {
                'select2': path.join('lib', 'select2.css'),
                'jquery-ui/*': path.join('vendor', 'jquery-ui', 'themes', 'base', '*.css')
            },
            aliases: {
                '~lib': 'app/assets/stylesheets/lib'
            },
            outputPath: path.join(TEST_DIRS.OUTPUT, 'assets')
        });

        logger = createLogger(true);
        fileManager = new FileManager(options, logger);
        compiler = new ScssCompiler(options, logger);
        resolver = new SprocketsResolver(options, logger, fileManager);
        performance = new PerformanceMonitor();

        logger.debug('Test setup complete');
    });

    afterEach(() => {
        resolver.clearCache();
        compiler.clearCache();
        fileManager.clearCache();
    });

    it('processes basic SCSS file', async () => {
        performance.start();
        const basic = await Deno.readTextFile(path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss'));
        const result = await compiler.compile(basic, 'basic.scss');

        assertEquals(result.errors.length, 0);
        assertMatch(result.css, /\.test-component/);
        assertMatch(result.css, /background:/);
        assert(performance.getDuration() < 5000);
    });

    it('processes require directives', async () => {
        const withRequires = await Deno.readTextFile(
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );

        const resolvedContent = await resolver.resolveRequires(
            withRequires,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );
        const normalizedDeps = resolvedContent.dependencies.map((d: string) => path.basename(d));

        assertMatch(resolvedContent.content, /\$primary-color/);
        assertMatch(resolvedContent.content, /@mixin center/);
        assertEquals(normalizedDeps.includes('_variables.scss'), true);
        assertEquals(normalizedDeps.includes('_mixins.scss'), true);
    });

    it('handles require_tree directive', async () => {
        const testFile = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss');
        const withRequireTree = `
                // = require '_variables'
                // = require '_mixins'
                // = require_tree 'components'

                .main {
                    @include center;
                    background: $primary-color;
                }
            `;

        const resolvedContent = await resolver.resolveRequires(withRequireTree, testFile)
        assertMatch(resolvedContent.content, /\.header/);
        assertMatch(resolvedContent.content, /\.footer/);
    });

    it('respects file ordering', async () => {
        const withRequires = await Deno.readTextFile(
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );

        const resolvedContent = await resolver.resolveRequires(
            withRequires,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );
        const content = resolvedContent.content;

        const variablesIndex = content.indexOf('$primary-color');
        const mainIndex = content.indexOf('.main');

        assert(variablesIndex < mainIndex);
    });

    it('handles file mapping with SCSS fallback', async () => {
        const libDir = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib');
        await Deno.mkdir(libDir, { recursive: true });

        try {
            await Deno.stat(path.join(libDir, 'select2.scss'));
        } catch {
            await Deno.writeTextFile(
                path.join(libDir, 'select2.scss'),
                '.select2-container { display: block; }'
            );
        }

        // First test with CSS file present
        const resolvedCssPath = resolver.findFileInPaths('select2', EXAMPLE_APP_DIRS.ROOT);
        assertNotEquals(resolvedCssPath, null);
        assertEquals(path.basename(resolvedCssPath!), 'select2.scss');

        // Test SCSS fallback
        const originalPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.css');
        const backupPath = originalPath + '.bak';

        try {
            await Deno.rename(originalPath, backupPath);

            const resolvedScssPath = resolver.findFileInPaths('select2', EXAMPLE_APP_DIRS.ROOT);
            assertNotEquals(resolvedScssPath, null);
            assertMatch(resolvedScssPath!, /select2\.scss$/);

            // Verify the content is loaded correctly
            if (resolvedScssPath) {
                const content = await fileManager.readFile(resolvedScssPath);
                assertMatch(content, /select2-container/);
            }
        } finally {
            try {
                await Deno.rename(backupPath, originalPath);
            } catch {
                // Ignore if backup didn't exist
            }
        }
    });

    it('handles file mapping with includePaths fallback', async () => {
        const vendorPath = path.join(EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS, 'lib/select2.scss');
        await Deno.mkdir(path.dirname(vendorPath), { recursive: true });
        try {
            await Deno.stat(vendorPath);
        } catch {
            await Deno.writeTextFile(vendorPath, '.select2-vendor { display: block; }');
        }

        const originalPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.css');
        const scssPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.scss');

        try {
            // Remove original files if they exist
            await Deno.remove(originalPath);
            await Deno.remove(scssPath);

            // Test resolution from include path
            const resolvedPath = resolver.findFileInPaths('select2', EXAMPLE_APP_DIRS.ROOT);
            assertNotEquals(resolvedPath, null);
            assertMatch(resolvedPath!, /vendor\/assets\/stylesheets\/lib\/select2\.scss$/);

            // Verify content
            if (resolvedPath) {
                const content = await fileManager.readFile(resolvedPath);
                assertMatch(content, /select2-vendor/);
            }
        } finally {
            try {
                await Deno.remove(vendorPath);
            } catch { /* ignore */ }
        }
    });

    it('handles aliases', async () => {
        const aliasPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/component.scss');
        await Deno.mkdir(path.dirname(aliasPath), { recursive: true });
        try {
            await Deno.stat(aliasPath);
        } catch {
            await Deno.writeTextFile(aliasPath, '.component { color: blue; }');
        }

        try {
            const resolvedPath = await resolver.resolveImportPath('~lib/component', EXAMPLE_APP_DIRS.ROOT, EXAMPLE_APP_DIRS.ROOT);
            if (!resolvedPath) {
                throw new Error('Failed to resolve import path');
            }

            assertNotEquals(resolvedPath, null);
            assertMatch(path.normalize(resolvedPath), /app\/assets\/stylesheets\/lib\/component/);
        } finally {
            // done
        }
    });

    it('handles partial files correctly', () => {
        assertEquals(fileManager.isPartial('_variables.scss'), true);
        assertEquals(fileManager.isPartial('main.scss'), false);
    });

    it('compiles SCSS with source maps', async () => {
        const basic = await Deno.readTextFile(path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss'));
        const result = await compiler.compile(basic, 'basic.scss');

        assertExists(result.map);
        assertEquals(JSON.parse(result.map!).version, 3);
    });

    it('handles circular dependencies', async () => {
        const circularAPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'circular-a.scss');
        const circularBPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'circular-b.scss');

        // Create test files with minimal whitespace
        try {
            await Deno.stat(circularAPath);
        } catch {
            await Deno.writeTextFile(circularAPath, '// = require "circular-b"\n.circular-a { color: red; }');
        }
        try {
            await Deno.stat(circularBPath);
        } catch {
            await Deno.writeTextFile(circularBPath, '// = require "circular-a"\n.circular-b { color: blue; }');
        }

        try {
            const content = await Deno.readTextFile(circularAPath);
            await assertRejects(
                async () => await resolver.resolveRequires(content, circularAPath),
                CircularDependencyError
            );
        } finally {
            // done
        }
    });

    it('handles missing files gracefully', async () => {
        const missing = `//= require 'non-existent-file'`;
        await assertRejects(
            async () => await resolver.resolveRequires(missing, 'test.scss'),
            FileNotFoundError
        );
    });
});
