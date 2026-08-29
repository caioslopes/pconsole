import { Logger } from '../system/Logger';
import { TVController, TVPowerState } from './TVController';

export class MockTVController implements TVController {
  private powerState: TVPowerState = 'off';

  constructor(private readonly logger: Logger) {}

  async turnOn(): Promise<void> {
    this.powerState = 'on';
    this.logger.info('[TV mock] TV ligada.');
  }

  async turnOff(): Promise<void> {
    this.powerState = 'off';
    this.logger.info('[TV mock] TV desligada.');
  }

  async setInput(input: string): Promise<void> {
    this.logger.info(`[TV mock] Entrada selecionada: ${input}.`);
  }

  async getPowerState(): Promise<TVPowerState> {
    return this.powerState;
  }
}
