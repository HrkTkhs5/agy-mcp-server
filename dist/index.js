#!/usr/bin/env node
import chalk from 'chalk';
import { AgyMcpServer } from './server.js';
const SERVER_CONFIG = {
    name: 'agy-mcp-server',
    version: '0.1.0',
};
async function main() {
    try {
        const server = new AgyMcpServer(SERVER_CONFIG);
        await server.start();
    }
    catch (error) {
        console.error(chalk.red('Failed to start server:'), error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map