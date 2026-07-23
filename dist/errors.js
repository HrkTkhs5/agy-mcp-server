export class ToolExecutionError extends Error {
    toolName;
    cause;
    constructor(toolName, message, cause) {
        const causeMsg = cause instanceof Error ? cause.message : '';
        const detail = causeMsg && causeMsg !== message ? ` (${causeMsg})` : '';
        super(`Failed to execute tool "${toolName}": ${message}${detail}`);
        this.toolName = toolName;
        this.cause = cause;
        this.name = 'ToolExecutionError';
    }
}
export class CommandExecutionError extends Error {
    command;
    cause;
    constructor(command, message, cause) {
        const causeMsg = cause instanceof Error ? cause.message : '';
        const detail = causeMsg && causeMsg !== message ? ` (${causeMsg})` : '';
        super(`Command execution failed for "${command}": ${message}${detail}`);
        this.command = command;
        this.cause = cause;
        this.name = 'CommandExecutionError';
    }
}
export class ValidationError extends Error {
    toolName;
    constructor(toolName, message) {
        super(`Validation failed for tool "${toolName}": ${message}`);
        this.toolName = toolName;
        this.name = 'ValidationError';
    }
}
export function handleError(error, context) {
    if (error instanceof Error) {
        return `Error in ${context}: ${error.message}`;
    }
    return `Error in ${context}: ${String(error)}`;
}
//# sourceMappingURL=errors.js.map