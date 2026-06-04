import { TOOLS, type ToolDefinition } from '../types.js';

export const toolDefinitions: ToolDefinition[] = [
  {
    name: TOOLS.AGY,
    description:
      'Run a prompt through the Antigravity CLI (agy) in non-interactive print mode and return the response. Supports multi-turn continuation, extra workspace directories, sandbox, and auto-approval of tool permissions.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The coding task, question, or analysis request',
        },
        model: {
          type: 'string',
          description:
            'Model for this call (agy v1.0.5+ `--model`). Use a name exactly as listed by the `models` tool, e.g. "Claude Opus 4.6 (Thinking)" or "Gemini 3.5 Flash (High)". Optional — omit to use agy\'s default (or the AGY_MCP_DEFAULT_MODEL env).',
        },
        sessionId: {
          type: 'string',
          description:
            'Optional session ID for multi-turn context. The first turn starts a fresh agy conversation; later turns in the same session continue it via `agy --continue`. Note: agy continues the most-recent conversation globally, so avoid interleaving sessions or manual agy usage mid-session.',
        },
        resetSession: {
          type: 'boolean',
          description:
            'Reset the session history before processing this request (starts a fresh agy conversation)',
        },
        conversationId: {
          type: 'string',
          description:
            'Resume a specific agy conversation by ID (e.g. one obtained from the Antigravity app). Maps to `agy --conversation <id>` and takes precedence over session continuation.',
        },
        continueConversation: {
          type: 'boolean',
          description:
            'Force `agy --continue` to continue the most recent conversation, regardless of session state',
        },
        addDirs: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Extra directories to add to the agy workspace (maps to repeated `--add-dir` flags)',
        },
        sandbox: {
          type: 'boolean',
          description:
            'Run agy in a sandbox with terminal restrictions enabled (`--sandbox`)',
        },
        skipPermissions: {
          type: 'boolean',
          description:
            'DANGEROUS: auto-approve all tool permission requests without prompting (`--dangerously-skip-permissions`). Required for agy to use tools non-interactively, but lets it modify files/run commands unattended.',
        },
        printTimeout: {
          type: 'string',
          description:
            'Timeout for print mode as a Go-style duration (e.g. "90s", "5m", "1h30m"). Maps to `--print-timeout`. Defaults to 5m.',
        },
      },
      required: ['prompt'],
    },
    annotations: {
      title: 'Run Antigravity CLI',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: TOOLS.MODELS,
    description:
      'List the models available to agy (runs `agy models`). Use a returned name as the `model` parameter of the agy tool.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    annotations: {
      title: 'List agy Models',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: TOOLS.PING,
    description: 'Test MCP server connection',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to echo back',
        },
      },
      required: [],
    },
    annotations: {
      title: 'Ping Server',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: TOOLS.HELP,
    description: 'Get Antigravity CLI (agy) help information',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    annotations: {
      title: 'Get Help',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: TOOLS.LIST_SESSIONS,
    description: 'List all active conversation sessions with metadata',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    annotations: {
      title: 'List Sessions',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: TOOLS.CHANGELOG,
    description: 'Show the Antigravity CLI (agy) changelog and release notes',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    annotations: {
      title: 'agy Changelog',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];
