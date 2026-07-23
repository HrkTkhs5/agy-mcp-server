import { type ToolResult, type ToolHandlerContext } from '../types.js';
import { type SessionStorage } from '../session/storage.js';
export declare class AgyToolHandler {
    private sessionStorage;
    constructor(sessionStorage: SessionStorage);
    execute(args: unknown, context?: ToolHandlerContext): Promise<ToolResult>;
}
export declare class PingToolHandler {
    execute(args: unknown, _context?: ToolHandlerContext): Promise<ToolResult>;
}
export declare class HelpToolHandler {
    execute(args: unknown, _context?: ToolHandlerContext): Promise<ToolResult>;
}
export declare class ChangelogToolHandler {
    execute(args: unknown, _context?: ToolHandlerContext): Promise<ToolResult>;
}
export declare class ListSessionsToolHandler {
    private sessionStorage;
    constructor(sessionStorage: SessionStorage);
    execute(args: unknown, _context?: ToolHandlerContext): Promise<ToolResult>;
}
export declare const toolHandlers: {
    readonly agy: AgyToolHandler;
    readonly ping: PingToolHandler;
    readonly help: HelpToolHandler;
    readonly listSessions: ListSessionsToolHandler;
    readonly changelog: ChangelogToolHandler;
};
//# sourceMappingURL=handlers.d.ts.map