import { ActivityEvent, ActivityMonitor } from '../activity/ActivityMonitor';
import { AppConfig } from '../config/config';
import { GamingStateMachine } from '../state/GamingStateMachine';
import { SteamController } from '../steam/SteamController';
import { Logger } from '../system/Logger';
import { TVController } from '../tv/TVController';

interface GamingEnvironmentServiceDependencies {
  activityMonitor: ActivityMonitor;
  config: AppConfig;
  logger: Logger;
  steam: SteamController;
  tvInput: string;
  tv: TVController;
}

export class GamingEnvironmentService {
  private readonly stateMachine: GamingStateMachine;
  private readonly activityMonitor: ActivityMonitor;
  private readonly config: AppConfig;
  private readonly logger: Logger;
  private readonly steam: SteamController;
  private readonly tv: TVController;
  private readonly tvInput: string;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private steamExitTimer: NodeJS.Timeout | null = null;
  private activatedAt: number | null = null;

  constructor(dependencies: GamingEnvironmentServiceDependencies) {
    this.activityMonitor = dependencies.activityMonitor;
    this.config = dependencies.config;
    this.logger = dependencies.logger;
    this.steam = dependencies.steam;
    this.tv = dependencies.tv;
    this.tvInput = dependencies.tvInput;
    this.stateMachine = new GamingStateMachine(this.logger);
  }

  async start(): Promise<void> {
    this.activityMonitor.onActivity((event) => this.handleActivity(event));
    await this.activityMonitor.start();
    this.logger.info('pconsole iniciado em modo idle.');
  }

  async stop(): Promise<void> {
    this.clearInactivityTimer();
    this.clearSteamExitTimer();
    await this.activityMonitor.stop();
  }

  async activateConsoleMode(): Promise<void> {
    if (this.stateMachine.state === 'active') {
      this.logger.info('Modo console ja esta ativo.');
      this.scheduleInactivityCheck();
      return;
    }

    if (this.stateMachine.state !== 'idle') {
      this.logger.warn(`Ignorando ativacao porque o estado atual e ${this.stateMachine.state}.`);
      return;
    }

    await this.activate();
  }

  async deactivateConsoleMode(reason = 'manual'): Promise<void> {
    await this.deactivate(reason);
  }

  private async handleActivity(event: ActivityEvent): Promise<void> {
    this.logger.info(`Atividade detectada: ${event.source}.`);

    if (!this.config.autoActivationEnabled) {
      this.logger.info('Ativacao automatica desabilitada; atividade ignorada.');
      return;
    }

    if (this.stateMachine.state === 'idle') {
      await this.activateConsoleMode();
      return;
    }

    if (this.stateMachine.state === 'active') {
      this.scheduleInactivityCheck();
    }
  }

  private async activate(): Promise<void> {
    try {
      this.stateMachine.transitionTo('activating');
      await this.tv.turnOn();
      await this.tv.setInput(this.tvInput);
      await this.steam.openBigPicture();
      this.activatedAt = Date.now();
      this.stateMachine.transitionTo('active');
      this.scheduleInactivityCheck();
      this.scheduleSteamExitCheck();
    } catch (error: unknown) {
      this.logger.error('Falha ao ativar modo console.', error);
      this.stateMachine.transitionTo('error');
      this.stateMachine.transitionTo('idle');
    }
  }

  private scheduleInactivityCheck(): void {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      void this.deactivate('inactivity-timeout');
    }, this.config.inactivityTimeoutMs);
  }

  private scheduleSteamExitCheck(): void {
    this.clearSteamExitTimer();

    if (!this.config.exitWhenSteamCloses) {
      return;
    }

    this.steamExitTimer = setInterval(() => {
      void this.checkGamingModeExit();
    }, this.config.steamExitPollingIntervalMs);
  }

  private async checkGamingModeExit(): Promise<void> {
    if (this.stateMachine.state !== 'active') {
      return;
    }

    if (this.isWithinSteamExitGracePeriod()) {
      return;
    }

    if (this.config.exitWhenBigPictureCloses) {
      const isBigPictureOpen = await this.steam.isBigPictureOpen();
      if (isBigPictureOpen) {
        return;
      }

      this.logger.info('Steam Big Picture fechada; saindo do modo console.');
      await this.deactivate('big-picture-closed');
      return;
    }

    if (!this.config.exitWhenSteamCloses) {
      return;
    }

    if (await this.steam.isRunning()) {
      return;
    }

    this.logger.info('Steam fechada; saindo do modo console.');
    await this.deactivate('steam-closed');
  }

  private async deactivate(reason: string): Promise<void> {
    if (this.stateMachine.state !== 'active') {
      return;
    }

    try {
      this.clearInactivityTimer();
      this.clearSteamExitTimer();
      this.activatedAt = null;
      this.stateMachine.transitionTo('deactivating');
      if (this.config.deactivateAction === 'turn-off-tv') {
        await this.tv.turnOff();
      } else {
        this.logger.info(`Saindo do modo console por ${reason}; mantendo a TV ligada por configuracao.`);
      }
      this.stateMachine.transitionTo('idle');
    } catch (error: unknown) {
      this.logger.error('Falha ao desativar modo console.', error);
      this.stateMachine.transitionTo('error');
      this.stateMachine.transitionTo('idle');
    }
  }

  private clearInactivityTimer(): void {
    if (!this.inactivityTimer) {
      return;
    }

    clearTimeout(this.inactivityTimer);
    this.inactivityTimer = null;
  }

  private clearSteamExitTimer(): void {
    if (!this.steamExitTimer) {
      return;
    }

    clearInterval(this.steamExitTimer);
    this.steamExitTimer = null;
  }

  private isWithinSteamExitGracePeriod(): boolean {
    if (!this.activatedAt) {
      return false;
    }

    return Date.now() - this.activatedAt < this.config.steamExitGracePeriodMs;
  }
}
