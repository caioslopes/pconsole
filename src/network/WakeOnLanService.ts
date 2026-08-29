import dgram from 'node:dgram';
import { Logger } from '../system/Logger';

export interface WakeOnLanOptions {
  macAddress: string;
  broadcastAddress: string;
  port: number;
}

export class WakeOnLanService {
  constructor(private readonly logger: Logger) {}

  async wake(options: WakeOnLanOptions): Promise<void> {
    const packet = createMagicPacket(options.macAddress);

    await new Promise<void>((resolve, reject) => {
      const socket = dgram.createSocket('udp4');

      socket.once('error', (error) => {
        socket.close();
        reject(error);
      });

      socket.bind(() => {
        socket.setBroadcast(true);
        socket.send(packet, options.port, options.broadcastAddress, (error) => {
          socket.close();

          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    });

    this.logger.info(`Pacote Wake-on-LAN enviado para ${options.macAddress}.`);
  }
}

function createMagicPacket(macAddress: string): Buffer {
  const normalizedMac = macAddress.replace(/[:-]/g, '').toLowerCase();

  if (!/^[0-9a-f]{12}$/.test(normalizedMac)) {
    throw new Error(`MAC address invalido: ${macAddress}`);
  }

  const macBytes = Buffer.from(normalizedMac, 'hex');
  const packet = Buffer.alloc(6 + 16 * macBytes.length, 0xff);

  for (let index = 0; index < 16; index += 1) {
    macBytes.copy(packet, 6 + index * macBytes.length);
  }

  return packet;
}
