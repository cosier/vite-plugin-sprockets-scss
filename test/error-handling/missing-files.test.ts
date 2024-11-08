import { assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { FileNotFoundError } from "../../src/utils/errors.ts";
import { createTestContext } from "../helpers/context.ts";

describe('Error Handling - Missing Files', () => {
    const { resolver } = createTestContext();

    it('handles missing files gracefully', async () => {
        const missing = `//= require 'non-existent-file'`;
        await assertThrows(
            async () => {
                await resolver.resolveRequires(missing, 'test.scss');
            },
            FileNotFoundError
        );
    });
});
