import * as path from "@std/path";
import { FileManager } from "~/core/file-manager.ts";
import { ScssCompiler } from "~/core/compiler.ts";
import { SprocketsResolver } from "~/core/resolver.ts";
import { createLogger } from "~/utils/logger.ts";
import { resolveOptions } from "~/config/options.ts";
import type { TestContext } from "~/test/types/index.ts";
import { TEST_DIRS, EXAMPLE_APP_DIRS } from "~/test/setup.ts";

export function createTestContext({
    globalMixins = [],
    debug = true
}: {
    globalMixins?: string[],
    debug?: boolean
}): TestContext {
    const options = resolveOptions({
        root: EXAMPLE_APP_DIRS.ROOT,
        debug: debug,
        includePaths: [
            EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS,
            EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS,
            path.join(EXAMPLE_APP_DIRS.NODE_MODULES, 'bootstrap/scss'),
            ...(globalMixins || [])
        ],
        entryGroups: {
            application: ['application.scss'],
            admin: ['admin/**/*.scss'],
            components: ['components/**/*.scss']
        },
        fileMapping: {
            'select2': 'lib/select2.css',
            'jquery-ui/*': path.join('vendor/jquery-ui/themes/base/*.css'),
            'bootstrap/**': path.join('node_modules/bootstrap/scss/**/*.scss')
        },
        aliases: {
            '~lib': 'app/assets/stylesheets/lib',
            '~vendor': 'vendor/assets/stylesheets',
            '~components': 'app/assets/stylesheets/components'
        },
        outputPath: path.join(TEST_DIRS.OUTPUT, 'assets')
    })

    const logger = createLogger(true)
    const fileManager = new FileManager(options, logger)
    const compiler = new ScssCompiler(options, logger)
    const resolver = new SprocketsResolver(options, logger, fileManager)

    return {
        options,
        logger,
        fileManager,
        compiler,
        resolver
    }
}
