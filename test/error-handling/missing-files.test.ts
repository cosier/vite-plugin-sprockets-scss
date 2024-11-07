import { describe, expect, test } from "bun:test";
import { FileNotFoundError } from "../../src/utils/errors";
import { createTestContext } from "../helpers/context";

describe('Error Handling - Missing Files', () => {
    const { resolver } = createTestContext();

    test('handles missing files gracefully', async () => {
        const missing = `//= require 'non-existent-file'`;
        await expect(resolver.resolveRequires(missing, 'test.scss'))
            .rejects
            .toThrow(FileNotFoundError);
    });
}); 