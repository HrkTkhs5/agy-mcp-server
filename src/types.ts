import { z } from 'zod';

// Tool constants
export const TOOLS = {
  AGY: 'agy',
  PING: 'ping',
  HELP: 'help',
  LIST_SESSIONS: 'listSessions',
  CHANGELOG: 'changelog',
} as const;

export type ToolName = (typeof TOOLS)[keyof typeof TOOLS];

// agy CLI binary resolution.
// Antigravity ships the CLI as `agy`. Allow overriding for non-standard installs.
export const DEFAULT_AGY_BIN = 'agy' as const;
export const AGY_BIN_ENV_VAR = 'AGY_BIN' as const;

// Default timeout for `agy -p` (print mode). agy's own default is 5m; we mirror it.
export const DEFAULT_AGY_PRINT_TIMEOUT = '5m' as const;
export const AGY_PRINT_TIMEOUT_ENV_VAR = 'AGY_MCP_PRINT_TIMEOUT' as const;

// Conversation logging. When either is set, each `agy` tool call is appended to
// a Markdown transcript. Disabled by default (privacy-safe).
// - AGY_MCP_LOG_DIR:  directory; writes one file per day (agy-conversations-<date>.md)
// - AGY_MCP_LOG_FILE: explicit single file path (overrides AGY_MCP_LOG_DIR)
export const AGY_LOG_DIR_ENV_VAR = 'AGY_MCP_LOG_DIR' as const;
export const AGY_LOG_FILE_ENV_VAR = 'AGY_MCP_LOG_FILE' as const;

// Tool annotations for MCP 2025-11-25 spec
export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

// Tool definition interface
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

// Tool result interface matching MCP SDK expectations
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

// Server configuration
export interface ServerConfig {
  name: string;
  version: string;
}

// A Go-style duration accepted by agy --print-timeout (e.g. "5m", "90s", "1h30m").
const durationPattern = /^\d+(\.\d+)?(ms|s|m|h)([0-9.]+(ms|s|m|h))*$/;

// Zod schemas for tool arguments
export const AgyToolSchema = z.object({
  prompt: z.string().min(1, { error: 'prompt must not be empty' }),
  sessionId: z
    .string()
    .max(256, { error: 'Session ID must be 256 characters or fewer' })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      error:
        'Session ID can only contain letters, numbers, hyphens, and underscores',
    })
    .optional(),
  resetSession: z.boolean().optional(),
  // Resume a specific agy conversation by ID (if you obtained one from the
  // Antigravity app). Takes precedence over the session's continue behaviour.
  conversationId: z
    .string()
    .max(256, { error: 'Conversation ID must be 256 characters or fewer' })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      error:
        'Conversation ID can only contain letters, numbers, hyphens, and underscores',
    })
    .optional(),
  // Force `agy --continue` (continue the most recent conversation), regardless
  // of session state.
  continueConversation: z.boolean().optional(),
  // Extra workspace directories (`--add-dir`, repeatable).
  addDirs: z.array(z.string()).optional(),
  // `--sandbox`: run with terminal restrictions enabled.
  sandbox: z.boolean().optional(),
  // `--dangerously-skip-permissions`: auto-approve all tool permission prompts.
  skipPermissions: z.boolean().optional(),
  // `--print-timeout`: Go-style duration string (e.g. "5m", "90s").
  printTimeout: z
    .string()
    .regex(durationPattern, {
      error:
        'printTimeout must be a Go-style duration such as "90s", "5m", or "1h30m"',
    })
    .optional(),
});

export const PingToolSchema = z.object({
  message: z.string().optional(),
});

export const HelpToolSchema = z.object({});

export const ListSessionsToolSchema = z.object({});

export const ChangelogToolSchema = z.object({});

export type AgyToolArgs = z.infer<typeof AgyToolSchema>;
export type PingToolArgs = z.infer<typeof PingToolSchema>;
export type ListSessionsToolArgs = z.infer<typeof ListSessionsToolSchema>;

// Command execution result
export interface CommandResult {
  stdout: string;
  stderr: string;
}

// Progress token from MCP request metadata
export type ProgressToken = string | number;

// Context passed to tool handlers for sending progress notifications
export interface ToolHandlerContext {
  progressToken?: ProgressToken;
  sendProgress: (
    message: string,
    progress?: number,
    total?: number
  ) => Promise<void>;
}
