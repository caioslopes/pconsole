import net from 'node:net';

export interface TcpProbeResult {
  host: string;
  port: number;
  reachable: boolean;
  elapsedMs: number;
  error: string | null;
}

export async function probeTcpPort(host: string, port: number, timeoutMs = 3000): Promise<TcpProbeResult> {
  const startedAt = Date.now();

  return new Promise<TcpProbeResult>((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const finish = (reachable: boolean, error: string | null): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      socket.removeAllListeners();
      socket.destroy();
      resolve({
        host,
        port,
        reachable,
        elapsedMs: Date.now() - startedAt,
        error
      });
    };

    const timeout = setTimeout(() => {
      finish(false, 'timeout');
    }, timeoutMs);

    socket.once('connect', () => {
      finish(true, null);
    });

    socket.once('error', (error) => {
      finish(false, error.message);
    });
  });
}
