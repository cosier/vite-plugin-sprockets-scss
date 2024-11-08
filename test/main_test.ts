import { describe } from "@std/testing/bdd";

// Import all test files
import "./core/compiler.test.ts";
import "./core/file-manager.test.ts";
import "./core/resolver/aliases.test.ts";
import "./core/resolver/mapping.test.ts";
import "./core/resolver/requires.test.ts";
import "./core/resolver/tree.test.ts";
import "./error-handling/circular-deps.test.ts";
import "./error-handling/missing-files.test.ts";
import "./utils/glob-utils.test.ts";
import "./utils/logger.test.ts";
import "./utils/path-utils.test.ts";
import "./integration.test.ts";
import "./plugin.test.ts";
import "./rails-paths.test.ts";

describe("Sprockets SCSS Plugin Tests", () => {
  // Tests will be imported from the files above
}); 