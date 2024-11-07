/**
 * @file: .vite/plugins/sprockets-scss/test/integration.test.ts
 */

import { describe, expect, test } from "bun:test";
import viteSprocketsScss from "../src";
import path from "path";
import { readFile } from "fs/promises";
import { TEST_DIRS } from "./setup";

describe('Plugin Integration', () => {
    test('processes complete stylesheet with real-world patterns', async () => {
        const plugin = viteSprocketsScss({
            root: TEST_DIRS.EXAMPLE_APP,
            includePaths: ['app/assets/stylesheets'],
            entryGroups: {
                application: ['application.scss'],
                admin: ['admin/**/*.scss'],
                judging: ['judging/**/*.scss']
            },
            fileMapping: {
                'select2': 'app/assets/stylesheets/lib/select2.css',
                'jquery-ui/*': 'vendor/jquery-ui/themes/base/*.css'
            },
            aliases: {
                '~vendor': 'vendor/assets/stylesheets',
                '~lib': 'app/assets/stylesheets/lib'
            },
            debug: true
        });

        // Configure plugin
        await plugin.configResolved?.();

        // Test plugin hooks
        expect(plugin.name).toBe('vite-plugin-sprockets-scss');
        expect(typeof plugin.buildStart).toBe('function');
    });

    test('handles real-world SCSS patterns', async () => {
        const scss = `
            //= require jquery-ui/resizable
            //= require bootstrap_and_overrides
            //= require common

            .article-wrapper {
                color: #333;
                margin: 40px auto 0;
                position: relative;

                .article-title {
                    margin: 30px auto;

                    h1 {
                        color: #333;
                        font-family: 'myriad-pro', sans-serif;
                        font-size: 28px;
                        line-height: 36px;
                        margin-bottom: 15px;
                    }
                }
            }
        `;

        const plugin = viteSprocketsScss({
            root: TEST_DIRS.EXAMPLE_APP,
            debug: true
        });

        // Configure plugin before testing
        await plugin.configResolved?.();

        // Now buildStart should work
        await plugin.buildStart?.();
    });
});
