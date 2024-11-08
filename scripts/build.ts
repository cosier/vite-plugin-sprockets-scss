import * as esbuild from "@luca/esbuild";
// import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.8.2/mod.ts";
import * as esbuildDenoLoader from "https://deno.land/x/esbuild_deno_loader@0.8.2/mod.ts";
const denoPlugins = esbuildDenoLoader.denoPlugins;

const outdir = 'dist';

// Parse version from deno.json
const denoConfig = JSON.parse(await Deno.readTextFile('./deno.json'));
const version = denoConfig.version || '0.1.0';

// Ensure dist directory exists
await Deno.mkdir(outdir, { recursive: true });

// Build the plugin
await esbuild.build({
  entryPoints: ['./mod.ts'],
  outfile: `${outdir}/plugin.js`,
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  target: ['esnext'],
  plugins: [...denoPlugins()],
  external: [
    'vite',
    'sass',
    'path',
    'fs',
    'node:path',
    'node:fs',
    'node:fs/promises'
  ],
  define: {
    'Deno.env.get': 'process.env',
  },
  banner: {
    js: `
      // vite-plugin-sprockets-scss v${version}
      // Copyright (c) ${new Date().getFullYear()} Bailey Cosier
      // License: MIT
    `.trim(),
  },
});

// Copy type definitions
await Deno.copyFile('./mod.ts', `${outdir}/plugin.d.ts`);

// Create package.json for npm publishing
await Deno.writeTextFile(`${outdir}/package.json`, JSON.stringify({
  name: "vite-plugin-sprockets-scss",
  version: JSON.parse(await Deno.readTextFile("./deno.json")).version,
  description: "Vite plugin for Sprockets-style SCSS compilation",
  type: "module",
  main: "./plugin.js",
  types: "./plugin.d.ts",
  files: ["plugin.js", "plugin.d.ts"],
  author: "Bailey Cosier",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/cosier/vite-plugin-sprockets-scss.git"
  },
  keywords: ["vite-plugin", "scss", "sprockets", "rails"],
  peerDependencies: {
    "vite": "^5.0.0",
    "sass": "^1.69.0"
  }
}, null, 2));

// Clean up
await esbuild.stop();

console.log('Build complete! Output in dist/'); 