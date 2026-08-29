export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

export class ConsoleLogger implements Logger {
  debug(message: string, meta?: unknown): void {
    this.write('debug', message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.write('error', message, meta);
  }

  private write(level: string, message: string, meta?: unknown): void {
    const timestamp = new Date().toISOString();
    const suffix = meta === undefined ? '' : ` ${formatMeta(meta)}`;
    process.stdout.write(`[${timestamp}] ${level.toUpperCase()} ${message}${suffix}\n`);
  }
}

function formatMeta(meta: unknown): string {
  if (meta instanceof Error) {
    return meta.stack ?? meta.message;
  }

  if (typeof meta === 'string') {
    return meta;
  }

  return JSON.stringify(meta);
}
