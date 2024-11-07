// Updated resolveRequires method in SprocketsResolver class

export class SprocketsResolver {
    private processingFiles: Set<string> = new Set();
    
    async resolveRequires(content: string, filePath: string): Promise<ResolvedContent> {
        this.logger.debug(`Resolving requires for file: ${filePath}`)
        const currentDir = path.dirname(filePath)
        this.logger.debug(`Current directory: ${currentDir}`)

        // Check for circular dependencies
        if (this.processingFiles.has(filePath)) {
            throw new CircularDependencyError(filePath);
        }

        // Add current file to processing set
        this.processingFiles.add(filePath);

        try {
            let resolvedContent = content
            const dependencies: string[] = []

            // Handle require directives
            const requireMatches = content.match(/\/\/\s*=\s*require\s+['"]([^'"]+)['"]/g)
            if (requireMatches) {
                for (const match of requireMatches) {
                    const directiveMatch = match.match(/['"]([^'"]+)['"]/)
                    if (!directiveMatch) continue
                    
                    const directivePath = directiveMatch[1]
                    const resolvedPath = await this.resolveImportPath(directivePath, currentDir, filePath)
                    
                    if (resolvedPath) {
                        const fileContent = await this.fileManager.readFile(resolvedPath)
                        // Recursively resolve requires in the imported content
                        const resolved = await this.resolveRequires(fileContent, resolvedPath)
                        resolvedContent = resolvedContent.replace(match, resolved.content)
                        dependencies.push(resolvedPath)
                        dependencies.push(...resolved.dependencies)
                    }
                }
            }

            // Handle require_tree directives
            const treeMatches = content.match(/\/\/\s*=\s*require_tree\s+['"]([^'"]+)['"]/g)
            if (treeMatches) {
                for (const match of treeMatches) {
                    const treeMatch = match.match(/['"]([^'"]+)['"]/)
                    if (!treeMatch) continue
                    
                    const treePath = treeMatch[1]
                    const { content: treeContent, dependencies: treeDeps } = await this.resolveTree(
                        treePath,
                        currentDir
                    )
                    resolvedContent = resolvedContent.replace(match, treeContent)
                    dependencies.push(...treeDeps)
                }
            }

            return {
                content: resolvedContent,
                dependencies: [...new Set(dependencies)]
            }
        } finally {
            // Remove current file from processing set when done
            this.processingFiles.delete(filePath)
        }
    }
}