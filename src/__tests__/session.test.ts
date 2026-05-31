import { InMemorySessionStorage } from '../session/storage.js';

describe('InMemorySessionStorage', () => {
  let storage: InMemorySessionStorage;

  beforeEach(() => {
    storage = new InMemorySessionStorage();
  });

  test('should create a new session', () => {
    const sessionId = storage.createSession();
    expect(typeof sessionId).toBe('string');

    const session = storage.getSession(sessionId);
    expect(session?.id).toBe(sessionId);
    expect(session?.turns).toEqual([]);
  });

  test('should add turns to a session', () => {
    const sessionId = storage.createSession();
    const turn = {
      prompt: 'Hello',
      response: 'Hi there!',
      timestamp: new Date(),
    };

    storage.addTurn(sessionId, turn);

    expect(storage.getSession(sessionId)?.turns).toHaveLength(1);
    expect(storage.getSession(sessionId)?.turns[0]).toEqual(turn);
  });

  test('ensureSession validates the session ID format', () => {
    expect(() => storage.ensureSession('bad id')).toThrow();
    expect(() => storage.ensureSession('good-id_123')).not.toThrow();
  });

  test('ensureSession is idempotent for the same ID', () => {
    storage.ensureSession('my-session');
    storage.addTurn('my-session', {
      prompt: 'p',
      response: 'r',
      timestamp: new Date(),
    });
    storage.ensureSession('my-session');
    expect(storage.getSession('my-session')?.turns).toHaveLength(1);
  });

  test('should store and read an agy conversation ID', () => {
    const sessionId = storage.createSession();
    storage.setAgyConversationId(sessionId, 'conv-abc');
    expect(storage.getAgyConversationId(sessionId)).toBe('conv-abc');
  });

  test('should reset a session (turns + conversation ID)', () => {
    const sessionId = storage.createSession();
    storage.addTurn(sessionId, {
      prompt: 'Test',
      response: 'Response',
      timestamp: new Date(),
    });
    storage.setAgyConversationId(sessionId, 'conv-abc');

    storage.resetSession(sessionId);

    expect(storage.getSession(sessionId)?.turns).toHaveLength(0);
    expect(storage.getAgyConversationId(sessionId)).toBeUndefined();
  });

  test('should list all sessions', () => {
    const a = storage.createSession();
    const b = storage.createSession();
    const ids = storage.listSessions().map((s) => s.id);
    expect(ids).toContain(a);
    expect(ids).toContain(b);
  });

  test('should delete a session', () => {
    const sessionId = storage.createSession();
    expect(storage.deleteSession(sessionId)).toBe(true);
    expect(storage.getSession(sessionId)).toBeUndefined();
  });

  test('should return false when deleting non-existent session', () => {
    expect(storage.deleteSession('nope')).toBe(false);
  });
});
