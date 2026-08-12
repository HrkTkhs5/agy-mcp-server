import { z } from 'zod';
// Tool constants
export const TOOLS = {
    AGY: 'agy',
    PING: 'ping',
    HELP: 'help',
    LIST_SESSIONS: 'listSessions',
    CHANGELOG: 'changelog',
};
// agy CLI binary resolution.
// Antigravity ships the CLI as `agy`. Allow overriding for non-standard installs.
export const DEFAULT_AGY_BIN = 'agy';
export const AGY_BIN_ENV_VAR = 'AGY_BIN';
// Default timeout for `agy -p` (print mode). agy's own default is 5m; we mirror it.
export const DEFAULT_AGY_PRINT_TIMEOUT = '5m';
export const AGY_PRINT_TIMEOUT_ENV_VAR = 'AGY_MCP_PRINT_TIMEOUT';
// No hardcoded model list, no default model (2026-08-12 root cure).
// Both went stale: the allow-list rejected `Gemini 3.6 Flash (High)` while it was
// live upstream, and the default pinned every unspecified call to a two-generation-old
// model at the lowest reasoning tier — silently, because that model is still served.
// Resolution order is now: caller argument -> AGY_MCP_DEFAULT_MODEL -> omit `--model`
// entirely and let agy use its own default. That default is kept current by
// ai-context's tools/provision/60-model-versions.ps1, so "which one is newest"
// is decided in exactly one place. The live inventory is `agy models`.
export const AGY_MODEL_ENV_VAR = 'AGY_MCP_DEFAULT_MODEL';
// Conversation logging. When either is set, each `agy` tool call is appended to
// a Markdown transcript. Disabled by default (privacy-safe).
// - AGY_MCP_LOG_DIR:  directory; writes one file per day (agy-conversations-<date>.md)
// - AGY_MCP_LOG_FILE: explicit single file path (overrides AGY_MCP_LOG_DIR)
export const AGY_LOG_DIR_ENV_VAR = 'AGY_MCP_LOG_DIR';
export const AGY_LOG_FILE_ENV_VAR = 'AGY_MCP_LOG_FILE';
// A Go-style duration accepted by agy --print-timeout (e.g. "5m", "90s", "1h30m").
const durationPattern = /^\d+(\.\d+)?(ms|s|m|h)([0-9.]+(ms|s|m|h))*$/;
// Zod schemas for tool arguments
export const AgyToolSchema = z.object({
    prompt: z.string().min(1, { error: 'prompt must not be empty' }),
    // Free-form: validated by agy itself against its live inventory, not by a
    // list baked in here. A stale allow-list blocks new models; agy just errors
    // on a bad name, which is the cheaper failure.
    model: z.string().min(1, { error: 'model must not be empty' }).optional(),
    sessionId: z
        .string()
        .max(256, { error: 'Session ID must be 256 characters or fewer' })
        .regex(/^[a-zA-Z0-9_-]+$/, {
        error: 'Session ID can only contain letters, numbers, hyphens, and underscores',
    })
        .optional(),
    resetSession: z.boolean().optional(),
    // Resume a specific agy conversation by ID (if you obtained one from the
    // Antigravity app). Takes precedence over the session's continue behaviour.
    conversationId: z
        .string()
        .max(256, { error: 'Conversation ID must be 256 characters or fewer' })
        .regex(/^[a-zA-Z0-9_-]+$/, {
        error: 'Conversation ID can only contain letters, numbers, hyphens, and underscores',
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
        error: 'printTimeout must be a Go-style duration such as "90s", "5m", or "1h30m"',
    })
        .optional(),
});
export const PingToolSchema = z.object({
    message: z.string().optional(),
});
export const HelpToolSchema = z.object({});
export const ListSessionsToolSchema = z.object({});
export const ChangelogToolSchema = z.object({});
//# sourceMappingURL=types.js.map