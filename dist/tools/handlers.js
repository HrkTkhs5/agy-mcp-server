import { TOOLS, DEFAULT_AGY_BIN, AGY_BIN_ENV_VAR, DEFAULT_AGY_PRINT_TIMEOUT, AGY_PRINT_TIMEOUT_ENV_VAR, AGY_MODEL_ENV_VAR, AgyToolSchema, PingToolSchema, HelpToolSchema, ListSessionsToolSchema, ChangelogToolSchema, } from '../types.js';
import { InMemorySessionStorage, } from '../session/storage.js';
import { ToolExecutionError, ValidationError } from '../errors.js';
import { executeCommand, executeCommandStreaming } from '../utils/command.js';
import { appendConversationLog } from '../utils/logger.js';
import { ZodError } from 'zod';
import path from 'node:path';
// Default no-op context for handlers that don't need progress
const defaultContext = {
    sendProgress: async () => { },
};
const isStructuredContentEnabled = () => {
    const raw = process.env.STRUCTURED_CONTENT_ENABLED;
    if (!raw)
        return false;
    return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
};
const resolveAgyBin = () => process.env[AGY_BIN_ENV_VAR] || DEFAULT_AGY_BIN;
export class AgyToolHandler {
    sessionStorage;
    constructor(sessionStorage) {
        this.sessionStorage = sessionStorage;
    }
    async execute(args, context = defaultContext) {
        try {
            const { prompt, model, sessionId, resetSession, conversationId, continueConversation, addDirs, sandbox, skipPermissions, printTimeout, } = AgyToolSchema.parse(args);
            // Resolve session and decide how to invoke agy.
            let mode = 'fresh';
            let resumeId;
            if (sessionId) {
                this.sessionStorage.ensureSession(sessionId);
                if (resetSession) {
                    this.sessionStorage.resetSession(sessionId);
                }
            }
            if (conversationId) {
                // Explicit conversation ID always wins.
                mode = 'resume';
                resumeId = conversationId;
            }
            else if (sessionId) {
                const storedId = this.sessionStorage.getAgyConversationId(sessionId);
                const session = this.sessionStorage.getSession(sessionId);
                const hasPriorTurns = !!session && Array.isArray(session.turns) && session.turns.length > 0;
                if (storedId) {
                    mode = 'resume';
                    resumeId = storedId;
                }
                else if (continueConversation || hasPriorTurns) {
                    // agy print mode doesn't expose conversation IDs, so multi-turn
                    // continuation relies on `agy --continue` (most recent conversation).
                    mode = 'continue';
                }
            }
            else if (continueConversation) {
                mode = 'continue';
            }
            // Build agy print-mode arguments. The prompt is passed as the -p flag
            // value (appended last); the remaining tokens are flags whose order is
            // irrelevant to Go's flag parser.
            const cmdArgs = [];
            // 【2026-08-06】手書きの許可リストで環境変数を検証していたが、リストから撤去した。
            //   検証していたせいで、実在する新モデルを環境変数で指定しても黙って既定へ落ちていた。
            //   正当性の判定は agy 自身が行う（不正ならCLIがエラーを返す）。
            // 【2026-08-11】既定のモデル名（'Gemini 3.5 Flash (Low)'）を撤去した。
            //   指定が無いときは --model を渡さず、agy 自身の既定に委ねる。理由は types.ts。
            const configuredModel = process.env[AGY_MODEL_ENV_VAR];
            const resolvedModel = model || configuredModel;
            if (resolvedModel) {
                cmdArgs.push('--model', resolvedModel);
            }
            if (mode === 'resume' && resumeId) {
                cmdArgs.push('--conversation', resumeId);
            }
            else if (mode === 'continue') {
                cmdArgs.push('--continue');
            }
            const resolvedDirs = (addDirs ?? []).map((d) => path.resolve(d));
            for (const dir of resolvedDirs) {
                cmdArgs.push('--add-dir', dir);
            }
            if (sandbox) {
                cmdArgs.push('--sandbox');
            }
            if (skipPermissions) {
                cmdArgs.push('--dangerously-skip-permissions');
            }
            const timeout = printTimeout ||
                process.env[AGY_PRINT_TIMEOUT_ENV_VAR] ||
                DEFAULT_AGY_PRINT_TIMEOUT;
            cmdArgs.push('--print-timeout', timeout);
            // Non-interactive print mode. agy uses the value of -p as the prompt when
            // it is non-empty (and only falls back to stdin when -p is empty), so we
            // pass the prompt directly as the flag value. stdin is still closed by the
            // command layer to guarantee agy never blocks waiting for input.
            cmdArgs.push('-p', prompt);
            await context.sendProgress('Starting agy execution...', 0);
            const startedAt = Date.now();
            const agyBin = resolveAgyBin();
            const useStreaming = !!context.progressToken;
            // node-pty was removed 2026-07-23: plain spawn works for agy print mode
            // (measured: exit 0, stdout intact) and the native dep alone was 62MB.
            const result = useStreaming
                ? await executeCommandStreaming(agyBin, cmdArgs, {
                    onProgress: (message) => {
                        context.sendProgress(message);
                    },
                })
                : await executeCommand(agyBin, cmdArgs);
            // agy writes its answer to stdout; tolerate stderr-only for robustness.
            const response = result.stdout || result.stderr || 'No output from agy';
            // Persist session state.
            if (sessionId) {
                if (resumeId) {
                    this.sessionStorage.setAgyConversationId(sessionId, resumeId);
                }
                const turn = {
                    prompt,
                    response,
                    timestamp: new Date(),
                };
                this.sessionStorage.addTurn(sessionId, turn);
            }
            // Append to the Markdown conversation transcript when logging is enabled
            // (AGY_MCP_LOG_DIR / AGY_MCP_LOG_FILE). Never throws.
            appendConversationLog({
                timestamp: new Date().toISOString(),
                prompt,
                response,
                mode,
                sessionId,
                conversationId: resumeId,
                durationMs: Date.now() - startedAt,
                sandbox,
                skipPermissions,
                addDirs: resolvedDirs,
            });
            const metadata = {
                mode,
                model: resolvedModel,
                ...(resumeId && { conversationId: resumeId }),
                ...(sessionId && { sessionId }),
                ...(resolvedDirs.length > 0 && { addDirs: resolvedDirs }),
                ...(sandbox && { sandbox: true }),
                ...(skipPermissions && { skipPermissions: true }),
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: response,
                        _meta: metadata,
                    },
                ],
                structuredContent: isStructuredContentEnabled() ? metadata : undefined,
            };
        }
        catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            if (error instanceof ZodError) {
                throw new ValidationError(TOOLS.AGY, error.message);
            }
            throw new ToolExecutionError(TOOLS.AGY, 'Failed to execute agy command', error);
        }
    }
}
export class PingToolHandler {
    async execute(args, _context = defaultContext) {
        try {
            const { message = 'pong' } = PingToolSchema.parse(args);
            return {
                content: [
                    {
                        type: 'text',
                        text: message,
                    },
                ],
            };
        }
        catch (error) {
            if (error instanceof ZodError) {
                throw new ValidationError(TOOLS.PING, error.message);
            }
            throw new ToolExecutionError(TOOLS.PING, 'Failed to execute ping command', error);
        }
    }
}
export class HelpToolHandler {
    async execute(args, _context = defaultContext) {
        try {
            HelpToolSchema.parse(args);
            const result = await executeCommand(resolveAgyBin(), ['--help']);
            return {
                content: [
                    {
                        type: 'text',
                        text: result.stdout ||
                            result.stderr ||
                            'No help information available',
                    },
                ],
            };
        }
        catch (error) {
            if (error instanceof ZodError) {
                throw new ValidationError(TOOLS.HELP, error.message);
            }
            throw new ToolExecutionError(TOOLS.HELP, 'Failed to execute help command', error);
        }
    }
}
export class ChangelogToolHandler {
    async execute(args, _context = defaultContext) {
        try {
            ChangelogToolSchema.parse(args);
            const result = await executeCommand(resolveAgyBin(), ['changelog']);
            return {
                content: [
                    {
                        type: 'text',
                        text: result.stdout || result.stderr || 'No changelog available',
                    },
                ],
            };
        }
        catch (error) {
            if (error instanceof ZodError) {
                throw new ValidationError(TOOLS.CHANGELOG, error.message);
            }
            throw new ToolExecutionError(TOOLS.CHANGELOG, 'Failed to execute changelog command', error);
        }
    }
}
export class ListSessionsToolHandler {
    sessionStorage;
    constructor(sessionStorage) {
        this.sessionStorage = sessionStorage;
    }
    async execute(args, _context = defaultContext) {
        try {
            ListSessionsToolSchema.parse(args);
            const sessions = this.sessionStorage.listSessions();
            const sessionInfo = sessions.map((session) => ({
                id: session.id,
                createdAt: session.createdAt.toISOString(),
                lastAccessedAt: session.lastAccessedAt.toISOString(),
                turnCount: session.turns.length,
                ...(session.agyConversationId && {
                    conversationId: session.agyConversationId,
                }),
            }));
            return {
                content: [
                    {
                        type: 'text',
                        text: sessionInfo.length > 0
                            ? JSON.stringify(sessionInfo, null, 2)
                            : 'No active sessions',
                    },
                ],
            };
        }
        catch (error) {
            if (error instanceof ZodError) {
                throw new ValidationError(TOOLS.LIST_SESSIONS, error.message);
            }
            throw new ToolExecutionError(TOOLS.LIST_SESSIONS, 'Failed to list sessions', error);
        }
    }
}
// Tool handler registry. A single in-memory session store is shared across
// the agy and listSessions handlers.
const sessionStorage = new InMemorySessionStorage();
export const toolHandlers = {
    [TOOLS.AGY]: new AgyToolHandler(sessionStorage),
    [TOOLS.PING]: new PingToolHandler(),
    [TOOLS.HELP]: new HelpToolHandler(),
    [TOOLS.LIST_SESSIONS]: new ListSessionsToolHandler(sessionStorage),
    [TOOLS.CHANGELOG]: new ChangelogToolHandler(),
};
//# sourceMappingURL=handlers.js.map