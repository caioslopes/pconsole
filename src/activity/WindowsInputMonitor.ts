import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ActivityEvent, ActivityHandler, ActivityMonitor } from './ActivityMonitor';
import { AppConfig } from '../config/config';
import { Logger } from '../system/Logger';

const execFileAsync = promisify(execFile);

export class WindowsInputMonitor implements ActivityMonitor {
  private handlers: ActivityHandler[] = [];
  private interval: NodeJS.Timeout | null = null;
  private previousIdleMs: number | null = null;
  private lastEmittedAt = 0;

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger
  ) {}

  onActivity(handler: ActivityHandler): void {
    this.handlers.push(handler);
  }

  async start(): Promise<void> {
    if (this.interval) {
      return;
    }

    if (process.platform !== 'win32') {
      this.logger.warn('Monitor de atividade do Windows indisponivel fora do Windows.');
      return;
    }

    this.logger.info('Monitor de mouse/teclado iniciado.');
    this.interval = setInterval(() => {
      void this.tick();
    }, this.config.pollingIntervalMs);

    await this.tick();
  }

  async stop(): Promise<void> {
    if (!this.interval) {
      return;
    }

    clearInterval(this.interval);
    this.interval = null;
    this.logger.info('Monitor de mouse/teclado parado.');
  }

  private async tick(): Promise<void> {
    try {
      const idleMs = await getWindowsIdleMilliseconds();
      const hadNewInput = this.previousIdleMs !== null && idleMs < this.previousIdleMs;
      this.previousIdleMs = idleMs;

      if (!hadNewInput || idleMs > this.config.activationDebounceMs) {
        return;
      }

      const now = Date.now();
      if (now - this.lastEmittedAt < this.config.activationDebounceMs) {
        return;
      }

      this.lastEmittedAt = now;
      await this.emitActivity({ source: 'unknown', occurredAt: new Date(now) });
    } catch (error: unknown) {
      this.logger.error('Falha ao consultar atividade do Windows.', error);
    }
  }

  private async emitActivity(event: ActivityEvent): Promise<void> {
    await Promise.all(this.handlers.map((handler) => handler(event)));
  }
}

async function getWindowsIdleMilliseconds(): Promise<number> {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class IdleTime {
  [StructLayout(LayoutKind.Sequential)]
  struct LASTINPUTINFO {
    public uint cbSize;
    public uint dwTime;
  }

  [DllImport("user32.dll")]
  static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

  public static uint GetIdleMilliseconds() {
    LASTINPUTINFO info = new LASTINPUTINFO();
    info.cbSize = (uint)System.Runtime.InteropServices.Marshal.SizeOf(info);
    GetLastInputInfo(ref info);
    return ((uint)Environment.TickCount - info.dwTime);
  }
}
"@
[IdleTime]::GetIdleMilliseconds()
`;

  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    script
  ]);

  const idleMs = Number.parseInt(stdout.trim(), 10);
  if (Number.isNaN(idleMs)) {
    throw new Error(`Resposta inesperada do PowerShell: ${stdout}`);
  }

  return idleMs;
}
