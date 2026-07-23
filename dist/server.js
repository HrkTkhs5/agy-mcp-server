import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import chalk from 'chalk';
import { TOOLS, } from './types.js';
import { handleError } from './errors.js';
import { toolDefinitions } from './tools/definitions.js';
import { toolHandlers } from './tools/handlers.js';
export class AgyMcpServer {
    server;
    config;
    constructor(config) {
        this.config = config;
        this.server = new Server({
            name: config.name,
            version: config.version,
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
        // List tools handler
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return { tools: toolDefinitions };
        });
        // Call tool handler
        this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
            const { name, arguments: args } = request.params;
            const progressToken = request.params._meta?.progressToken;
            // Create progress sender that uses MCP notifications
            const createProgressContext = () => {
                let progressCount = 0;
                return {
                    progressToken,
                    sendProgress: async (message, progress, total) => {
                        if (!progressToken)
                            return;
                        progressCount++;
                        try {
                            await extra.sendNotification({
                                method: 'notifications/progress',
                                params: {
                                    progressToken,
                                    progress: progress ?? progressCount,
                                    total,
                                    message,
                                },
                            });
                        }
                        catch (err) {
                            console.error(chalk.yellow('Failed to send progress notification:'), err);
                        }
                    },
                };
            };
            try {
                if (!this.isValidToolName(name)) {
                    throw new Error(`Unknown tool: ${name}`);
                }
                const handler = toolHandlers[name];
                const context = createProgressContext();
                return await handler.execute(args, context);
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: handleError(error, `tool "${name}"`),
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    isValidToolName(name) {
        return Object.values(TOOLS).includes(name);
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error(chalk.green(`${this.config.name} started successfully`));
    }
}
//# sourceMappingURL=server.js.map