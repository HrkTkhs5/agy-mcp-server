import { randomUUID } from 'crypto';
import { TOOLS } from '../types.js';
import { ValidationError } from '../errors.js';
export class InMemorySessionStorage {
    sessions = new Map();
    maxSessions = 100;
    sessionTtl = 24 * 60 * 60 * 1000; // 24 hours
    maxSessionIdLength = 256;
    sessionIdPattern = /^[a-zA-Z0-9_-]+$/;
    createSession() {
        this.cleanupExpiredSessions();
        const sessionId = randomUUID();
        const now = new Date();
        this.sessions.set(sessionId, {
            id: sessionId,
            createdAt: now,
            lastAccessedAt: now,
            turns: [],
        });
        this.enforceMaxSessions();
        return sessionId;
    }
    ensureSession(sessionId) {
        this.cleanupExpiredSessions();
        if (!sessionId ||
            sessionId.length > this.maxSessionIdLength ||
            !this.sessionIdPattern.test(sessionId)) {
            throw new ValidationError(TOOLS.AGY, 'Session ID must be 1-256 characters and contain only letters, numbers, hyphens, and underscores');
        }
        const existing = this.sessions.get(sessionId);
        if (existing) {
            existing.lastAccessedAt = new Date();
            return;
        }
        const now = new Date();
        this.sessions.set(sessionId, {
            id: sessionId,
            createdAt: now,
            lastAccessedAt: now,
            turns: [],
        });
        this.enforceMaxSessions();
    }
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastAccessedAt = new Date();
        }
        return session;
    }
    updateSession(sessionId, data) {
        const session = this.sessions.get(sessionId);
        if (session) {
            Object.assign(session, data);
            session.lastAccessedAt = new Date();
        }
    }
    deleteSession(sessionId) {
        return this.sessions.delete(sessionId);
    }
    listSessions() {
        this.cleanupExpiredSessions();
        return Array.from(this.sessions.values()).sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime());
    }
    addTurn(sessionId, turn) {
        const session = this.sessions.get(sessionId);
        if (session) {
            if (!Array.isArray(session.turns)) {
                session.turns = [];
            }
            session.turns.push(turn);
            session.lastAccessedAt = new Date();
        }
    }
    resetSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.turns = [];
            session.agyConversationId = undefined;
            session.lastAccessedAt = new Date();
        }
    }
    setAgyConversationId(sessionId, conversationId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.agyConversationId = conversationId;
            session.lastAccessedAt = new Date();
        }
    }
    getAgyConversationId(sessionId) {
        const session = this.sessions.get(sessionId);
        return session?.agyConversationId;
    }
    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions) {
            if (now - session.lastAccessedAt.getTime() > this.sessionTtl) {
                this.sessions.delete(sessionId);
            }
        }
    }
    enforceMaxSessions() {
        if (this.sessions.size <= this.maxSessions)
            return;
        const sessions = this.listSessions();
        const sessionsToDelete = sessions.slice(this.maxSessions);
        for (const session of sessionsToDelete) {
            this.sessions.delete(session.id);
        }
    }
}
//# sourceMappingURL=storage.js.map