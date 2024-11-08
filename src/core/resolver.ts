import path from 'path'
import { existsSync } from 'fs'
import { ResolvedOptions, ResolvedContent } from '../types'
import { Logger } from '../utils/logger'
import { FileManager } from './file-manager'
import { SUPPORTED_EXTENSIONS, DIRECTIVE_PATTERNS } from '../config/defaults'
import {
   createBoundaryMarker,
   matchWildcard,
} from '../utils/path-utils'
import { findFiles } from '../utils/glob-utils'
import { CircularDependencyError, FileNotFoundError } from '../utils/errors'
import { promises as fs } from 'fs'

export class SprocketsResolver {
    private processingFiles: Set<string>;
    private logger: Logger;
    private options: ResolvedOptions;
    private fileManager: FileManager;

    constructor(options: ResolvedOptions, logger: Logger, fileManager: FileManager) {
        this.options = options;
        this.logger = logger;
        this.fileManager = fileManager;
        this.processingFiles = new Set();
    }

    async resolveRequires(content: string, filePath: string): Promise<ResolvedContent> {
        this.logger.debug(`Resolving requires for file: ${filePath}`);
        const currentDir = path.dirname(filePath);
        this.logger.debug(`Current directory: ${currentDir}`);

        // Check for circular dependencies
        if (this.processingFiles.has(filePath)) {
            throw new CircularDependencyError(filePath);
        }

        // Add current file to processing set
        this.processingFiles.add(filePath);

        try {
            let resolvedContent = content;
            const dependencies: string[] = [];

            // Handle require directives
            const requireMatches = content.match(/\/\/\s*=\s*require\s+['"]([^'"]+)['"]/g);
            if (requireMatches) {
                for (const match of requireMatches) {
                    const directiveMatch = match.match(/['"]([^'"]+)['"]/);
                    if (!directiveMatch) continue;

                    const directivePath = directiveMatch[1];
                    const resolvedPath = await this.resolveImportPath(directivePath, currentDir, filePath);

                    if (resolvedPath) {
                        const fileContent = await this.fileManager.readFile(resolvedPath);
                        // Recursively resolve requires in the imported content
                        const resolved = await this.resolveRequires(fileContent, resolvedPath);
                        resolvedContent = resolvedContent.replace(match, resolved.content);
                        dependencies.push(resolvedPath);
                        dependencies.push(...resolved.dependencies);
                    }
                }
            }

            // Handle require_tree directives
            const treeMatches = content.match(/\/\/\s*=\s*require_tree\s+['"]([^'"]+)['"]/g);
            if (treeMatches) {
                for (const match of treeMatches) {
                    const treeMatch = match.match(/['"]([^'"]+)['"]/);
                    if (!treeMatch) continue;

                    const treePath = treeMatch[1];
                    const { content: treeContent, dependencies: treeDeps } = await this.resolveTree(
                        treePath,
                        currentDir
                    );
                    resolvedContent = resolvedContent.replace(match, treeContent);
                    dependencies.push(...treeDeps);
                }
            }

            return {
                content: resolvedContent,
                dependencies: [...new Set(dependencies)]
            };
        } finally {
            // Remove current file from processing set when done
            this.processingFiles.delete(filePath);
        }
    }

   public async resolveImportPath(
       importPath: string,
       currentDir: string,
       parentFile: string
   ): Promise<string | null> {
       this.logger.debug(`Resolving: ${importPath} from ${currentDir}`)

       // First resolve any aliases in the import path
       const aliasedPath = this.resolveAliasPath(importPath)
       this.logger.debug(`Alias resolved path: ${aliasedPath}`)

       // Try to find the file using the aliased path
       const resolvedPath = this.findFileInPaths(aliasedPath, currentDir)
       if (!resolvedPath) {
           throw new FileNotFoundError(importPath)
       }

       // Check for circular dependencies
       if (this.processingFiles.has(resolvedPath)) {
           throw new CircularDependencyError(resolvedPath)
       }

       return resolvedPath
   }

