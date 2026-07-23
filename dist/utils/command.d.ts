type ProcessEnv = Record<string, string | undefined>;
import { type CommandResult } from '../types.js';
/**
 * Escape argument for Windows shell (cmd.exe)
 */
export declare function escapeArgForWindows(arg: string): string;
export type ProgressCallback = (message: string) => void;
export interface CommandOptions {
    envOverride?: ProcessEnv;
    cwd?: string;
    /**
     * Optional data to write to the child's stdin before closing it.
     *
     * The agy handler passes the prompt as the `-p` flag value, not via stdin, so
     * this is normally unused. stdin is ALWAYS closed regardless (see feedStdin):
     * `agy -p` will block forever if stdin never reaches EOF.
     */
    input?: string;
}
export interface StreamingCommandOptions extends CommandOptions {
    onProgress?: ProgressCallback;
}
export declare function executeCommand(file: string, args?: string[], options?: CommandOptions): Promise<CommandResult>;
/**
 * Execute a command with streaming output support.
 * Calls onProgress callback with each chunk of output for real-time feedback.
 *
 * agy print mode can take many seconds to boot the agent runtime, so streaming
 * keeps the MCP client informed while the model works.
 */
export declare function executeCommandStreaming(file: string, args?: string[], options?: StreamingCommandOptions): Promise<CommandResult>;
export {};
//# sourceMappingURL=command.d.ts.map