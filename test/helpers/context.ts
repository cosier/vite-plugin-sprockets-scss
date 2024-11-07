import path from 'path'
import { FileManager } from "../../src/core/file-manager"
import { ScssCompiler } from "../../src/core/compiler"
import { SprocketsResolver } from "../../src/core/resolver"
import { createLogger } from "../../src/utils/logger"
import { resolveOptions } from "../../src/config/options"
import { TestContext } from '../types'
import { TEST_DIRS, EXAMPLE_APP_DIRS } from '../setup'

export function createTestContext(): TestContext {
    const options = resolveOptions({
        root: EXAMPLE_APP_DIRS.ROOT,
        debug: true,
        includePaths: [
            EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS,
            EXAMPLE_APP_DIRS.VENDOR.STYLESHEETS,
            path.join(EXAMPLE_APP_DIRS.NODE_MODULES, 'bootstrap/scss'),
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
