import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { AGY_LOG_DIR_ENV_VAR, AGY_LOG_FILE_ENV_VAR } from '../types.js';
/** True when conversation logging is enabled via env. */
export function isConversationLoggingEnabled() {
    return !!(process.env[AGY_LOG_FILE_ENV_VAR] || process.env[AGY_LOG_DIR_ENV_VAR]);
}
/**
 * Resolve the target Markdown log file from env, or null if logging is off.
 * AGY_MCP_LOG_FILE (explicit file) takes precedence over AGY_MCP_LOG_DIR
 * (daily file: agy-conversations-YYYY-MM-DD.md).
 */
function resolveLogTarget(timestamp) {
    const explicitFile = process.env[AGY_LOG_FILE_ENV_VAR];
    if (explicitFile)
        return path.resolve(explicitFile);
    const dir = process.env[AGY_LOG_DIR_ENV_VAR];
    if (dir) {
        const day = timestamp.slice(0, 10); // YYYY-MM-DD from an ISO timestamp
        return path.resolve(dir, `agy-conversations-${day}.md`);
    }
    return null;
}
function formatEntry(e) {
    const dirs = (e.addDirs ?? []).join(', ');
    const flags = `sandbox=${!!e.sandbox} · skipPermissions=${!!e.skipPermissions} · addDirs=[${dirs}]`;
    return ([
        `## ${e.timestamp} — mode: ${e.mode}`,
        '',
        `- **session:** ${e.sessionId || '(none)'}  ·  **conversationId:** ${e.conversationId || '(none)'}  ·  **duration:** ${e.durationMs} ms`,
        `- **flags:** ${flags}`,
        '',
        '### 🧑 Prompt',
        e.prompt,
        '',
        '### 🤖 agy',
        e.response,
        '',
        '---',
        '',
    ].join('\n') + '\n');
}
/**
 * Append one conversation turn to the Markdown transcript when logging is
 * enabled. NEVER throws — a logging failure must not break the agy tool; it is
 * reported to stderr and swallowed.
 */
export function appendConversationLog(entry) {
    try {
        const target = resolveLogTarget(entry.timestamp);
        if (!target)
            return; // logging disabled
        mkdirSync(path.dirname(target), { recursive: true });
        appendFileSync(target, formatEntry(entry), 'utf8');
    }
    catch (err) {
        console.error(chalk.yellow('Failed to write conversation log:'), err);
    }
}
//# sourceMappingURL=logger.js.map