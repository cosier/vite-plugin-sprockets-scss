import { promises as fs } from 'fs';
import path from 'path';
import { TEST_DIRS } from '../setup';

export async function readFixture(fileName: string): Promise<string> {
    const filePath = path.join(TEST_DIRS.FIXTURES, fileName);
    return await fs.readFile(filePath, 'utf-8');
}

export async function writeFixture(fileName: string, content: string): Promise<void> {
    const filePath = path.join(TEST_DIRS.FIXTURES, fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
} 