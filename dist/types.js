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
// 【2026-08-06 撤去】ここには利用可能モデルの手書き配列があり、`z.enum()` で入力を縛っていた。
//   **手書きの固定値は腐る。**実際に `gemini-3.6-flash-high`（`agy models` で実在を確認）を
//   渡せない状態になっていた。この配列がこのMCPの唯一の独自ロジックで、
//   安全弁でもフィルタでもない——**縛るだけで、上流の新モデルを殺す。**
//
//   モデル名の正当性は `agy` 自身が判定する（不正な名前ならCLIがエラーを返す）。
//   ラッパー側で先回りして弾く理由が無い。**在庫の正は `agy models` の実行結果。**
//
//   参考: 表示名（`Gemini 3.5 Flash (High)`）とID（`gemini-3.6-flash-high`）の2形式があり、
//   `~/.gemini/antigravity-cli/settings.json` は表示名で持っている。どちらを渡すかも `agy` に任せる。
//   （memory/shared/designing-mechanisms.md「手で埋める欄と手書きの固定値は腐る」）
// 【2026-08-11 撤去】ここには `DEFAULT_AGY_MODEL = 'Gemini 3.5 Flash (Low)'` があり、
//   呼び出し側がモデルを指定しない限り **必ずこの名前を `--model` で渡していた**。
//   2026-08-06 に手書きの enum（許可リスト）を撤去したとき、この既定値だけが残った。
//   結果、在庫に `gemini-3.6-*` が入っても、このMCP経由の委任は 3.5 の Low で走り続けた。
//   **一覧を消しても、既定値が固定なら同じ場所で腐る。**
//
//   撤去後の決まり方: 呼び出し側の `model` → 環境変数 `AGY_MCP_DEFAULT_MODEL` →
//   **どちらも無ければ `--model` を渡さない**＝`agy` 自身の既定（Antigravity の設定）に委ねる。
//   その設定は ai-context の `tools/provision/60-model-versions.ps1` が sync ごとに
//   在庫（`agy models`）の最新版へ合わせ続ける。**「最新はどれか」を決める場所を1つにする。**
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
    // enum で縛らない（上を参照）。空文字だけ弾き、正当性の判定は agy に任せる。
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