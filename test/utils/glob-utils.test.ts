// test/utils/glob-utils.test.ts
import { describe, expect, test } from 'bun:test'
import {
    findFiles,
    createIgnorePatterns,
    matchGlobPattern,
    normalizeGlobPatterns,
} from '../../src/utils/glob-utils'
import { promises as fs } from 'fs'
import path from 'path'
import { TEST_DIRS } from '../setup'

describe('Glob Utilities', () => {
    const testDir = path.join(TEST_DIRS.TMP, 'glob-test')

    test('findFiles finds matching files', async () => {
        // Setup test directory
        await fs.mkdir(path.join(testDir, 'nested'), { recursive: true })
        if (!(await fs.access(path.join(testDir, 'test1.scss')).then(() => true).catch(() => false))) { 
            await fs.writeFile(path.join(testDir, 'test1.scss'), '')
        }
        if (!(await fs.access(path.join(testDir, 'nested/test2.scss')).then(() => true).catch(() => false))) {
            await fs.writeFile(path.join(testDir, 'nested/test2.scss'), '')
        }

        const files = await findFiles('**/*.scss', { cwd: testDir })
        expect(files).toHaveLength(2)
        expect(files).toContain('test1.scss')
        expect(files).toContain('nested/test2.scss')
    })

    test('createIgnorePatterns formats patterns correctly', () => {
        const patterns = ['*.scss', 'nested/*.css']
        const ignored = createIgnorePatterns(patterns)

        expect(ignored).toHaveLength(2)
        expect(ignored[0]).toBe('!*.scss')
        expect(ignored[1]).toBe('!nested/*.css')
    })

    test('matchGlobPattern matches patterns correctly', () => {
        expect(matchGlobPattern('*.scss', 'test.scss')).toBe(true)
        expect(matchGlobPattern('nested/*.scss', 'nested/test.scss')).toBe(true)
        expect(matchGlobPattern('*.scss', 'test.css')).toBe(false)
    })

    test('normalizeGlobPatterns handles different input types', () => {
        expect(normalizeGlobPatterns('test/*.scss')).toEqual(['test/*.scss'])
        expect(normalizeGlobPatterns(['*.scss', '*.css'])).toEqual([
            '*.scss',
            '*.css',
        ])
        expect(normalizeGlobPatterns('test\\*.scss')).toEqual(['test/*.scss'])
    })
})
