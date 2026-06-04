import { jest } from '@jest/globals';
import { TOOLS } from '../types.js';
import { toolDefinitions } from '../tools/definitions.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { InMemorySessionStorage } from '../session/storage.js';

// Mock the command layer so no real agy process is spawned. Native ESM needs
// unstable_mockModule + dynamic import of anything that pulls in command.js.
jest.unstable_mockModule('../utils/command.js', () => ({
  executeCommand: jest.fn(async () => ({ stdout: 'mocked', stderr: '' })),
  executeCommandStreaming: jest.fn(async () => ({
    stdout: 'mocked',
    stderr: '',
  })),
}));

const {
  toolHandlers,
  AgyToolHandler,
  PingToolHandler,
  HelpToolHandler,
  ListSessionsToolHandler,
  ChangelogToolHandler,
  ModelsToolHandler,
} = await import('../tools/handlers.js');
const { AgyMcpServer } = await import('../server.js');

describe('Tool definitions', () => {
  test('defines all six tools', () => {
    expect(toolDefinitions).toHaveLength(6);
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        TOOLS.AGY,
        TOOLS.PING,
        TOOLS.HELP,
        TOOLS.LIST_SESSIONS,
        TOOLS.CHANGELOG,
        TOOLS.MODELS,
      ])
    );
  });

  test('agy tool exposes a model parameter', () => {
    const agy = toolDefinitions.find((t) => t.name === TOOLS.AGY);
    expect(agy?.inputSchema.properties).toHaveProperty('model');
  });

  test('agy tool requires prompt and is marked destructive', () => {
    const agy = toolDefinitions.find((t) => t.name === TOOLS.AGY);
    expect(agy?.inputSchema.required).toEqual(['prompt']);
    expect(agy?.annotations?.destructiveHint).toBe(true);
    // No outputSchema: structuredContent stays optional so strict MCP clients
    // do not require it on every result.
    expect(agy?.outputSchema).toBeUndefined();
  });

  test('utility tools require no parameters', () => {
    for (const name of [TOOLS.HELP, TOOLS.LIST_SESSIONS, TOOLS.CHANGELOG]) {
      const tool = toolDefinitions.find((t) => t.name === name);
      expect(tool?.inputSchema.required).toEqual([]);
    }
  });

  test('definitions validate against ListToolsResultSchema', () => {
    expect(
      ListToolsResultSchema.safeParse({ tools: toolDefinitions }).success
    ).toBe(true);
  });
});

describe('Tool handlers', () => {
  test('registry wires each tool to its handler', () => {
    expect(toolHandlers[TOOLS.AGY]).toBeInstanceOf(AgyToolHandler);
    expect(toolHandlers[TOOLS.PING]).toBeInstanceOf(PingToolHandler);
    expect(toolHandlers[TOOLS.HELP]).toBeInstanceOf(HelpToolHandler);
    expect(toolHandlers[TOOLS.LIST_SESSIONS]).toBeInstanceOf(
      ListSessionsToolHandler
    );
    expect(toolHandlers[TOOLS.CHANGELOG]).toBeInstanceOf(ChangelogToolHandler);
    expect(toolHandlers[TOOLS.MODELS]).toBeInstanceOf(ModelsToolHandler);
  });

  test('ping echoes the message', async () => {
    const result = await new PingToolHandler().execute({ message: 'hi' });
    expect(result.content[0].text).toBe('hi');
  });

  test('ping defaults to pong', async () => {
    const result = await new PingToolHandler().execute({});
    expect(result.content[0].text).toBe('pong');
  });

  test('listSessions reports no active sessions when empty', async () => {
    const handler = new ListSessionsToolHandler(new InMemorySessionStorage());
    const result = await handler.execute({});
    expect(result.content[0].text).toBe('No active sessions');
  });

  test('agy result validates against CallToolResultSchema', async () => {
    process.env.STRUCTURED_CONTENT_ENABLED = '1';
    const result = await toolHandlers[TOOLS.AGY].execute({ prompt: 'hi' });
    expect(CallToolResultSchema.safeParse(result).success).toBe(true);
  });
});

describe('Server initialization', () => {
  test('constructs with a config', () => {
    const server = new AgyMcpServer({
      name: 'agy-mcp-server',
      version: '0.1.0',
    });
    expect(server).toBeInstanceOf(AgyMcpServer);
  });
});
