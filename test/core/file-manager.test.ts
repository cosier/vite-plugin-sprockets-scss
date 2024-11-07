import { describe, expect, test } from "bun:test";
import { createTestContext } from "../helpers/context";

describe('File Manager', () => {
    const { fileManager } = createTestContext();

    test('handles partial files correctly', () => {
        expect(fileManager.isPartial('_variables.scss')).toBe(true);
        expect(fileManager.isPartial('main.scss')).toBe(false);
    });
}); 