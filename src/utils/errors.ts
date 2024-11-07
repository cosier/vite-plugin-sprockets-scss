// Define error codes enum
export enum ErrorCode {
    CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    COMPILATION_ERROR = 'COMPILATION_ERROR',
    INVALID_CONFIG = 'INVALID_CONFIG',
    PARSE_ERROR = 'PARSE_ERROR'
}

export class SprocketsError extends Error {
    constructor(
        message: string,
        public readonly code: ErrorCode,
        public readonly details?: Record<string, unknown>
    ) {
        super(message)
        this.name = 'SprocketsError'
    }
}

export class CircularDependencyError extends SprocketsError {
    constructor(path: string) {
        super(
            `Circular dependency detected: ${path}`,
            ErrorCode.CIRCULAR_DEPENDENCY,
            { path }
        )
    }
}

export class FileNotFoundError extends SprocketsError {
    constructor(path: string) {
        super(
            `File not found: ${path}`,
            ErrorCode.FILE_NOT_FOUND,
            { path }
        )
    }
}
