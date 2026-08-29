import WebSocket from 'ws';
import { Logger } from '../system/Logger';

export interface LGWebOSClientOptions {
  host: string;
  clientKey: string | null;
  requestTimeoutMs?: number;
}

export interface LGWebOSExternalInput {
  id: string;
  label: string;
  appId?: string;
  icon?: string;
  port?: number;
}

interface LGWebOSMessage {
  id?: string;
  type?: string;
  uri?: string;
  payload?: unknown;
  error?: string;
}

interface RegisterResponsePayload {
  'client-key'?: string;
  clientKey?: string;
}

interface ExternalInputListPayload {
  devices?: Array<{
    id?: string;
    label?: string;
    appId?: string;
    icon?: string;
    port?: number;
  }>;
}

const permissions = [
  'LAUNCH',
  'LAUNCH_WEBAPP',
  'APP_TO_APP',
  'CLOSE',
  'TEST_OPEN',
  'TEST_PROTECTED',
  'CONTROL_AUDIO',
  'CONTROL_DISPLAY',
  'CONTROL_INPUT_JOYSTICK',
  'CONTROL_INPUT_MEDIA_RECORDING',
  'CONTROL_INPUT_MEDIA_PLAYBACK',
  'CONTROL_INPUT_TV',
  'CONTROL_POWER',
  'READ_APP_STATUS',
  'READ_CURRENT_CHANNEL',
  'READ_INPUT_DEVICE_LIST',
  'READ_NETWORK_STATE',
  'READ_POWER_STATE',
  'READ_RUNNING_APPS',
  'READ_TV_CHANNEL_LIST',
  'WRITE_NOTIFICATION_TOAST',
  'WRITE_SETTINGS'
];

const defaultManifest = {
  manifestVersion: 1,
  appVersion: '0.1.0',
  signed: {
    created: '2026-08-29T00:00:00.000Z',
    appId: 'com.pconsole.service',
    vendorId: 'com.pconsole',
    localizedAppNames: { '': 'pconsole' },
    localizedVendorNames: { '': 'pconsole' },
    permissions,
    serial: 'pconsole'
  },
  permissions
};

export class LGWebOSClient {
  private readonly requestTimeoutMs: number;
  private socket: WebSocket | null = null;
  private sequence = 0;
  private pendingRequests = new Map<
    string,
    {
      resolve: (message: LGWebOSMessage) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  constructor(
    private readonly options: LGWebOSClientOptions,
    private readonly logger: Logger
  ) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10000;
  }

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(`ws://${this.options.host}:3000`);
      this.socket = socket;

      socket.once('open', () => {
        this.logger.info(`Conectado ao webOS em ${this.options.host}.`);
        resolve();
      });

      socket.once('error', reject);

      socket.on('message', (data) => {
        this.handleMessage(data.toString());
      });

      socket.on('close', () => {
        this.rejectPendingRequests(new Error('Conexao webOS fechada.'));
        this.socket = null;
      });
    });
  }

  async close(): Promise<void> {
    const socket = this.socket;
    if (!socket) {
      return;
    }

    await new Promise<void>((resolve) => {
      socket.once('close', resolve);
      socket.close();
    });
  }

  async register(): Promise<string | null> {
    await this.connect();

    const payload: Record<string, unknown> = {
      manifest: defaultManifest
    };

    if (this.options.clientKey) {
      payload['client-key'] = this.options.clientKey;
    }

    const response = await this.sendRaw('register', payload);
    const responsePayload = response.payload as RegisterResponsePayload | undefined;
    const clientKey = responsePayload?.['client-key'] ?? responsePayload?.clientKey ?? null;

    if (clientKey) {
      this.logger.info('Pareamento webOS concluido; clientKey recebida.');
    } else if (this.options.clientKey) {
      this.logger.info('clientKey existente aceita pela TV.');
    }

    return clientKey;
  }

  async request<TPayload = unknown>(uri: string, payload?: unknown): Promise<TPayload> {
    await this.register();
    const response = await this.sendRaw('request', payload, uri);
    return response.payload as TPayload;
  }

  async listExternalInputs(): Promise<LGWebOSExternalInput[]> {
    const payload = await this.request<ExternalInputListPayload>('ssap://tv/getExternalInputList');

    return (payload.devices ?? []).map((device) => ({
      id: device.id ?? '',
      label: device.label ?? '',
      appId: device.appId,
      icon: device.icon,
      port: device.port
    }));
  }

  async switchInput(inputId: string): Promise<void> {
    await this.request('ssap://tv/switchInput', { inputId });
  }

  async turnOff(): Promise<void> {
    await this.request('ssap://system/turnOff');
  }

  private sendRaw(type: string, payload?: unknown, uri?: string): Promise<LGWebOSMessage> {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Cliente webOS nao conectado.'));
    }

    const id = `pconsole_${Date.now()}_${this.sequence}`;
    this.sequence += 1;

    const message: LGWebOSMessage = { id, type, payload };
    if (uri) {
      message.uri = uri;
    }

    return new Promise<LGWebOSMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Timeout aguardando resposta webOS para ${uri ?? type}.`));
      }, this.requestTimeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify(message), (error) => {
        if (!error) {
          return;
        }

        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  private handleMessage(rawMessage: string): void {
    let message: LGWebOSMessage;

    try {
      message = JSON.parse(rawMessage) as LGWebOSMessage;
    } catch (error: unknown) {
      this.logger.warn('Mensagem webOS invalida recebida.', error);
      return;
    }

    if (message.type === 'error' || message.error) {
      this.rejectRequest(message);
      return;
    }

    if (!message.id) {
      return;
    }

    const request = this.pendingRequests.get(message.id);
    if (!request) {
      return;
    }

    clearTimeout(request.timeout);
    this.pendingRequests.delete(message.id);
    request.resolve(message);
  }

  private rejectRequest(message: LGWebOSMessage): void {
    const request = message.id ? this.pendingRequests.get(message.id) : undefined;
    if (!request) {
      this.logger.warn('Erro webOS sem requisicao correspondente.', message);
      return;
    }

    clearTimeout(request.timeout);
    this.pendingRequests.delete(message.id as string);
    request.reject(new Error(message.error ?? 'Erro retornado pela TV webOS.'));
  }

  private rejectPendingRequests(error: Error): void {
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(error);
      this.pendingRequests.delete(id);
    }
  }
}
