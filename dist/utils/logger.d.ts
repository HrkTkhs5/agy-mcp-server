export interface ConversationLogEntry {
    timestamp: string;
    prompt: string;
    response: string;
    mode: string;
    sessionId?: string;
    conversationId?: string;
    durationMs: number;
    sandbox?: boolean;
    skipPermissions?: boolean;
    addDirs?: string[];
}
/** True when conversation logging is enabled via env. */
export declare function isConversationLoggingEnabled(): boolean;
/**
 * Append one conversation turn to the Markdown transcript when logging is
 * enabled. NEVER throws — a logging failure must not break the agy tool; it is
 * reported to stderr and swallowed.
 */
export declare function appendConversationLog(entry: ConversationLogEntry): void;
//# sourceMappingURL=logger.d.ts.map