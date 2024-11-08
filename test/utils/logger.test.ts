// test/utils/logger.test.ts
import { assertEquals, assertInstanceOf, assertStringIncludes } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { Logger, createLogger } from "~/utils/logger.ts";

// Add state variables
let consoleLogs: string[] = [];
let consoleErrors: string[] = [];
let consoleWarns: string[] = [];
let consoleDebugs: string[] = [];
let consoleGroups: string[] = [];
let groupDepth = 0;

// Create a proper Console mock with all required methods
const mockConsole = {
  log: (msg: string) => consoleLogs.push(msg),
  error: (msg: string) => consoleErrors.push(msg),
  warn: (msg: string) => consoleWarns.push(msg),
  debug: (msg: string) => consoleDebugs.push(msg),
  info: (msg: string) => consoleLogs.push(msg),
  group: (label: string) => {
    consoleGroups.push(label);
    groupDepth++;
  },
  groupEnd: () => {
    groupDepth = Math.max(0, groupDepth - 1);
  },
  groupCollapsed: () => {},
  assert: () => {},
  clear: () => {},
  count: () => {},
  countReset: () => {},
  dir: () => {},
  dirxml: () => {},
  table: () => {},
  time: () => {},
  timeEnd: () => {},
  timeLog: () => {},
  trace: () => {},
  profile: () => {},
  profileEnd: () => {},
  timeStamp: () => {},
} as unknown as Console;

beforeEach(() => {
  // Reset state
  consoleLogs = [];
  consoleErrors = [];
  consoleWarns = [];
  consoleDebugs = [];
  consoleGroups = [];
  groupDepth = 0;
  
  // Set mock console
  globalThis.console = mockConsole;
});

describe('Logger', () => {
    it('creates logger with debug mode', () => {
        const logger = createLogger(true);
        assertInstanceOf(logger, Logger);
    });

    it('logs info messages with proper prefix', () => {
        const logger = new Logger(true);
        logger.info('Test message');
        assertStringIncludes(consoleLogs[0], '[Sprockets-SCSS]');
        assertStringIncludes(consoleLogs[0], 'Test message');
    });

    it('logs error messages with stack trace', () => {
        const logger = new Logger(true);
        const error = new Error('Test error');
        logger.error(error);
        assertStringIncludes(consoleErrors[0], 'Test error');
    });

    it('logs warning messages with prefix', () => {
        const logger = new Logger(true);
        logger.warn('Warning message');
        assertStringIncludes(consoleWarns[0], 'Warning:');
        assertStringIncludes(consoleWarns[0], 'Warning message');
    });

    it('respects debug mode setting', () => {
        const debugLogger = new Logger(true);
        const nonDebugLogger = new Logger(false);

        debugLogger.debug('Debug message');
        assertEquals(consoleDebugs.length, 1);

        nonDebugLogger.debug('Should not appear');
        assertEquals(consoleDebugs.length, 1);
    });

    it('handles trace messages in debug mode', () => {
        const logger = new Logger(true);
        logger.trace('Trace message');
        assertStringIncludes(consoleLogs[0], 'Trace:');
        assertStringIncludes(consoleLogs[0], 'Trace message');
    });

    it('manages group depth correctly', () => {
        const logger = new Logger(true);

        logger.info('Base level');
        logger.group('Group 1');
        logger.info('Level 1');
        logger.group('Group 2');
        logger.info('Level 2');
        logger.groupEnd();
        logger.info('Back to Level 1');
        logger.groupEnd();

        assertEquals(groupDepth, 0);
        assertEquals(consoleGroups.length, 2);
    });

    it('ignores groups when debug is false', () => {
        const logger = new Logger(false);
        logger.group('Should not appear');
        logger.info('Test message');
        logger.groupEnd();

        assertEquals(consoleGroups.length, 0);
    });
});
