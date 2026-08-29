import { Logger } from '../system/Logger';

export type GamingState = 'idle' | 'activating' | 'active' | 'deactivating' | 'error';

const allowedTransitions: Record<GamingState, GamingState[]> = {
  idle: ['activating', 'error'],
  activating: ['active', 'idle', 'error'],
  active: ['deactivating', 'idle', 'error'],
  deactivating: ['idle', 'active', 'error'],
  error: ['idle']
};

export class GamingStateMachine {
  private currentState: GamingState = 'idle';

  constructor(private readonly logger: Logger) {}

  get state(): GamingState {
    return this.currentState;
  }

  transitionTo(nextState: GamingState): void {
    const nextStates = allowedTransitions[this.currentState];

    if (!nextStates.includes(nextState)) {
      throw new Error(`Transicao invalida: ${this.currentState} -> ${nextState}`);
    }

    if (this.currentState === nextState) {
      return;
    }

    this.logger.info(`Estado alterado: ${this.currentState} -> ${nextState}`);
    this.currentState = nextState;
  }
}
