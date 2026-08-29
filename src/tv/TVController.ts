export type TVPowerState = 'on' | 'off' | 'unknown';

export interface TVController {
  turnOn(): Promise<void>;
  turnOff(): Promise<void>;
  setInput(input: string): Promise<void>;
  getPowerState(): Promise<TVPowerState>;
}
