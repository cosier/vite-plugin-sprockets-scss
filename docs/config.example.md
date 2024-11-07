# vite.config.ts

```ts
// vite.config.ts
import type { UserConfig } from 'vite'
import { resolve } from 'path'
import viteSprocketsScss from './.vite/plugins/sprockets-scss'

const gitRevision =
    process.env.GIT_REVISION ||
    require('child_process')
        .execSync('git rev-parse --short HEAD')
        .toString()
        .trim()
const buildDate = new Date().toISOString().split('T')[0]
const outDir = `public/assets/vt/${buildDate}/${gitRevision}`

// Define SCSS entry groups based on your file structure
const scssEntryGroups = {
    application: ['application.scss'],
    admin: ['admin/**/*.scss', 'admin.scss'],
    judging: ['judging/**/*.scss', 'judging.scss'],
    components: ['components/**/*.scss'],
    competitions: ['competitions/**/*.scss'],
}

// Define file mappings with wildcard support
const scssFileMapping = {
    select2: 'app/assets/stylesheets/lib/select2.css',
    'select2-*': 'app/assets/stylesheets/lib/select2/*.css',
    'jquery-ui/*': 'vendor/jquery-ui/themes/base/*.css',
    'bootstrap/**': 'node_modules/bootstrap/scss/**/*.scss',
}

// Define aliases for common paths
const scssAliases = {
    '~vendor': 'vendor/assets/stylesheets',
    '~lib': 'app/assets/stylesheets/lib',
    '~components': 'app/assets/stylesheets/components',
}

const config: UserConfig = {
    root: 'app/typescript',
    plugins: [
        viteSprocketsScss({
            root: process.cwd(),
            includePaths: ['./app/assets/stylesheets', './node_modules'],
            entryGroups: scssEntryGroups,
            outputPath: `${outDir}/sprockets`,
            fileMapping: scssFileMapping,
            aliases: scssAliases,
            debug: process.env.DEBUG === 'true', // Enable debug logging with DEBUG=true
        }),
    ],
    build: {
        outDir: resolve(__dirname, outDir),
        emptyOutDir: true,
        manifest: true,
        rollupOptions: {
            input: {
                core: resolve(__dirname, 'app/typescript/entrypoints/core.ts'),
                main: resolve(__dirname, 'app/typescript/entrypoints/main.ts'),
                uploader: resolve(
                    __dirname,
                    'app/typescript/entrypoints/uploader.ts'
                ),
                // Add other entrypoints
            },
        },
    },
    server: {
        origin: 'http://localhost:3000',
    },
}

export default config
```
