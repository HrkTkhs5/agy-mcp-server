import { type ServerConfig } from './types.js';
export declare class AgyMcpServer {
    private readonly server;
    private readonly config;
    constructor(config: ServerConfig);
    private setupHandlers;
    private isValidToolName;
    start(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map