export type ActivitySource = 'keyboard' | 'mouse' | 'controller' | 'unknown';

export interface ActivityEvent {
  source: ActivitySource;
  occurredAt: Date;
}

export type ActivityHandler = (event: ActivityEvent) => void | Promise<void>;

export interface ActivityMonitor {
  onActivity(handler: ActivityHandler): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}
