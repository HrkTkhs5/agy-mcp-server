# CLAUDE.md

This file guides Claude Code when working in this repository.

## Repository Type

An **MCP (Model Context Protocol) server** that wraps Google Antigravity's `agy`
CLI, exposing it as tools to Claude Code and other MCP clients. Sister project to
`codex-mcp-server` (same architecture, different upstream CLI).

## Deployment model (2026-07-23)

- **`dist/` is committed.** Consumer PCs run `npm ci --omit=dev --ignore-scripts`
  (runtime deps only, ~23MB) and never build. After editing `src/`, rebuild with
  `npx tsc -p tsconfig.build.json` and commit the regenerated `dist/` together.
- **node-pty was removed.** Plain `child_process.spawn` handles agy print mode
  on all platforms (measured on Windows: exit 0, stdout intact). Do not
  reintroduce pty — the native binary alone was 62MB and locks files while any
  MCP session is alive.

## Development Commands

```bash
npm run build          # tsc -> dist/
npm run dev            # run src/index.ts with tsx
npm test               # jest (ESM via ts-jest)
npm run test:coverage  # coverage report
npx jest src/__tests__/agy-handler.test.ts   # single test file
npm run lint           # eslint
npm run format         # prettier
```

## Architecture

```
MCP Client (Claude Code)
  -> StdioTransport
  -> AgyMcpServer (server.ts)
  -> ToolHandlers (tools/handlers.ts)
  -> executeCommand / executeCommandStreaming (utils/command.ts)
  -> agy CLI (print mode)
```

| File | Purpose |
|------|---------|
| `src/index.ts` | Entry point; starts `AgyMcpServer` |
| `src/server.ts` | MCP server, `list_tools` / `call_tool`, progress notifications |
| `src/tools/definitions.ts` | Tool schemas + annotations |
| `src/tools/handlers.ts` | Tool logic (agy, ping, help, listSessions, changelog) |
| `src/types.ts` | Types, Zod schemas, constants |
| `src/session/storage.ts` | In-memory session storage |
| `src/utils/command.ts` | Process spawning with stdin piping + streaming |
| `src/utils/logger.ts` | Markdown conversation transcript logger (env-gated) |
| `src/errors.ts` | Error classes |

## Critical implementation details

- **Prompt is the value of `-p`.** `agy -p "<prompt>"` takes the prompt as the
  flag value. `-p` REQUIRES a value — a bare `-p` errors with "flag needs an
  argument". `agy` only falls back to reading stdin when `-p` is empty. The
  handler passes the prompt via `cmdArgs.push('-p', prompt)`, and `command.ts`
  **always closes stdin** so `agy` never blocks waiting for input.
- **Answer is on stdout.** `agy` print mode writes the response to stdout (exit 0).
  Handlers still fall back to stderr for robustness.
- **No `--model` flag.** Antigravity controls the model; this server does not
  expose model or reasoning-effort selection.
- **No conversation ID in print mode.** Multi-turn continuation uses
  `agy --continue` (most-recent conversation). `--conversation <id>` is only used
  when the caller supplies an explicit `conversationId`.
- **Conversation logging is env-gated and must never throw.** `logger.ts`
  appends a Markdown transcript per `agy` call when `AGY_MCP_LOG_DIR` or
  `AGY_MCP_LOG_FILE` is set (off by default). Failures are caught and logged to
  stderr only — the tool result is unaffected.

## agy CLI reference (v1.0.3)

```
agy -p "<prompt>"                 # print mode; prompt is the VALUE of -p (reads stdin only when -p is empty)
agy --continue / -c               # continue most recent conversation
agy --conversation <id>           # resume a conversation by ID
agy --add-dir <dir>               # add workspace dir (repeatable)
agy --sandbox                     # terminal-restricted sandbox
agy --dangerously-skip-permissions  # auto-approve tool use
agy --print-timeout <dur>         # print-mode timeout (default 5m)
```

Build the print invocation as: `[<resume/continue flags>] [--add-dir ...] [--sandbox] [--dangerously-skip-permissions] --print-timeout <dur> -p "<prompt>"`.

## TypeScript / config

- ES2022, ESNext modules; all relative imports use `.js` extensions (ESM).
- Output to `dist/`. Strict mode on.
- Tests: jest + ts-jest ESM preset; `command.ts` is mocked in handler tests, and
  exercised for real (via `cat`) in `command.test.ts`.
