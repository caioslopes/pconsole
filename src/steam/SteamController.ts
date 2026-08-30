import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { SteamConfig } from '../config/config';
import { Logger } from '../system/Logger';
import { isSteamBigPictureOpen } from './SteamDiagnostics';

const execFileAsync = promisify(execFile);

export class SteamController {
  constructor(
    private readonly config: SteamConfig,
    private readonly logger: Logger
  ) {}

  async openBigPicture(): Promise<void> {
    if (await this.isRunning()) {
      this.logger.info('Steam ja esta em execucao; solicitando Big Picture.');
      await this.openBigPictureUri();
      return;
    }

    if (!this.config.executablePath) {
      throw new Error('Caminho da Steam nao configurado.');
    }

    this.logger.info('Abrindo Steam em Big Picture.');
    const child = spawn(this.config.executablePath, this.config.launchArgs, {
      detached: true,
      stdio: 'ignore'
    });

    child.unref();
  }

  async isRunning(): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq steam.exe']);
        return stdout.toLowerCase().includes('steam.exe');
      }

      const processName = process.platform === 'darwin' ? 'Steam' : 'steam';
      await execFileAsync('pgrep', ['-x', processName]);
      return true;
    } catch {
      return false;
    }
  }

  async isBigPictureOpen(): Promise<boolean> {
    return isSteamBigPictureOpen();
  }

  private async openBigPictureUri(): Promise<void> {
    if (process.platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '', 'steam://open/bigpicture'], {
        detached: true,
        stdio: 'ignore'
      }).unref();
      return;
    }

    if (process.platform === 'darwin') {
      await execFileAsync('open', ['steam://open/bigpicture']);
      return;
    }

    spawn('xdg-open', ['steam://open/bigpicture'], {
      detached: true,
      stdio: 'ignore'
    }).unref();
  }
}
