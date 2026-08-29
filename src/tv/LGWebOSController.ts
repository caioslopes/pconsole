import { TVConfig } from '../config/config';
import { WakeOnLanService } from '../network/WakeOnLanService';
import { Logger } from '../system/Logger';
import { LGWebOSClient, LGWebOSExternalInput } from './LGWebOSClient';
import { TVController, TVPowerState } from './TVController';

export class LGWebOSController implements TVController {
  private readonly wakeOnLan: WakeOnLanService;

  constructor(
    private readonly config: TVConfig,
    private readonly logger: Logger
  ) {
    this.wakeOnLan = new WakeOnLanService(logger);
  }

  async turnOn(): Promise<void> {
    const macAddress = this.getWakeOnLanMacAddress();

    await this.wakeOnLan.wake({
      macAddress,
      broadcastAddress: this.config.wakeOnLanBroadcastAddress,
      port: this.config.wakeOnLanPort
    });

    if (this.config.powerOnDelayMs > 0) {
      this.logger.info(`Aguardando ${this.config.powerOnDelayMs}ms para a TV inicializar.`);
      await delay(this.config.powerOnDelayMs);
    }
  }

  async turnOff(): Promise<void> {
    const client = this.createClient();
    try {
      await client.turnOff();
    } finally {
      await client.close();
    }
  }

  async setInput(input: string): Promise<void> {
    const client = this.createClient();
    try {
      await client.switchInput(input);
      this.logger.info(`Entrada da TV alterada para ${input}.`);
    } finally {
      await client.close();
    }
  }

  async getPowerState(): Promise<TVPowerState> {
    this.ensureConfigured();
    return 'unknown';
  }

  async pair(): Promise<string | null> {
    const client = this.createClient({ allowMissingClientKey: true, forcePairing: true });
    try {
      return await client.register();
    } finally {
      await client.close();
    }
  }

  async listExternalInputs(): Promise<LGWebOSExternalInput[]> {
    const client = this.createClient();
    try {
      return await client.listExternalInputs();
    } finally {
      await client.close();
    }
  }

  private ensureConfigured(): void {
    if (!this.config.host) {
      throw new Error('Host/IP da TV LG nao configurado.');
    }
  }

  private ensureClientKeyConfigured(): void {
    if (!this.config.clientKey) {
      throw new Error('clientKey da TV LG nao configurada. Rode npm run tv:pair e aceite o pareamento na TV.');
    }
  }

  private createClient(options?: { allowMissingClientKey?: boolean; forcePairing?: boolean }): LGWebOSClient {
    const host = this.getHost();

    if (!options?.allowMissingClientKey) {
      this.ensureClientKeyConfigured();
    }

    return new LGWebOSClient(
      {
        host,
        clientKey: this.config.clientKey,
        forcePairing: options?.forcePairing
      },
      this.logger
    );
  }

  private getHost(): string {
    if (!this.config.host) {
      throw new Error('Host/IP da TV LG nao configurado.');
    }

    return this.config.host;
  }

  private getWakeOnLanMacAddress(): string {
    if (!this.config.macAddress) {
      throw new Error('MAC address da TV LG nao configurado.');
    }

    return this.config.macAddress;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
