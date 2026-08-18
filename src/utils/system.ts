// src/utils/system.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function runCommand(command: string): Promise<string> {
    try {
        const { stdout } = await execPromise(command);
        return stdout.trim();
    } catch (error) {
        console.error(`[Error Command]: ${command}`, error);
        return "";
    }
}

// Mencegah spasi atau karakter aneh yang bisa merusak server
export function isValidUsername(username: string): boolean {
    const regex = /^[a-zA-Z0-9]+$/;
    return regex.test(username);
}