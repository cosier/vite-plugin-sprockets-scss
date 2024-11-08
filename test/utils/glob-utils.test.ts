// test/utils/glob-utils.test.ts
import { assertEquals, assertArrayIncludes } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as path from "@std/path";
import { 
  findFiles,
  createIgnorePatterns,
  matchGlobPattern,
  normalizeGlobPatterns 
} from "~/utils/glob-utils.ts";
import { TEST_DIRS } from '../setup.ts'

describe('Glob Utilities', () => {
    const testDir = path.join(TEST_DIRS.TMP, 'glob-test')

    it('findFiles finds matching files', async () => {
        // Setup test directory
        await Deno.mkdir(path.join(testDir, 'nested'), { recursive: true })
        try {
            await Deno.stat(path.join(testDir, 'test1.scss'))
        } catch {
            await Deno.writeTextFile(path.join(testDir, 'test1.scss'), '')
        }
        try {
            await Deno.stat(path.join(testDir, 'nested/test2.scss'))
        } catch {
            await Deno.writeTextFile(path.join(testDir, 'nested/test2.scss'), '')
        }

        const files = await findFiles('**/*.scss', { cwd: testDir })
        assertEquals(files.length, 2)
        assertArrayIncludes(files, ['test1.scss'])
        assertArrayIncludes(files, ['nested/test2.scss'])
    })

    it('createIgnorePatterns formats patterns correctly', () => {
        const patterns = ['*.scss', 'nested/*.css']
        const ignored = createIgnorePatterns(patterns)

        assertEquals(ignored.length, 2)
        assertEquals(ignored[0], '!*.scss')
        assertEquals(ignored[1], '!nested/*.css')
    })

    it('matchGlobPattern matches patterns correctly', () => {
        assertEquals(matchGlobPattern('*.scss', 'test.scss'), true)
        assertEquals(matchGlobPattern('nested/*.scss', 'nested/test.scss'), true)
        assertEquals(matchGlobPattern('*.scss', 'test.css'), false)
    })

    it('normalizeGlobPatterns handles different input types', () => {
        assertEquals(normalizeGlobPatterns('test/*.scss'), ['test/*.scss'])
        assertEquals(normalizeGlobPatterns(['*.scss', '*.css']), [
            '*.scss',
            '*.css',
        ])
        assertEquals(normalizeGlobPatterns('test\\*.scss'), ['test/*.scss'])
    })
})
