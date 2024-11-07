import { ResolvedOptions } from '../../src/types'
import { Logger } from '../../src/utils/logger'
import { FileManager } from '../../src/core/file-manager'
import { ScssCompiler } from '../../src/core/compiler'
import { SprocketsResolver } from '../../src/core/resolver'

export interface TestContext {
    options: ResolvedOptions;
    logger: Logger;
    fileManager: FileManager;
    compiler: ScssCompiler;
    resolver: SprocketsResolver;
}

export interface TestDirs {
    FIXTURES: string;
    OUTPUT: string;
    CACHE: string;
} 