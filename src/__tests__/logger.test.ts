import {
  appendConversationLog,
  isConversationLoggingEnabled,
} from '../utils/logger.js';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const BASE_ENTRY = {
  timestamp: '2026-05-31T14:30:00.000Z',
  prompt: 'hello agy',
  response: 'hi claude',
  mode: 'fresh',
  sessionId: 's1',
  conversationId: undefined,
  durationMs: 1234,
  sandbox: false,
  skipPermissions: false,
  addDirs: [] as string[],
};

describe('appendConversationLog', () => {
  let dir: string;
  let savedDir: string | undefined;
  let savedFile: string | undefined;

  beforeEach(() => {
    savedDir = process.env.AGY_MCP_LOG_DIR;
    savedFile = process.env.AGY_MCP_LOG_FILE;
    delete process.env.AGY_MCP_LOG_DIR;
    delete process.env.AGY_MCP_LOG_FILE;
    dir = mkdtempSync(path.join(tmpdir(), 'agylog-'));
  });

  afterEach(() => {
    if (savedDir) process.env.AGY_MCP_LOG_DIR = savedDir;
    else delete process.env.AGY_MCP_LOG_DIR;
    if (savedFile) process.env.AGY_MCP_LOG_FILE = savedFile;
    else delete process.env.AGY_MCP_LOG_FILE;
    rmSync(dir, { recursive: true, force: true });
  });

  test('is disabled and writes nothing when no env is set', () => {
    expect(isConversationLoggingEnabled()).toBe(false);
    appendConversationLog(BASE_ENTRY);
    expect(readdirSync(dir)).toHaveLength(0);
  });

  test('AGY_MCP_LOG_DIR writes a dated markdown file with full content', () => {
    process.env.AGY_MCP_LOG_DIR = dir;
    expect(isConversationLoggingEnabled()).toBe(true);
    appendConversationLog(BASE_ENTRY);

    const files = readdirSync(dir);
    expect(files).toContain('agy-conversations-2026-05-31.md');
    const content = readFileSync(
      path.join(dir, 'agy-conversations-2026-05-31.md'),
      'utf8'
    );
    expect(content).toContain('hello agy');
    expect(content).toContain('hi claude');
    expect(content).toContain('mode: fresh');
    expect(content).toContain('**session:** s1');
    expect(content).toContain('**duration:** 1234 ms');
    expect(content).toContain('conversationId:** (none)');
  });

  test('appends multiple turns into the same daily file', () => {
    process.env.AGY_MCP_LOG_DIR = dir;
    appendConversationLog(BASE_ENTRY);
    appendConversationLog({ ...BASE_ENTRY, prompt: 'second turn' });

    const file = readdirSync(dir)[0];
    const content = readFileSync(path.join(dir, file), 'utf8');
    expect(content).toContain('hello agy');
    expect(content).toContain('second turn');
    expect((content.match(/^## /gm) || []).length).toBe(2);
  });

  test('AGY_MCP_LOG_FILE overrides the directory with a single file', () => {
    const file = path.join(dir, 'custom.md');
    process.env.AGY_MCP_LOG_FILE = file;
    appendConversationLog(BASE_ENTRY);
    expect(readFileSync(file, 'utf8')).toContain('hello agy');
  });

  test('never throws on an invalid path', () => {
    process.env.AGY_MCP_LOG_FILE = '/no\0pe/bad.md';
    expect(() => appendConversationLog(BASE_ENTRY)).not.toThrow();
  });
});
