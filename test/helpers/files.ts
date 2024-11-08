import { promises as fs } from 'fs'
import path from 'path'
import { TEST_DIRS } from '../setup'

export async function readFixture(fileName: string): Promise<string> {
    try {
        const filePath = path.join(TEST_DIRS.FIXTURES, fileName)
        return await fs.readFile(filePath, 'utf-8')
    } catch (error) {
        throw new Error(
            `Failed to read fixture file ${fileName}: ${error.message}`
        )
    }
}

export async function writeFixture(
    fileName: string,
    content: string
): Promise<void> {
    try {
        const filePath = path.join(TEST_DIRS.FIXTURES, fileName)
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        if (!(await fs.access(filePath).then(() => true).catch(() => false))) {
            await fs.writeFile(filePath, content, 'utf-8')
        }
    } catch (error) {
        throw new Error(
            `Failed to write fixture file ${fileName}: ${error.message}`
        )
    }
}
