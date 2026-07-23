import { jest } from '@jest/globals';
import { InMemorySessionStorage } from '../session/storage.js';
import { ToolExecutionError, ValidationError } from '../errors.js';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Native ESM requires unstable_mockModule + dynamic import (static jest.mock
// is not hoisted under ESM).
jest.unstable_mockModule('../utils/command.js', () => ({
  executeCommand: jest.fn(),
  executeCommandStreaming: jest.fn(),
}));

const { executeCommand, executeCommandStreaming } = await import(
  '../utils/command.js'
);
const { AgyToolHandler } = await import('../tools/handlers.js');

const mockedExecuteCommand = jest.mocked(executeCommand);
const mockedExecuteCommandStreaming = jest.mocked(executeCommandStreaming);

describe('AgyToolHandler', () => {
  let handler: InstanceType<typeof AgyToolHandler>;
  let storage: InMemorySessionStorage;
  let savedEnv: typeof process.env;

  beforeAll(() => {
    savedEnv = { ...process.env };
  });

  afterAll(() => {
    process.env = savedEnv;
  });

  beforeEach(() => {
    storage = new InMemorySessionStorage();
    handler = new AgyToolHandler(storage);
    mockedExecuteCommand.mockReset();
    mockedExecuteCommandStreaming.mockReset();
    mockedExecuteCommand.mockResolvedValue({ stdout: 'agy reply', stderr: '' });
    mockedExecuteCommandStreaming.mockResolvedValue({
      stdout: 'agy reply',
      stderr: '',
    });
    delete process.env.AGY_BIN;
    delete process.env.AGY_MCP_PRINT_TIMEOUT;
    delete process.env.AGY_MCP_DEFAULT_MODEL;
    delete process.env.AGY_MCP_LOG_DIR;
    delete process.env.AGY_MCP_LOG_FILE;
    process.env.STRUCTURED_CONTENT_ENABLED = '1';
  });

  test('fresh prompt: passes the prompt as the value of -p', async () => {
    await handler.execute({ prompt: 'What is 2+2?' });

    expect(mockedExecuteCommand).toHaveBeenCalledWith('agy', [
      '--model',
      'Gemini 3.5 Flash (Low)',
      '--print-timeout',
      '5m',
      '-p',
      'What is 2+2?',
    ]);
  });

  test('passes the requested model', async () => {
    await handler.execute({
      prompt: 'hi',
      model: 'Gemini 3.1 Pro (High)',
    });
    expect(mockedExecuteCommand.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['--model', 'Gemini 3.1 Pro (High)'])
    );
  });

  test('uses configured default model from AGY_MCP_DEFAULT_MODEL', async () => {
    process.env.AGY_MCP_DEFAULT_MODEL = 'Claude Sonnet 4.6 (Thinking)';
    await handler.execute({ prompt: 'hi' });
    expect(mockedExecuteCommand.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['--model', 'Claude Sonnet 4.6 (Thinking)'])
    );
  });

  test('uses configured agy binary from AGY_BIN', async () => {
    process.env.AGY_BIN = '/opt/antigravity/agy';
    await handler.execute({ prompt: 'hi' });
    expect(mockedExecuteCommand.mock.calls[0][0]).toBe('/opt/antigravity/agy');
  });

  test('custom printTimeout overrides default', async () => {
    await handler.execute({ prompt: 'hi', printTimeout: '90s' });
    expect(mockedExecuteCommand.mock.calls[0][1]).toEqual([
      '--model',
      'Gemini 3.5 Flash (Low)',
      '--print-timeout',
      '90s',
      '-p',
      'hi',
    ]);
  });

  test('AGY_MCP_PRINT_TIMEOUT env is used when no explicit timeout', async () => {
    process.env.AGY_MCP_PRINT_TIMEOUT = '2m';
    await handler.execute({ prompt: 'hi' });
    expect(mockedExecuteCommand.mock.calls[0][1]).toContain('2m');
  });

  test('addDirs map to repeated --add-dir with absolute paths', async () => {
    await handler.execute({ prompt: 'hi', addDirs: ['/tmp/a', '/tmp/b'] });
    expect(mockedExecuteCommand.mock.calls[0][1]).toEqual([
      '--model',
      'Gemini 3.5 Flash (Low)',
      '--add-dir',
      path.resolve('/tmp/a'),
      '--add-dir',
      path.resolve('/tmp/b'),
      '--print-timeout',
      '5m',
      '-p',
      'hi',
    ]);
  });

  test('sandbox and skipPermissions flags are passed', async () => {
    await handler.execute({
      prompt: 'hi',
      sandbox: true,
      skipPermissions: true,
    });
    const args = mockedExecuteCommand.mock.calls[0][1];
    expect(args).toContain('--sandbox');
    expect(args).toContain('--dangerously-skip-permissions');
  });

  test('explicit conversationId resumes that conversation', async () => {
    await handler.execute({ prompt: 'continue', conversationId: 'conv-123' });
    expect(mockedExecuteCommand.mock.calls[0][1]).toEqual([
      '--model',
      'Gemini 3.5 Flash (Low)',
      '--conversation',
      'conv-123',
      '--print-timeout',
      '5m',
      '-p',
      'continue',
    ]);
  });

  test('continueConversation without a session forces --continue', async () => {
    await handler.execute({ prompt: 'go on', continueConversation: true });
    expect(mockedExecuteCommand.mock.calls[0][1]).toEqual([
      '--model',
      'Gemini 3.5 Flash (Low)',
      '--continue',
      '--print-timeout',
      '5m',
      '-p',
      'go on',
    ]);
  });

  test('session first turn is fresh, second turn continues', async () => {
    await handler.execute({ prompt: 'turn 1', sessionId: 'work' });
    expect(mockedExecuteCommand.mock.calls[0][1]).toEqual([
      '--model',
      'Gemini 3.5 Flash (Low)',
      '--print-timeout',
      '5m',
      '-p',
      'turn 1',
    ]);

    await handler.execute({ prompt: 'turn 2', sessionId: 'work' });
    expect(mockedExecuteCommand.mock.calls[1][1]).toEqual([
      '--model',
      'Gemini 3.5 Flash (Low)',
      '--continue',
      '--print-timeout',
      '5m',
      '-p',
      'turn 2',
    ]);
  });

  test('session with stored conversation ID resumes by ID', async () => {
    storage.ensureSession('work');
    storage.setAgyConversationId('work', 'conv-xyz');

    await handler.execute({ prompt: 'continue', sessionId: 'work' });
    expect(mockedExecuteCommand.mock.calls[0][1]).toEqual([
      '--model',
      'Gemini 3.5 Flash (Low)',
      '--conversation',
      'conv-xyz',
      '--print-timeout',
      '5m',
      '-p',
      'continue',
    ]);
  });

  test('resetSession starts a fresh conversation again', async () => {
    await handler.execute({ prompt: 'turn 1', sessionId: 'work' });
    await handler.execute({
      prompt: 'fresh start',
      sessionId: 'work',
      resetSession: true,
    });
    expect(mockedExecuteCommand.mock.calls[1][1]).toEqual([
      '--model',
      'Gemini 3.5 Flash (Low)',
      '--print-timeout',
      '5m',
      '-p',
      'fresh start',
    ]);
  });

  test('stores the explicit conversation ID on the session', async () => {
    await handler.execute({
      prompt: 'hi',
      sessionId: 'work',
      conversationId: 'conv-777',
    });
    expect(storage.getAgyConversationId('work')).toBe('conv-777');
  });

  test('saves a turn to the session', async () => {
    await handler.execute({ prompt: 'hi', sessionId: 'work' });
    expect(storage.getSession('work')?.turns).toHaveLength(1);
  });

  test('writes a conversation log when AGY_MCP_LOG_DIR is set', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'agyhlog-'));
    process.env.AGY_MCP_LOG_DIR = dir;
    try {
      await handler.execute({ prompt: 'logged prompt', sessionId: 'work' });
      const files = readdirSync(dir);
      expect(files).toHaveLength(1);
      const content = readFileSync(path.join(dir, files[0]), 'utf8');
      expect(content).toContain('logged prompt');
      expect(content).toContain('agy reply');
      expect(content).toContain('**session:** work');
    } finally {
      delete process.env.AGY_MCP_LOG_DIR;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('response comes from stdout', async () => {
    const result = await handler.execute({ prompt: 'hi' });
    expect(result.content[0].text).toBe('agy reply');
  });

  test('falls back to stderr when stdout empty', async () => {
    mockedExecuteCommand.mockResolvedValue({ stdout: '', stderr: 'on stderr' });
    const result = await handler.execute({ prompt: 'hi' });
    expect(result.content[0].text).toBe('on stderr');
  });

  test('reports no output when both streams empty', async () => {
    mockedExecuteCommand.mockResolvedValue({ stdout: '', stderr: '' });
    const result = await handler.execute({ prompt: 'hi' });
    expect(result.content[0].text).toBe('No output from agy');
  });

  test('includes mode and session metadata', async () => {
    const result = await handler.execute({ prompt: 'hi', sessionId: 'work' });
    expect(result.content[0]._meta?.mode).toBe('fresh');
    expect(result.content[0]._meta?.sessionId).toBe('work');
    expect(result.structuredContent?.mode).toBe('fresh');
  });

  test('omits structuredContent when not enabled', async () => {
    delete process.env.STRUCTURED_CONTENT_ENABLED;
    const result = await handler.execute({ prompt: 'hi' });
    expect(result.structuredContent).toBeUndefined();
    expect(result.content[0]._meta?.mode).toBe('fresh');
  });

  test('uses streaming execution when a progress token is present', async () => {
    await handler.execute(
      { prompt: 'hi' },
      { progressToken: 'tok', sendProgress: async () => {} }
    );
    expect(mockedExecuteCommandStreaming).toHaveBeenCalledTimes(1);
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
    expect(mockedExecuteCommandStreaming.mock.calls[0][1]).toEqual([
      '--model',
      'Gemini 3.5 Flash (Low)',
      '--print-timeout',
      '5m',
      '-p',
      'hi',
    ]);
    expect(typeof mockedExecuteCommandStreaming.mock.calls[0][2]?.onProgress).toBe(
      'function'
    );
  });

  test('wraps command failures in ToolExecutionError', async () => {
    mockedExecuteCommand.mockRejectedValue(new Error('agy not found'));
    await expect(handler.execute({ prompt: 'hi' })).rejects.toThrow(
      ToolExecutionError
    );
  });

  test('rejects a missing prompt', async () => {
    await expect(handler.execute({})).rejects.toThrow();
  });

  test('rejects an invalid sessionId', async () => {
    await expect(
      handler.execute({ prompt: 'hi', sessionId: 'bad id' })
    ).rejects.toThrow(ValidationError);
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });

  test('rejects an invalid printTimeout', async () => {
    await expect(
      handler.execute({ prompt: 'hi', printTimeout: 'soon' })
    ).rejects.toThrow(ValidationError);
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });
});
