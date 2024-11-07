# Vite Plugin: Sprockets SCSS

**Vite plugin to seamlessly integrate SCSS stylesheets with Sprockets-like `require` and `require_tree` directives, facilitating migration from Rails Sprockets to Vite.**

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Plugin Configuration](#plugin-configuration)
  - [Example Vite Configuration](#example-vite-configuration)
- [SCSS Directives](#scss-directives)
  - [Handling `require`](#handling-require)
  - [Handling `require_tree`](#handling-require_tree)
- [Alias and File Mapping](#alias-and-file-mapping)
- [CLI Commands](#cli-commands)
- [Development](#development)
- [Testing](#testing)
- [Known Issues](#known-issues)
- [Contributing](#contributing)
- [License](#license)

---

## Introduction

This plugin aims to simplify the transition from **Rails Sprockets** to **Vite** by providing a way to handle SCSS files that use Sprockets-specific directives like `require` and `require_tree`. It processes SCSS files, resolves dependencies, and compiles them, maintaining the inclusion order and patterns familiar from Sprockets.

## Features

- **Support for `require` and `require_tree` directives** in SCSS files.
- **Alias and file mapping** capabilities to resolve paths.
- **Caching and efficient file management** to optimize build times.
- **Configurable options** to customize plugin behavior.
- **Detailed logging** with debug modes for easier troubleshooting.
- **Seamless integration with Vite** and works with latest versions.

## Installation

Assuming you have a Vite project set up, you can install the plugin via Yarn or NPM:

```bash
# Using Yarn
yarn add -D vite-plugin-sprockets-scss

# Using NPM
npm install --save-dev vite-plugin-sprockets-scss
```

> **Note:** Since you mentioned you use Bun, ensure that you link the plugin correctly if you're developing it locally.

## Usage

### Plugin Configuration

You need to add the plugin to your Vite configuration file (`vite.config.ts` or `vite.config.js`):

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import viteSprocketsScss from 'vite-plugin-sprockets-scss'

export default defineConfig({
  plugins: [
    viteSprocketsScss({
      root: process.cwd(),
      includePaths: ['./app/assets/stylesheets', './node_modules'],
      entryGroups: {
        application: ['application.scss'],
        admin: ['admin/**/*.scss', 'admin.scss'],
        // Add other entry groups as needed
      },
      outputPath: 'public/assets/vt/sprockets',
      fileMapping: {
        'select2': 'app/assets/stylesheets/lib/select2.css',
        'select2-*': 'app/assets/stylesheets/lib/select2/*.css',
        'jquery-ui/*': 'vendor/jquery-ui/themes/base/*.css',
        'bootstrap/**': 'node_modules/bootstrap/scss/**/*.scss',
      },
      aliases: {
        '~vendor': 'vendor/assets/stylesheets',
        '~lib': 'app/assets/stylesheets/lib',
        '~components': 'app/assets/stylesheets/components',
      },
      debug: false, // Set to true to enable debug logging
      ignorePartials: true, // Whether to ignore partials (files starting with _)
    }),
  ],
})
```

### Example Vite Configuration

Here's a more detailed example incorporating the plugin into your existing `vite.config.ts`:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import viteSprocketsScss from 'vite-plugin-sprockets-scss'
import path from 'path'

export default defineConfig({
  root: 'app/typescript',
  plugins: [
    viteSprocketsScss({
      root: process.cwd(),
      includePaths: ['./app/assets/stylesheets', './node_modules'],
      entryGroups: {
        application: ['application.scss'],
        admin: ['admin/**/*.scss', 'admin.scss'],
        components: ['components/**/*.scss'],
        // Add other groups as needed
      },
      outputPath: 'public/assets/vt/sprockets',
      fileMapping: {
        'select2': 'app/assets/stylesheets/lib/select2.css',
        'bootstrap/**': 'node_modules/bootstrap/scss/**/*.scss',
        // Add other mappings as needed
      },
      aliases: {
        '~vendor': 'vendor/assets/stylesheets',
        '~lib': 'app/assets/stylesheets/lib',
        '~components': 'app/assets/stylesheets/components',
      },
      debug: process.env.DEBUG === 'true',
    }),
  ],
  build: {
    outDir: path.resolve(__dirname, 'public/assets/vt/build'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        // Define your entry points
        main: path.resolve(__dirname, 'app/typescript/entrypoints/main.ts'),
        // Add other entry points
      },
    },
  },
  server: {
    origin: 'http://localhost:3000',
  },
})
```

## SCSS Directives

### Handling `require`

The plugin processes `require` directives in your SCSS files:

```scss
// application.scss
// = require 'partials/_variables'
// = require 'partials/_mixins'
```

The plugin will resolve these paths and include the contents in place.

### Handling `require_tree`

Similarly, the plugin handles `require_tree` directives, recursively including all SCSS files in the specified directory:

```scss
// application.scss
// = require_tree './components'
```

All SCSS files in the `components` directory will be included in the compiled output.

> **Note:** The inclusion order is consistent and replicates Sprockets' behavior.

## Alias and File Mapping

You can define aliases and file mappings to simplify path resolutions:

- **Aliases:** Shortcut paths for directories.

  ```typescript
  aliases: {
    '~vendor': 'vendor/assets/stylesheets',
    '~lib': 'app/assets/stylesheets/lib',
  }
  ```

  Use in SCSS:

  ```scss
  // = require '~lib/some-lib'
  ```

- **File Mapping:** Map patterns to specific files or directories.

  ```typescript
  fileMapping: {
    'bootstrap/**': 'node_modules/bootstrap/scss/**/*.scss',
  }
  ```

## CLI Commands

Assuming you have set up scripts in your `package.json`:

- **Build the plugin:**

  ```bash
  bun run build
  ```

- **Develop with watch mode:**

  ```bash
  bun run dev
  ```

- **Run tests:**

  ```bash
  bun run test
  ```

## Development

If you're developing the plugin locally:

1. **Clone the Plugin Repository**

   If it's part of your project, navigate to the plugin directory.

2. **Install Dependencies**

   ```bash
   bun install
   ```

3. **Build the Plugin**

   ```bash
   bun run build
   ```

4. **Link the Plugin**

   ```bash
   bun link
   ```

5. **Link in Your Main Project**

   In your main project's directory:

   ```bash
   bun link vite-plugin-sprockets-scss
   ```

6. **Start Development Server**

   ```bash
   bun run dev
   ```

   This will watch for changes and rebuild the plugin automatically.

## Testing

The plugin includes a basic test suite using Bun's built-in testing framework.

- **Run Tests:**

  ```bash
  bun run test
  ```

- **Watch Tests:**

  ```bash
  bun run test:watch
  ```

## Known Issues

- **Circular Dependency Warnings:**

  Ensure that there are no circular dependencies in your SCSS files to prevent infinite loops during compilation.

- **File Watching Limitations:**

  In development mode, changes in SCSS files might not trigger automatic rebuilds. Ensure that your build tools are correctly configured to watch for changes.

- **Asset Path Resolution:**

  The plugin might not handle asset URLs in SCSS files (`url()` functions) the same way Sprockets does. You may need to adjust asset paths.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Repository**

2. **Create a Feature Branch**

   ```bash
   git checkout -b feature/new-feature
   ```

3. **Commit Your Changes**

   ```bash
   git commit -m "Add new feature"
   ```

4. **Push to Your Branch**

   ```bash
   git push origin feature/new-feature
   ```

5. **Open a Pull Request**

## Author

[Bailey Cosier](https://github.com/cosier/vite-plugin-sprockets-scss)

## License

MIT
