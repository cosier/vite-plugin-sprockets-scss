import { mkdir } from 'fs/promises'
import path from 'path'
import { TestDirs } from '../types'

export const TEST_DIRS: TestDirs = {
    FIXTURES: path.join(process.cwd(), 'test', 'fixtures', 'scss'),
    OUTPUT: path.join(process.cwd(), 'tmp', 'test-output'),
    CACHE: path.join(process.cwd(), 'tmp', 'test-cache')
}

// Initialize test directories
export async function initTestDirs() {
    // Ensure all required test directories exist
    for (const dir of Object.values(TEST_DIRS)) {
        await mkdir(dir, { recursive: true })
    }

    // Ensure fixtures subdirectories exist
    const fixturesDirs = [
        'components',
        'lib',
        'vendor/lib'
    ].map(d => path.join(TEST_DIRS.FIXTURES, d))

    for (const dir of fixturesDirs) {
        await mkdir(dir, { recursive: true })
    }
} 