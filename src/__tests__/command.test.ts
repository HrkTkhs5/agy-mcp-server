import { executeCommand, escapeArgForWindows } from '../utils/command.js';

// These are real spawn tests that validate the stdin-piping behaviour that
// `agy -p` depends on. Skipped on Windows where the helper binaries differ.
const onPosix = process.platform !== 'win32' ? describe : describe.skip;

onPosix('executeCommand stdin handling', () => {
  test('pipes input to the child process stdin', async () => {
    const result = await executeCommand('cat', [], { input: 'hello-stdin' });
    expect(result.stdout).toBe('hello-stdin');
  });

  test('closes stdin so a reader exits instead of hanging', async () => {
    // `cat` with no input must see EOF and exit; if stdin were left open this
    // would hang until the test timeout.
    const result = await executeCommand('cat', [], { input: '' });
    expect(result.stdout).toBe('');
  });

  test('captures stdout from a normal command', async () => {
    const result = await executeCommand('printf', ['%s', 'ok']);
    expect(result.stdout).toBe('ok');
  });

  test('rejects when the binary does not exist', async () => {
    await expect(
      executeCommand('this-binary-does-not-exist-xyz', [])
    ).rejects.toThrow();
  });
});

describe('escapeArgForWindows', () => {
  test('leaves a simple arg untouched', () => {
    expect(escapeArgForWindows('simple')).toBe('simple');
  });

  test('quotes args containing spaces', () => {
    expect(escapeArgForWindows('hello world')).toBe('"hello world"');
  });

  test('doubles percent signs to block env expansion', () => {
    expect(escapeArgForWindows('a%b')).toBe('"a%%b"');
  });

  test('doubles a trailing backslash so it cannot escape the closing quote', () => {
    // input: a b\  -> must become "a b\\" (backslash doubled before the quote)
    expect(escapeArgForWindows('a b\\')).toBe('"a b\\\\"');
  });

  test('escapes internal double quotes CMD-style', () => {
    expect(escapeArgForWindows('say "hi"')).toBe('"say ""hi"""');
  });
});
