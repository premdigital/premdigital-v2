// src/utils/system.ts
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

function maskSensitiveParts(command: string): string {
  // Mask common password patterns like: echo "user:pass" | chpasswd
  try {
    return command.replace(/echo\s+(["'`])(.+?)\1\s*\|\s*chpasswd/gi, 'echo [REDACTED] | chpasswd')
                  .replace(/--password=\S+/gi, '--password=[REDACTED]')
                  .replace(/(-p\s+)([^\s]+)/gi, '$1[REDACTED]');
  } catch (e) {
    return '[REDACTED]';
  }
}

export async function runCommand(command: string, options?: { maxBuffer?: number }): Promise<string> {
  // NOTE: This helper preserves the existing behavior (returns empty string on failure)
  // but improves logging (masks sensitive parts) and allows a larger maxBuffer.
  try {
    const maxBuffer = options?.maxBuffer ?? 10 * 1024 * 1024; // 10MB
    const { stdout } = await execPromise(command, { maxBuffer });
    return stdout.toString().trim();
  } catch (error: any) {
    // Avoid logging raw command that may contain secrets
    const masked = maskSensitiveParts(command);
    // Keep the error message concise
    console.error(`[Error Command]: ${masked} -> ${error && error.message ? error.message : String(error)}`);
    return "";
  }
}

// Safer alternative for callers that can provide argument arrays (avoids a shell)
export function runCommandArgs(cmd: string, args: string[], options?: { cwd?: string, timeout?: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false, cwd: options?.cwd, timeout: options?.timeout });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });

    child.on('error', (err) => {
      console.error(`[Error spawn]: ${cmd} ${args.join(' ')} -> ${err.message}`);
      resolve(''); // keep existing caller semantics: return empty on failure
    });

    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else {
        // Don't expose stderr content that may contain secrets; log a short message
        console.error(`[Exit ${code}] ${cmd} ${args[0] ?? ''}`);
        resolve('');
      }
    });
  });
}

// Escape string for safe insertion into a sed pattern or basic regex
export function escapeForSed(input: string): string {
  return input.replace(/[\\/&]/g, (m) => `\\${m}`);
}

// Username validation: allow letters, numbers, underscore, hyphen; 1-32 chars. Start with alnum.
export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const regex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/;
  return regex.test(username);
}
