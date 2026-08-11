import { z } from 'zod';
export declare const TOOLS: {
    readonly AGY: "agy";
    readonly PING: "ping";
    readonly HELP: "help";
    readonly LIST_SESSIONS: "listSessions";
    readonly CHANGELOG: "changelog";
};
export type ToolName = (typeof TOOLS)[keyof typeof TOOLS];
export declare const DEFAULT_AGY_BIN: "agy";
export declare const AGY_BIN_ENV_VAR: "AGY_BIN";
export declare const DEFAULT_AGY_PRINT_TIMEOUT: "5m";
export declare const AGY_PRINT_TIMEOUT_ENV_VAR: "AGY_MCP_PRINT_TIMEOUT";
export declare const AGY_MODEL_ENV_VAR: "AGY_MCP_DEFAULT_MODEL";
export declare const AGY_LOG_DIR_ENV_VAR: "AGY_MCP_LOG_DIR";
export declare const AGY_LOG_FILE_ENV_VAR: "AGY_MCP_LOG_FILE";
export interface ToolAnnotations {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
}
export interface ToolDefinition {
    name: ToolName;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required: string[];
    };
    outputSchema?: {
        type: 'object';
        properties?: Record<string, unknown>;
        required?: string[];
    };
    annotations?: ToolAnnotations;
}
export interface ToolResult {
    content: Array<{
        type: 'text';
        text: string;
        _meta?: Record<string, unknown>;
    }>;
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
    _meta?: Record<string, unknown>;
}
export interface ServerConfig {
    name: string;
    version: string;
}
export declare const AgyToolSchema: z.ZodObject<{
    prompt: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    resetSession: z.ZodOptional<z.ZodBoolean>;
    conversationId: z.ZodOptional<z.ZodString>;
    continueConversation: z.ZodOptional<z.ZodBoolean>;
    addDirs: z.ZodOptional<z.ZodArray<z.ZodString>>;
    sandbox: z.ZodOptional<z.ZodBoolean>;
    skipPermissions: z.ZodOptional<z.ZodBoolean>;
    printTimeout: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const PingToolSchema: z.ZodObject<{
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const HelpToolSchema: z.ZodObject<{}, z.core.$strip>;
export declare const ListSessionsToolSchema: z.ZodObject<{}, z.core.$strip>;
export declare const ChangelogToolSchema: z.ZodObject<{}, z.core.$strip>;
export type AgyToolArgs = z.infer<typeof AgyToolSchema>;
export type PingToolArgs = z.infer<typeof PingToolSchema>;
export type ListSessionsToolArgs = z.infer<typeof ListSessionsToolSchema>;
export interface CommandResult {
    stdout: string;
    stderr: string;
}
export type ProgressToken = string | number;
export interface ToolHandlerContext {
    progressToken?: ProgressToken;
    sendProgress: (message: string, progress?: number, total?: number) => Promise<void>;
}
//# sourceMappingURL=types.d.ts.map