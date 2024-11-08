import { join, dirname } from "https://deno.land/std/path/mod.ts";
import { TEST_DIRS } from '../setup.ts';

export async function readFixture(fileName: string): Promise<string> {
    try {
        const filePath = join(TEST_DIRS.FIXTURES, fileName);
        return await Deno.readTextFile(filePath);
    } catch (error) {
        throw new Error(
            `Failed to read fixture file ${fileName}: ${error.message}`
        );
    }
}

export async function writeFixture(
    fileName: string,
    content: string
): Promise<void> {
    try {
        const filePath = join(TEST_DIRS.FIXTURES, fileName);
        await Deno.mkdir(dirname(filePath), { recursive: true });
        try {
            await Deno.stat(filePath);
        } catch {
            await Deno.writeTextFile(filePath, content);
        }
    } catch (error) {
        throw new Error(
            `Failed to write fixture file ${fileName}: ${error.message}`
        );
    }
}
