import { describe, expect, test, beforeAll } from 'bun:test'
import path from 'path'
import { promises as fs } from 'fs'
import { createTestContext } from './helpers/context'
import { EXAMPLE_APP_DIRS } from './setup'

describe('Rails Path Resolution', () => {
    const { resolver } = createTestContext()

    beforeAll(async () => {
        // Create test files
        const files = {
            'app/assets/stylesheets/application.scss': `
                // = require '_variables'
                // = require '_shared'
                // = require_tree './components'
            `,
            'app/assets/stylesheets/_variables.scss': `
                $primary-color: #ff7700;
                $font-family-base: 'myriad-pro', sans-serif;
            `,
            'app/assets/stylesheets/_shared.scss': `
                @import '_variables';
                .app-shared { color: blue; }
            `,
            'vendor/assets/stylesheets/_shared.scss': '.vendor-shared { color: red; }',
            'app/assets/stylesheets/components/_header.scss': '.header { color: $primary-color; }'
        }

        for (const [filePath, content] of Object.entries(files)) {
            const fullPath = path.join(EXAMPLE_APP_DIRS.ROOT, filePath)
            await fs.mkdir(path.dirname(fullPath), { recursive: true })
            if (!(await fs.access(fullPath).then(() => true).catch(() => false))) {
                await fs.writeFile(fullPath, content.trim())
            }
        }
    })

    test('resolves application.scss with all dependencies', async () => {
        const applicationScss = path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'application.scss')
        const content = await fs.readFile(applicationScss, 'utf-8')

        const result = await resolver.resolveRequires(content, applicationScss)

        expect(result.content).toContain('primary-color')
        expect(result.content).toContain('header')
        expect(result.dependencies.length).toBeGreaterThan(0)
    })

    test('prefers app/assets over vendor/assets', async () => {
        const content = `// = require '_shared'`
        const result = await resolver.resolveRequires(
            content,
            path.join(EXAMPLE_APP_DIRS.ASSETS.STYLESHEETS, 'test.scss')
        )

        expect(result.content).toContain('app-shared')
        expect(result.content).not.toContain('vendor-shared')
    })
})
