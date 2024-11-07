/**
 * @file: .vite/plugins/sprockets-scss/core/file-manager.ts
 * @description: File system operations and management
 */

import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { ProcessedFile, ResolvedOptions } from '../types'
import { Logger } from '../utils/logger'
import { OUTPUT_DIRS } from '../config/defaults'

export class FileManager {
    private logger: Logger
    private options: ResolvedOptions
    private fileCache: Map<string, string>

    constructor(options: ResolvedOptions, logger: Logger) {
        this.options = options
        this.logger = logger
        this.fileCache = new Map()
    }

    async readFile(filePath: string): Promise<string> {
        try {
            // Check cache first
            if (this.fileCache.has(filePath)) {
                this.logger.debug(`Cache hit: ${filePath}`)
                return this.fileCache.get(filePath)!
            }

            const content = await fs.readFile(filePath, 'utf-8')
            this.fileCache.set(filePath, content)
            return content
        } catch (error) {
            this.logger.error(
                `Failed to read file: ${filePath}`,
                error as Error
            )
            throw error
        }
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true })
            await fs.writeFile(filePath, content)
            this.logger.debug(`Written file: ${filePath}`)
        } catch (error) {
            this.logger.error(
                `Failed to write file: ${filePath}`,
                error as Error
            )
            throw error
        }
    }

    async ensureOutputDirectories(): Promise<void> {
        const dirs = Object.values(OUTPUT_DIRS).map((dir) =>
            path.join(this.options.outputPath, dir)
        )

        for (const dir of dirs) {
            if (!existsSync(dir)) {
                await fs.mkdir(dir, { recursive: true })
                this.logger.debug(`Created directory: ${dir}`)
            }
        }
    }

    getOutputPath(fileName: string, isGroup: boolean = false): string {
        const dir = isGroup ? OUTPUT_DIRS.group : OUTPUT_DIRS.single
        return path.join(
            this.options.outputPath,
            dir,
            fileName.replace(/\.s[ac]ss$/, '.css')
        )
    }

    async writeProcessedFile(
        processedFile: ProcessedFile,
        isGroup: boolean = false
    ): Promise<void> {
        const outputPath = this.getOutputPath(processedFile.path, isGroup)
        await this.writeFile(outputPath, processedFile.content)
    }

    async cleanup(): Promise<void> {
        try {
            await fs.rm(this.options.outputPath, {
                recursive: true,
                force: true,
            })
            this.logger.debug(
                `Cleaned up output directory: ${this.options.outputPath}`
            )
        } catch (error) {
            this.logger.error(
                'Failed to cleanup output directory',
                error as Error
            )
        }
        this.clearCache()
    }

    clearCache(): void {
        this.fileCache.clear()
        this.logger.debug('Cleared file cache')
    }

    isPartial(filePath: string): boolean {
        return path.basename(filePath).startsWith('_')
    }

    shouldProcessFile(filePath: string): boolean {
        return !this.options.ignorePartials || !this.isPartial(filePath)
    }
}
