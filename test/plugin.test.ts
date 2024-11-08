/**
 * @file: .vite/plugins/sprockets-scss/test/plugin.test.ts
 * @description: Plugin test suite
 */

import { describe, expect, test, beforeAll, afterEach } from "bun:test";
import { readFile, mkdir, writeFile, rename } from "fs/promises";
import path from "path";
import { FileManager } from "../src/core/file-manager";
import { ScssCompiler } from "../src/core/compiler";
import { SprocketsResolver } from "../src/core/resolver";
import { createLogger } from "../src/utils/logger";
import { resolveOptions } from "../src/config/options";
import { ResolvedOptions } from "../src/types";
import { CircularDependencyError } from "../src/utils/errors";
import { FileNotFoundError } from "../src/utils/errors";
import { PerformanceMonitor } from "../src/utils/performance";
import { TEST_DIRS, EXAMPLE_APP_DIRS } from './setup'
import { promises as fs } from 'fs';

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
            await fs.mkdir(dir, { recursive: true });
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
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            // only write file if it doesn't exist
            if (!(await fs.access(fullPath).then(() => true).catch(() => false))) {
                await fs.writeFile(fullPath, content);
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

    test('processes basic SCSS file', async () => {
        performance.start();
        const basic = await readFile(path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss'), 'utf-8');
        const result = await compiler.compile(basic, 'basic.scss');

        expect(result.errors).toHaveLength(0);
        expect(result.css).toContain('.test-component');
        expect(result.css).toContain('background:');
        expect(performance.getDuration()).toBeLessThan(5000);
    });

    test('processes require directives', async () => {
        const withRequires = await readFile(
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss'),
            'utf-8'
        );

        const resolvedContent = await resolver.resolveRequires(
            withRequires,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );
        const normalizedDeps = resolvedContent.dependencies.map((d: string) => path.basename(d));

        expect(resolvedContent.content).toContain('$primary-color');
        expect(resolvedContent.content).toContain('@mixin center');
        expect(normalizedDeps).toContain('_variables.scss');
        expect(normalizedDeps).toContain('_mixins.scss');
    });

    test('handles require_tree directive', async () => {
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
        expect(resolvedContent.content).toContain('.header');
        expect(resolvedContent.content).toContain('.footer');
    });

    test('respects file ordering', async () => {
        const withRequires = await readFile(
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss'),
            'utf-8'
        );

        const resolvedContent = await resolver.resolveRequires(
            withRequires,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'with-requires.scss')
        );
        const content = resolvedContent.content;

        const variablesIndex = content.indexOf('$primary-color');
        const mainIndex = content.indexOf('.main');

        expect(variablesIndex).toBeLessThan(mainIndex);
    });

    test('handles file mapping with SCSS fallback', async () => {
        const libDir = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib');
        await fs.mkdir(libDir, { recursive: true });

        if (!(await fs.access(path.join(libDir, 'select2.scss')).then(() => true).catch(() => false))) {
            await fs.writeFile(
                path.join(libDir, 'select2.scss'),
                '.select2-container { display: block; }'
            );
        }

        // First test with CSS file present
        const resolvedCssPath = resolver.findFileInPaths('select2', EXAMPLE_APP_DIRS.ROOT);
        expect(resolvedCssPath).not.toBeNull();
        expect(path.basename(resolvedCssPath!)).toBe('select2.scss');

        // Test SCSS fallback
        const originalPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.css');
        const backupPath = originalPath + '.bak';

        try {
            await rename(originalPath, backupPath);

            const resolvedScssPath = resolver.findFileInPaths('select2', EXAMPLE_APP_DIRS.ROOT);
            expect(resolvedScssPath).not.toBeNull();
            expect(resolvedScssPath).toContain('select2.scss');

            // Verify the content is loaded correctly
            if (resolvedScssPath) {
                const content = await fileManager.readFile(resolvedScssPath);
                expect(content).toContain('select2-container');
            }
        } finally {
            try {
                await rename(backupPath, originalPath);
            } catch {
                // Ignore if backup didn't exist
            }
        }
    });

    test('handles file mapping with includePaths fallback', async () => {
        const vendorPath = path.join(EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS, 'lib/select2.scss');
        await fs.mkdir(path.dirname(vendorPath), { recursive: true });  
        if (!(await fs.access(vendorPath).then(() => true).catch(() => false))) {
            await fs.writeFile(vendorPath, '.select2-vendor { display: block; }');
        }

        const originalPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.css');
        const scssPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/select2.scss');

        try {
            // Remove original files if they exist
            await fs.rm(originalPath, { force: true });
            await fs.rm(scssPath, { force: true });

            // Test resolution from include path
            const resolvedPath = resolver.findFileInPaths('select2', EXAMPLE_APP_DIRS.ROOT);
            expect(resolvedPath).not.toBeNull();
            expect(resolvedPath).toContain('vendor/assets/stylesheets/lib/select2.scss');

            // Verify content
            if (resolvedPath) {
                const content = await fileManager.readFile(resolvedPath);
                expect(content).toContain('select2-vendor');
            }
        } finally {
            await fs.rm(vendorPath, { force: true }).catch(() => {});
        }
    });

    test('handles aliases', async () => {
        const aliasPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'lib/component.scss');
        await fs.mkdir(path.dirname(aliasPath), { recursive: true });
        if (!(await fs.access(aliasPath).then(() => true).catch(() => false))) {
            await fs.writeFile(aliasPath, '.component { color: blue; }');
        }

        try {
            const resolvedPath = await resolver.resolveImportPath('~lib/component', EXAMPLE_APP_DIRS.ROOT, EXAMPLE_APP_DIRS.ROOT);
            if (!resolvedPath) {
                throw new Error('Failed to resolve import path');
            }

            expect(resolvedPath).not.toBeNull();
            expect(path.normalize(resolvedPath)).toContain('app/assets/stylesheets/lib/component');
        } finally {
            // done
        }
    });

    test('handles partial files correctly', () => {
        expect(fileManager.isPartial('_variables.scss')).toBe(true);
        expect(fileManager.isPartial('main.scss')).toBe(false);
    });

    test('compiles SCSS with source maps', async () => {
        const basic = await readFile(path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'basic.scss'), 'utf-8');
        const result = await compiler.compile(basic, 'basic.scss');

        expect(result.map).toBeDefined();
        expect(JSON.parse(result.map!)).toHaveProperty('version', 3);
    });

    test('handles circular dependencies', async () => {
        const circularAPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'circular-a.scss');
        const circularBPath = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'circular-b.scss');

        // Create test files with minimal whitespace
        if (!(await fs.access(circularAPath).then(() => true).catch(() => false))) {
            await fs.writeFile(circularAPath, '// = require "circular-b"\n.circular-a { color: red; }');
        }
        if (!(await fs.access(circularBPath).then(() => true).catch(() => false))) {
            await fs.writeFile(circularBPath, '// = require "circular-a"\n.circular-b { color: blue; }');
        }

        try {
            const content = await fs.readFile(circularAPath, 'utf-8');
            const promise = resolver.resolveRequires(content, circularAPath);
            await expect(promise).rejects.toThrow(CircularDependencyError);
        } finally {
            // done
        }
    });

    test('handles missing files gracefully', async () => {
        const missing = `//= require 'non-existent-file'`;
        const promise = resolver.resolveRequires(missing, 'test.scss');
        await expect(promise).rejects.toThrow(FileNotFoundError);
    });
});
