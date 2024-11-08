@std/fs
@1.0.5
Built and signed on GitHub Actions
Helpers for working with the file system

Works with
JSR Score
94%
Published
2 weeks ago (1.0.5)
Helpers for working with the filesystem.

import { ensureFile, copy, ensureDir, move } from "@std/fs";

await ensureFile("example.txt");

await copy("example.txt", "example_copy.txt");

await ensureDir("subdir");

await move("example_copy.txt", "subdir/example_copy.txt");
Built and signed on
GitHub Actions
View transparency log