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
      this.stateMachine.transitionTo('active');
      this.scheduleInactivityCheck();
    } catch (error: unknown) {
      this.logger.error('Falha ao ativar modo console.', error);
      this.stateMachine.transitionTo('error');
      this.stateMachine.transitionTo('idle');
    }
  }

  private scheduleInactivityCheck(): void {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      void this.deactivate();
    }, this.config.inactivityTimeoutMs);
  }

  private async deactivate(): Promise<void> {
    if (this.stateMachine.state !== 'active') {
      return;
    }

    try {
      this.stateMachine.transitionTo('deactivating');
      if (this.config.deactivateAction === 'turn-off-tv') {
        await this.tv.turnOff();
      } else {
        this.logger.info('Timeout de inatividade atingido; mantendo a TV ligada por configuracao.');
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
}
