// test/utils/path-utils.test.ts
import { describe, expect, test } from 'bun:test'
import {
    normalizePath,
    createBoundaryMarker,
    matchWildcard,
    isAbsoluteOrRelativePath,
    resolveRelativePath,
    getExtension,
    removeExtension,
    joinPaths,
    isPartialPath,
} from '../../src/utils/path-utils'

describe('Path Utilities', () => {
    test('normalizePath handles different path formats', () => {
        expect(normalizePath('path\\to\\file')).toBe('path/to/file')
        expect(normalizePath('path/to/file')).toBe('path/to/file')
        expect(normalizePath('path\\to\\file.scss')).toBe('path/to/file.scss')
    })

    test('createBoundaryMarker generates correct markers', () => {
        const marker = createBoundaryMarker('path/to/file.scss')
        expect(marker.start).toContain('FILE_BOUNDARY')
        expect(marker.end).toContain('FILE_BOUNDARY')
        expect(marker.path).toBe('path/to/file.scss')
    })

    test('matchWildcard handles different patterns', () => {
        expect(matchWildcard('*.scss', 'file.scss')).toBe(true)
        expect(matchWildcard('*.scss', 'file.css')).toBe(false)
        expect(matchWildcard('test/**.scss', 'test/nested/file.scss')).toBe(
            true
        )
        expect(matchWildcard('test/*.scss', 'test/file.scss')).toBe(true)
        expect(matchWildcard('test/*.scss', 'test/nested/file.scss')).toBe(
            false
        )
    })

    test('isAbsoluteOrRelativePath detects path types', () => {
        expect(isAbsoluteOrRelativePath('/absolute/path')).toBe(true)
        expect(isAbsoluteOrRelativePath('./relative/path')).toBe(true)
        expect(isAbsoluteOrRelativePath('../relative/path')).toBe(true)
        expect(isAbsoluteOrRelativePath('non/relative/path')).toBe(false)
    })

    test('resolveRelativePath resolves paths correctly', () => {
        expect(
            resolveRelativePath('/root/src/file.scss', '/root/dist/output.css')
        ).not.toContain('/root/src')
        expect(resolveRelativePath('src/file.scss', 'dist/output.css')).toBe(
            '../dist/output.css'
        )
    })

    test('getExtension returns correct file extensions', () => {
        expect(getExtension('file.scss')).toBe('.scss')
        expect(getExtension('path/to/file.CSS')).toBe('.css')
        expect(getExtension('no-extension')).toBe('')
    })

    test('removeExtension strips file extensions', () => {
        expect(removeExtension('file.scss')).toBe('file')
        expect(removeExtension('path/to/file.css')).toBe('path/to/file')
        expect(removeExtension('no-extension')).toBe('no-extension')
    })

    test('joinPaths combines paths correctly', () => {
        expect(joinPaths('path', 'to', 'file')).toBe('path/to/file')
        expect(joinPaths('path/', '/to/', '/file')).toBe('path/to/file')
        expect(joinPaths('path\\to', 'file')).toBe('path/to/file')
    })

    test('isPartialPath identifies partial files', () => {
        expect(isPartialPath('_partial.scss')).toBe(true)
        expect(isPartialPath('regular.scss')).toBe(false)
        expect(isPartialPath('path/to/_partial.scss')).toBe(true)
    })
})
