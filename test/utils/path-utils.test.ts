// test/utils/path-utils.test.ts
import {
    assertEquals,
    assertStringIncludes,
    assertFalse,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
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
} from '../../src/utils/path-utils.ts';

describe('Path Utilities', () => {
    it('normalizePath handles different path formats', () => {
        assertEquals(normalizePath('path\\to\\file'), 'path/to/file')
        assertEquals(normalizePath('path/to/file'), 'path/to/file')
        assertEquals(normalizePath('path\\to\\file.scss'), 'path/to/file.scss')
    })

    it('createBoundaryMarker generates correct markers', () => {
        const marker = createBoundaryMarker('path/to/file.scss')
        assertStringIncludes(marker.start, 'FILE_BOUNDARY')
        assertStringIncludes(marker.end, 'FILE_BOUNDARY')
        assertEquals(marker.path, 'path/to/file.scss')
    })

    it('matchWildcard handles different patterns', () => {
        assertEquals(matchWildcard('*.scss', 'file.scss'), true)
        assertEquals(matchWildcard('*.scss', 'file.css'), false)
        assertEquals(matchWildcard('test/**.scss', 'test/nested/file.scss'), true)
        assertEquals(matchWildcard('test/*.scss', 'test/file.scss'), true)
        assertEquals(matchWildcard('test/*.scss', 'test/nested/file.scss'), false)
    })

    it('isAbsoluteOrRelativePath detects path types', () => {
        assertEquals(isAbsoluteOrRelativePath('/absolute/path'), true)
        assertEquals(isAbsoluteOrRelativePath('./relative/path'), true)
        assertEquals(isAbsoluteOrRelativePath('../relative/path'), true)
        assertEquals(isAbsoluteOrRelativePath('non/relative/path'), false)
    })

    it('resolveRelativePath resolves paths correctly', () => {
        assertFalse(resolveRelativePath('/root/src/file.scss', '/root/dist/output.css').includes('/root/src'))
        assertEquals(resolveRelativePath('src/file.scss', 'dist/output.css'), '../dist/output.css')
    })

    it('getExtension returns correct file extensions', () => {
        assertEquals(getExtension('file.scss'), '.scss')
        assertEquals(getExtension('path/to/file.CSS'), '.css')
        assertEquals(getExtension('no-extension'), '')
    })

    it('removeExtension strips file extensions', () => {
        assertEquals(removeExtension('file.scss'), 'file')
        assertEquals(removeExtension('path/to/file.css'), 'path/to/file')
        assertEquals(removeExtension('no-extension'), 'no-extension')
    })

    it('joinPaths combines paths correctly', () => {
        assertEquals(joinPaths('path', 'to', 'file'), 'path/to/file')
        assertEquals(joinPaths('path/', '/to/', '/file'), 'path/to/file')
        assertEquals(joinPaths('path\\to', 'file'), 'path/to/file')
    })

    it('isPartialPath identifies partial files', () => {
        assertEquals(isPartialPath('_partial.scss'), true)
        assertEquals(isPartialPath('regular.scss'), false)
        assertEquals(isPartialPath('path/to/_partial.scss'), true)
    })
})
