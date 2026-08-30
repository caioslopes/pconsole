import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const startupFileName = 'pconsole.cmd';

export interface StartupStatus {
  supported: boolean;
  installed: boolean;
  startupDirectory: string | null;
  startupFilePath: string | null;
}

export class WindowsStartupManager {
  async install(projectDirectory: string): Promise<string> {
    this.ensureWindows();

    const startupDirectory = await this.getStartupDirectory();
    const startupFilePath = path.join(startupDirectory, startupFileName);
    const command = createStartupCommand(projectDirectory);

    await fs.writeFile(startupFilePath, command, 'utf8');
    return startupFilePath;
  }

  async uninstall(): Promise<string | null> {
    this.ensureWindows();

    const startupDirectory = await this.getStartupDirectory();
    const startupFilePath = path.join(startupDirectory, startupFileName);

    try {
      await fs.unlink(startupFilePath);
      return startupFilePath;
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  async getStatus(): Promise<StartupStatus> {
    if (process.platform !== 'win32') {
      return {
        supported: false,
        installed: false,
        startupDirectory: null,
        startupFilePath: null
      };
    }

    const startupDirectory = await this.getStartupDirectory();
    const startupFilePath = path.join(startupDirectory, startupFileName);

    return {
      supported: true,
      installed: await fileExists(startupFilePath),
      startupDirectory,
      startupFilePath
    };
  }

  private ensureWindows(): void {
    if (process.platform !== 'win32') {
      throw new Error('Startup automatico esta disponivel apenas no Windows.');
    }
  }

  private async getStartupDirectory(): Promise<string> {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '[Environment]::GetFolderPath("Startup")'
    ]);

    const startupDirectory = stdout.trim();
    if (!startupDirectory) {
      throw new Error('Nao foi possivel localizar a pasta de Inicializar do Windows.');
    }

    return startupDirectory;
  }
}

function createStartupCommand(projectDirectory: string): string {
  const logDirectory = path.join(projectDirectory, 'logs');
  const logFile = path.join(logDirectory, 'pconsole-startup.log');

  return [
    '@echo off',
    `cd /d "${projectDirectory}"`,
    `if not exist "${logDirectory}" mkdir "${logDirectory}"`,
    `npm run tray >> "${logFile}" 2>&1`
  ].join('\r\n');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
