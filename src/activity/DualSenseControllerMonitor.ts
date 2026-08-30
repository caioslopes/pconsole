import { Device, devices, HID } from 'node-hid';
import { ActivityEvent, ActivityHandler, ActivityMonitor } from './ActivityMonitor';
import { AppConfig, ControllerConfig } from '../config/config';
import { Logger } from '../system/Logger';

interface OpenController {
  device: HID;
  key: string;
  lastReport: Buffer | null;
  openedAt: number;
}

export class DualSenseControllerMonitor implements ActivityMonitor {
  private handlers: ActivityHandler[] = [];
  private controllers = new Map<string, OpenController>();
  private scanTimer: NodeJS.Timeout | null = null;
  private lastEmittedAt = 0;

  constructor(
    private readonly appConfig: AppConfig,
    private readonly controllerConfig: ControllerConfig,
    private readonly logger: Logger
  ) {}

  onActivity(handler: ActivityHandler): void {
    this.handlers.push(handler);
  }

  async start(): Promise<void> {
    if (!this.controllerConfig.enabled) {
      this.logger.warn('Monitor de controle wireless desabilitado por configuracao.');
      return;
    }

    this.logger.info('Monitor de controle wireless iniciado.');
    this.scanForControllers();
    this.scanTimer = setInterval(() => {
      this.scanForControllers();
    }, this.controllerConfig.scanIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    for (const controller of this.controllers.values()) {
      controller.device.close();
    }

    this.controllers.clear();
    this.logger.info('Monitor de controle wireless parado.');
  }

  private scanForControllers(): void {
    const matchingDevices = listControllerDevices(this.controllerConfig);
    const activeKeys = new Set<string>();

    for (const device of matchingDevices) {
      const key = getDeviceKey(device);
      activeKeys.add(key);

      if (!device.path || this.controllers.has(key)) {
        continue;
      }

      this.openController(device, key);
    }

    for (const [key, controller] of this.controllers) {
      if (!activeKeys.has(key)) {
        controller.device.close();
        this.controllers.delete(key);
        this.logger.info(`Controle desconectado: ${key}.`);
      }
    }
  }

  private openController(device: Device, key: string): void {
    if (!device.path) {
      return;
    }

    try {
      const hid = new HID(device.path);
      const controller: OpenController = {
        device: hid,
        key,
        lastReport: null,
        openedAt: Date.now()
      };

      hid.on('data', (report: Buffer) => {
        void this.handleReport(controller, report);
      });

      hid.on('error', (error: Error) => {
        this.logger.warn(`Erro lendo controle ${key}.`, error);
        this.controllers.delete(key);
      });

      this.controllers.set(key, controller);
      this.logger.info(`Controle conectado: ${describeDevice(device)}.`);
    } catch (error: unknown) {
      this.logger.warn(`Nao foi possivel abrir controle ${describeDevice(device)}.`, error);
    }
  }

  private async handleReport(controller: OpenController, report: Buffer): Promise<void> {
    const now = Date.now();

    if (now - controller.openedAt < this.controllerConfig.warmupMs) {
      controller.lastReport = Buffer.from(report);
      return;
    }

    if (controller.lastReport && controller.lastReport.equals(report)) {
      return;
    }

    controller.lastReport = Buffer.from(report);

    if (now - this.lastEmittedAt < this.appConfig.activationDebounceMs) {
      return;
    }

    this.lastEmittedAt = now;
    await this.emitActivity({ source: 'controller', occurredAt: new Date(now) });
  }

  private async emitActivity(event: ActivityEvent): Promise<void> {
    await Promise.all(this.handlers.map((handler) => handler(event)));
  }
}

export function listControllerDevices(config: ControllerConfig): Device[] {
  const productIds = new Set(config.productIds);

  return devices().filter((device) => {
    if (device.vendorId !== config.vendorId) {
      return false;
    }

    return productIds.size === 0 || productIds.has(device.productId);
  });
}

function getDeviceKey(device: Device): string {
  return device.path ?? `${device.vendorId}:${device.productId}:${device.serialNumber ?? 'unknown'}`;
}

function describeDevice(device: Device): string {
  const vendorId = `0x${device.vendorId.toString(16).padStart(4, '0')}`;
  const productId = `0x${device.productId.toString(16).padStart(4, '0')}`;
  const product = device.product ?? 'dispositivo HID';
  const manufacturer = device.manufacturer ?? 'fabricante desconhecido';

  return `${manufacturer} ${product} (${vendorId}:${productId})`;
}
