// test/utils/logger.test.ts
import { describe, expect, test, beforeEach } from 'bun:test'
import { Logger, createLogger } from '../../src/utils/logger'

describe('Logger', () => {
    let consoleLogs: string[] = []
    let consoleErrors: string[] = []
    let consoleWarns: string[] = []
    let consoleDebugs: string[] = []
    let consoleGroups: string[] = []
    let groupDepth = 0

    beforeEach(() => {
        consoleLogs = []
        consoleErrors = []
        consoleWarns = []
        consoleDebugs = []
        consoleGroups = []
        groupDepth = 0

        global.console = {
            log: (msg: string) => consoleLogs.push(msg),
            error: (msg: string) => consoleErrors.push(msg),
            warn: (msg: string) => consoleWarns.push(msg),
            debug: (msg: string) => consoleDebugs.push(msg),
            group: (label: string) => {
                consoleGroups.push(label)
                groupDepth++
            },
            groupEnd: () => {
                groupDepth = Math.max(0, groupDepth - 1)
            },
        } as Console
    })

    test('creates logger with debug mode', () => {
        const logger = createLogger(true)
        expect(logger).toBeInstanceOf(Logger)
    })

    test('logs info messages with proper prefix', () => {
        const logger = new Logger(true)
        logger.info('Test message')
        expect(consoleLogs[0]).toContain('[Sprockets-SCSS]')
        expect(consoleLogs[0]).toContain('Test message')
    })

    test('logs error messages with stack trace', () => {
        const logger = new Logger(true)
        const error = new Error('Test error')
        logger.error('Error occurred', error)
        expect(consoleErrors[0]).toContain('Error occurred')
        expect(consoleErrors[1]).toContain('Stack:')
    })

    test('logs warning messages with prefix', () => {
        const logger = new Logger(true)
        logger.warn('Warning message')
        expect(consoleWarns[0]).toContain('Warning:')
        expect(consoleWarns[0]).toContain('Warning message')
    })

    test('respects debug mode setting', () => {
        const debugLogger = new Logger(true)
        const nonDebugLogger = new Logger(false)

        debugLogger.debug('Debug message')
        expect(consoleDebugs).toHaveLength(1)

        nonDebugLogger.debug('Should not appear')
        expect(consoleDebugs).toHaveLength(1)
    })

    test('handles trace messages in debug mode', () => {
        const logger = new Logger(true)
        logger.trace('Trace message')
        expect(consoleLogs[0]).toContain('Trace:')
        expect(consoleLogs[0]).toContain('Trace message')
    })

    test('manages group depth correctly', () => {
        const logger = new Logger(true)

        logger.info('Base level')
        logger.group('Group 1')
        logger.info('Level 1')
        logger.group('Group 2')
        logger.info('Level 2')
        logger.groupEnd()
        logger.info('Back to Level 1')
        logger.groupEnd()

        expect(groupDepth).toBe(0)
        expect(consoleGroups).toHaveLength(2)
    })

    test('ignores groups when debug is false', () => {
        const logger = new Logger(false)
        logger.group('Should not appear')
        logger.info('Test message')
        logger.groupEnd()

        expect(consoleGroups).toHaveLength(0)
    })
})