   private async resolveTree(treePath: string, currentDir: string): Promise<ResolvedContent> {
       this.logger.debug(`Resolving tree: ${treePath} from currentDir: ${currentDir}`)

       // Remove any leading ./ from the treePath
       const normalizedPath = treePath.replace(/^\.\//, '')

       // Resolve the full directory path relative to currentDir
       const fullPath = path.resolve(currentDir, normalizedPath)
       this.logger.debug(`Resolved full path: ${fullPath}`)

       try {
           const stats = await fs.stat(fullPath)
           if (!stats.isDirectory()) {
               this.logger.debug(`Path exists but is not a directory: ${fullPath}`)
               return { content: '', dependencies: [] }
           }

           this.logger.debug(`Found directory: ${fullPath}`)

           // Read directory contents
           const files = await fs.readdir(fullPath)
           this.logger.debug(`Directory contents: ${files.join(', ')}`)

           // Filter and process files
           const scssFiles = files
               .filter(file => file.endsWith('.scss'))
               .sort() // Ensure consistent ordering

           this.logger.debug(`SCSS files found: ${scssFiles.join(', ')}`)

           // Process each file in the directory
           const results = await Promise.all(
               scssFiles.map(async file => {
                   const filePath = path.join(fullPath, file)
                   const content = await fs.readFile(filePath, 'utf-8')
                   const resolved = await this.resolveRequires(content, filePath);
                   return {
                       content: resolved.content,
                       filePath,
                       dependencies: resolved.dependencies
                   }
               })
           )

           // Combine all file contents with boundaries
           const combinedContent = results.map(result => `
/* FILE_BOUNDARY: ${result.filePath} - START */
${result.content}
/* FILE_BOUNDARY: ${result.filePath} - END */
`).join('\n')

           return {
               content: combinedContent,
               dependencies: results.flatMap(r => [r.filePath, ...r.dependencies])
           }
       } catch (error) {
           this.logger.debug(`Error accessing directory: ${fullPath}`, error)
           return { content: '', dependencies: [] }
       }
   }

   private async processFile(
       filePath: string,
       depth: number = 0
   ): Promise<ResolvedContent> {
       if (this.processingFiles.has(filePath)) {
           throw new CircularDependencyError(filePath)
       }

       this.processingFiles.add(filePath)
       const content = await this.fileManager.readFile(filePath)
       const resolvedContent = await this.resolveRequires(content, filePath)

       const boundary = createBoundaryMarker(filePath)
       this.processingFiles.delete(filePath)

       return {
           content: boundary.start + resolvedContent.content + boundary.end,
           dependencies: [filePath, ...resolvedContent.dependencies],
       }
   }

   private resolveAliasPath(importPath: string): string {
       for (const [alias, aliasPath] of Object.entries(this.options.aliases)) {
           if (importPath.startsWith(alias)) {
               const resolved = importPath.replace(alias, aliasPath)
               this.logger.debug(`Alias resolved: ${importPath} -> ${resolved}`)
               return resolved
           }
       }
       return importPath
   }

   private resolveMappedPath(importPath: string): string | null {
       this.logger.debug(`Checking file mapping for: ${importPath}`)
       this.logger.debug(`Available mappings: ${JSON.stringify(this.options.fileMapping)}`)

       for (const [pattern, mappedPath] of Object.entries(this.options.fileMapping)) {
           this.logger.debug(`Checking pattern: ${pattern} against ${importPath}`)
           if (matchWildcard(pattern, importPath)) {
               const fullPath = path.join(this.options.root, mappedPath)
               this.logger.debug(`Trying exact mapped path: ${fullPath}`)

               if (existsSync(fullPath)) {
                   this.logger.debug(`Found mapped file: ${fullPath}`)
                   return fullPath
               }

               const scssPath = path.join(
                   this.options.root,
                   path.dirname(mappedPath),
                   path.basename(mappedPath, path.extname(mappedPath)) + '.scss'
               )
               this.logger.debug(`Trying SCSS fallback: ${scssPath}`)

               if (existsSync(scssPath)) {
                   this.logger.debug(`Found SCSS fallback: ${scssPath}`)
                   return scssPath
               }

               for (const includePath of this.options.includePaths) {
                   const includeScssPath = path.join(
                       includePath,
                       path.dirname(mappedPath),
                       path.basename(mappedPath, path.extname(mappedPath)) + '.scss'
                   )

                   if (existsSync(includeScssPath)) {
                       this.logger.debug(
                           `Mapped path resolved (includePath SCSS): ${importPath} -> ${includeScssPath}`
                       )
                       return includeScssPath
                   }
               }
           }
       }
       return null
   }

   findFileInPaths(
       importPath: string,
       currentDir: string
   ): string | null {
       this.logger.debug(`Finding file: ${importPath} in ${currentDir}`)

       const mappedPath = this.resolveMappedPath(importPath)
       if (mappedPath) {
           const fullPath = path.isAbsolute(mappedPath) ? mappedPath : path.join(this.options.root, mappedPath)
           if (existsSync(fullPath)) {
               this.logger.debug(`Found mapped file: ${fullPath}`)
               return fullPath
           }
       }

       const searchPaths = [
           currentDir,
           ...this.options.includePaths,
           ...(this.options.fallbackDirs || []).map(dir =>
               path.isAbsolute(dir) ? dir : path.join(this.options.root, dir)
           )
       ]
       const extensions = importPath.includes('.') ? [''] : SUPPORTED_EXTENSIONS

       for (const searchPath of searchPaths) {
           for (const ext of extensions) {
               const fullPath = path.resolve(searchPath, importPath + ext)
               if (existsSync(fullPath)) {
                   this.logger.debug(`Found file: ${fullPath}`)
                   return fullPath
               }

               const partialDir = path.dirname(importPath)
               const partialBase = path.basename(importPath)
               const partialPath = path.resolve(
                   searchPath,
                   partialDir,
                   `_${partialBase}${ext}`
               )
               if (existsSync(partialPath)) {
                   this.logger.debug(`Found partial file: ${partialPath}`)
                   return partialPath
               }
           }
       }

       this.logger.debug(`File not found: ${importPath}`)
       return null
   }

   getMappedFiles(): string[] {
       return Object.values(this.options.fileMapping)
   }

   clearCache(): void {
       this.processingFiles.clear();
       this.logger.debug('Cleared resolver cache')
   }
}

export type { SprocketsResolver as Resolver }
