import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createTestContext } from "~/test/helpers/context.ts";

describe('File Manager', () => {
    const { fileManager } = createTestContext();

    it('handles partial files correctly', () => {
        assertEquals(fileManager.isPartial('_variables.scss'), true);
        assertEquals(fileManager.isPartial('main.scss'), false);
    });
});
