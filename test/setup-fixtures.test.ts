// test/setup-fixtures.test.ts
import { describe, expect, test } from 'bun:test'
import { setupFixtures } from './setup-fixtures'
import { promises as fs } from 'fs'
import path from 'path'
import { TEST_DIRS } from './setup'

describe('Setup Fixtures', () => {
    test('creates all required directories', async () => {
        await setupFixtures()

        const dirs = [
            'app/assets/stylesheets/components',
            'vendor/assets/stylesheets',
            'node_modules/bootstrap/scss',
        ]

        for (const dir of dirs) {
            const fullPath = path.join(TEST_DIRS.FIXTURES, 'rails', dir)
            const exists = await fs
                .stat(fullPath)
                .then((stats) => stats.isDirectory())
                .catch(() => false)

            expect(exists).toBe(true)
        }
    })

    test('creates all required files with correct content', async () => {
        await setupFixtures()

        const files = [
            'app/assets/stylesheets/application.scss',
            'app/assets/stylesheets/_variables.scss',
            'app/assets/stylesheets/_shared.scss',
            'vendor/assets/stylesheets/_shared.scss',
            'app/assets/stylesheets/components/_header.scss',
        ]

        for (const file of files) {
            const fullPath = path.join(TEST_DIRS.FIXTURES, 'rails', file)
            const exists = await fs
                .stat(fullPath)
                .then((stats) => stats.isFile())
                .catch(() => false)

            expect(exists).toBe(true)
        }
    })

    test('cleanup works correctly', async () => {
        await setupFixtures()
        const railsRoot = path.join(TEST_DIRS.FIXTURES, 'rails')

        // Run setup again (should clean up first)
        await setupFixtures()

        const exists = await fs
            .stat(railsRoot)
            .then((stats) => stats.isDirectory())
            .catch(() => false)

        expect(exists).toBe(true)
    })
})
