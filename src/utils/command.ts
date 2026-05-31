type ProcessEnv = Record<string, string | undefined>;
import { type SpawnOptionsWithoutStdio, spawn } from 'child_process';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import chalk from 'chalk';
import { CommandExecutionError } from '../errors.js';
import { type CommandResult } from '../types.js';

/**
 * Escape argument for Windows shell (cmd.exe)
 */
export function escapeArgForWindows(arg: string): string {
  // Escape percent signs to prevent environment variable expansion
  let escaped = arg.replace(/%/g, '%%');
  // If arg contains spaces or special chars, wrap in double quotes
  if (/[\s"&|<>^%]/.test(arg)) {
    // Escape internal double quotes (CMD-style doubling), then double any run
    // of backslashes that precedes the closing quote so a trailing '\' (e.g. a
    // Windows path arg ending in a separator) cannot escape the closing quote.
    const inner = escaped.replace(/"/g, '""').replace(/(\\+)$/, '$1$1');
    escaped = `"${inner}"`;
  }
  return escaped;
}

const isWindows = process.platform === 'win32';

// Maximum buffer size (10MB) to prevent memory exhaustion from noisy processes
const MAX_BUFFER_SIZE = 10 * 1024 * 1024;

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

/**
 * Write `input` (if any) to the child's stdin and always end the stream.
 * Closing stdin is mandatory for `agy -p`, which otherwise blocks on input.
 */
function feedStdin(
  child: ReturnType<typeof spawn>,
  input: string | undefined
): void {
  if (!child.stdin) return;
  // Swallow EPIPE: the child may exit before consuming all input.
  child.stdin.on('error', () => {});
  if (input != null && input.length > 0) {
    child.stdin.write(input);
  }
  child.stdin.end();
}

export async function executeCommand(
  file: string,
  args: string[] = [],
  options?: CommandOptions
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const escapedArgs = isWindows ? args.map(escapeArgForWindows) : args;

    console.error(chalk.blue('Executing:'), file, escapedArgs.join(' '));

    const spawnOptions: SpawnOptionsWithoutStdio = {
      shell: isWindows,
      env: options?.envOverride
        ? { ...process.env, ...options.envOverride }
        : process.env,
    };

    if (options?.cwd) {
      spawnOptions.cwd = path.resolve(options.cwd);
    }

    const child = spawn(file, escapedArgs, spawnOptions);

    feedStdin(child, options?.input);

    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;

    child.stdout.on('data', (data: Buffer) => {
      if (!stdoutTruncated) {
        const chunk = data.toString();
        if (stdout.length + chunk.length > MAX_BUFFER_SIZE) {
          stdout += chunk.slice(0, MAX_BUFFER_SIZE - stdout.length);
          stdoutTruncated = true;
          console.error(chalk.yellow('Warning: stdout truncated at 10MB'));
        } else {
          stdout += chunk;
        }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      if (!stderrTruncated) {
        const chunk = data.toString();
        if (stderr.length + chunk.length > MAX_BUFFER_SIZE) {
          stderr += chunk.slice(0, MAX_BUFFER_SIZE - stderr.length);
          stderrTruncated = true;
          console.error(chalk.yellow('Warning: stderr truncated at 10MB'));
        } else {
          stderr += chunk;
        }
      }
    });

    child.on('close', (code) => {
      if (stderr) {
        console.error(chalk.yellow('Command stderr:'), stderr);
      }

      // Accept exit code 0 or any output. agy writes its answer to stdout, but
      // we tolerate stderr-only output for robustness across versions.
      if (code === 0 || stdout || stderr) {
        if (code !== 0 && (stdout || stderr)) {
          console.error(
            chalk.yellow('Command failed but produced output, using output')
          );
        }
        resolve({ stdout, stderr });
      } else {
        reject(
          new CommandExecutionError(
            [file, ...args].join(' '),
            `Command failed with exit code ${code}`,
            new Error(stderr || 'Unknown error')
          )
        );
      }
    });

    child.on('error', (error) => {
      reject(
        new CommandExecutionError(
          [file, ...args].join(' '),
          'Command execution failed',
          error
        )
      );
    });
  });
}

/**
 * Execute a command with streaming output support.
 * Calls onProgress callback with each chunk of output for real-time feedback.
 *
 * agy print mode can take many seconds to boot the agent runtime, so streaming
 * keeps the MCP client informed while the model works.
 */
export async function executeCommandStreaming(
  file: string,
  args: string[] = [],
  options: StreamingCommandOptions = {}
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const escapedArgs = isWindows ? args.map(escapeArgForWindows) : args;

    console.error(
      chalk.blue('Executing (streaming):'),
      file,
      escapedArgs.join(' ')
    );

    const spawnOptions: SpawnOptionsWithoutStdio = {
      shell: isWindows,
      env: options.envOverride
        ? { ...process.env, ...options.envOverride }
        : process.env,
    };

    if (options.cwd) {
      spawnOptions.cwd = path.resolve(options.cwd);
    }

    const child = spawn(file, escapedArgs, spawnOptions);

    feedStdin(child, options.input);

    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let lastProgressTime = 0;
    const PROGRESS_DEBOUNCE_MS = 100;

    const sendProgress = (message: string) => {
      if (!options.onProgress) return;
      const now = Date.now();
      if (now - lastProgressTime >= PROGRESS_DEBOUNCE_MS) {
        options.onProgress(message);
        lastProgressTime = now;
      }
    };

    child.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      if (!stdoutTruncated) {
        if (stdout.length + chunk.length > MAX_BUFFER_SIZE) {
          stdout += chunk.slice(0, MAX_BUFFER_SIZE - stdout.length);
          stdoutTruncated = true;
          console.error(chalk.yellow('Warning: stdout truncated at 10MB'));
        } else {
          stdout += chunk;
        }
      }
      sendProgress(chunk.trim());
    });

    child.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      if (!stderrTruncated) {
        if (stderr.length + chunk.length > MAX_BUFFER_SIZE) {
          stderr += chunk.slice(0, MAX_BUFFER_SIZE - stderr.length);
          stderrTruncated = true;
          console.error(chalk.yellow('Warning: stderr truncated at 10MB'));
        } else {
          stderr += chunk;
        }
      }
      sendProgress(chunk.trim());
    });

    child.on('close', (code) => {
      if (options.onProgress && (stdout || stderr)) {
        const finalOutput = stdout || stderr;
        const lastChunk = finalOutput.slice(-500);
        if (lastChunk.trim()) {
          options.onProgress(`[Completed] ${lastChunk.trim().slice(0, 200)}...`);
        }
      }

      if (code === 0 || stdout || stderr) {
        if (code !== 0 && (stdout || stderr)) {
          console.error(
            chalk.yellow('Command failed but produced output, using output')
          );
        }
        resolve({ stdout, stderr });
      } else {
        reject(
          new CommandExecutionError(
            [file, ...args].join(' '),
            `Command exited with code ${code}`,
            new Error(`Exit code: ${code}`)
          )
        );
      }
    });

    child.on('error', (error) => {
      reject(
        new CommandExecutionError(
          [file, ...args].join(' '),
          'Command execution failed',
          error
        )
      );
    });
  });
}
