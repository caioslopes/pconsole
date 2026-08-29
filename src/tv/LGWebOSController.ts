import { TVConfig } from '../config/config';
import { WakeOnLanService } from '../network/WakeOnLanService';
import { Logger } from '../system/Logger';
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
    this.ensureConfigured();
    this.logger.warn('Controle LG webOS ainda nao implementado; comando turnOff ignorado.');
  }

  async setInput(input: string): Promise<void> {
    this.ensureConfigured();
    this.logger.warn(`Controle LG webOS ainda nao implementado; comando setInput(${input}) ignorado.`);
  }

  async getPowerState(): Promise<TVPowerState> {
    this.ensureConfigured();
    return 'unknown';
  }

  private ensureConfigured(): void {
    if (!this.config.host) {
      throw new Error('Host/IP da TV LG nao configurado.');
    }
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
