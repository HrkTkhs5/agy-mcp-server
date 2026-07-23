export declare class ToolExecutionError extends Error {
    readonly toolName: string;
    readonly cause?: unknown | undefined;
    constructor(toolName: string, message: string, cause?: unknown | undefined);
}
export declare class CommandExecutionError extends Error {
    readonly command: string;
    readonly cause?: unknown | undefined;
    constructor(command: string, message: string, cause?: unknown | undefined);
}
export declare class ValidationError extends Error {
    readonly toolName: string;
    constructor(toolName: string, message: string);
}
export declare function handleError(error: unknown, context: string): string;
//# sourceMappingURL=errors.d.ts.map