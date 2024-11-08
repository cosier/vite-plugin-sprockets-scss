/**
 * @file: .vite/plugins/sprockets-scss/utils/logger.ts
 * @description: Logging and debugging utilities
 */

export class Logger {
    private isDebug: boolean
    private prefix: string = '[Sprockets-SCSS]'
    private depth: number = 0

    constructor(debug: boolean = false) {
        this.isDebug = debug
    }

    setDepth(depth: number): void {
        this.depth = depth
    }

    private getIndent(): string {
        return '  '.repeat(this.depth)
    }

    info(message: string, ...args: any[]): void {
        console.log(`${this.prefix} ${this.getIndent()}${message}`, ...args)
    }

    error(message: string, error?: Error): void {
        console.error(
            `${this.prefix} Error: ${this.getIndent()}${message}`,
            error || '',
            error?.message,
            error?.stack
        )
        if (error?.stack) {
            console.error(`${this.prefix} Stack:`, error.stack)
        }
    }

    warn(message: string, ...args: any[]): void {
        console.warn(
            `${this.prefix} Warning: ${this.getIndent()}${message}`,
            ...args
        )
    }

    debug(message: string, ...args: any[]): void {
        if (this.isDebug) {
            console.debug(
                `${this.prefix} Debug: ${this.getIndent()}${message}`,
                ...args
            )
        }
    }

    trace(message: string, ...args: any[]): void {
        if (this.isDebug) {
            console.log(
                `${this.prefix} Trace: ${this.getIndent()}${message}`,
                ...args
            )
        }
    }

    group(label: string): void {
        if (this.isDebug) {
            console.group(`${this.prefix} ${label}`)
            this.depth++
        }
    }

    groupEnd(): void {
        if (this.isDebug) {
            console.groupEnd()
            this.depth = Math.max(0, this.depth - 1)
        }
    }
}

export const createLogger = (debug: boolean = false): Logger => {
    return new Logger(debug)
}
