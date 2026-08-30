import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Logger } from '../system/Logger';

export interface AppConfig {
  pollingIntervalMs: number;
  activationDebounceMs: number;
  inactivityTimeoutMs: number;
  autoActivationEnabled: boolean;
  deactivateAction: 'none' | 'turn-off-tv';
}

export interface SteamConfig {
  executablePath: string | null;
  launchArgs: string[];
}

export interface TVConfig {
  provider: 'mock' | 'lg-webos';
  input: string;
  host: string | null;
  macAddress: string | null;
  wakeOnLanBroadcastAddress: string;
  wakeOnLanPort: number;
  powerOnDelayMs: number;
  clientKey: string | null;
}

export interface PConsoleConfig {
  app: AppConfig;
  steam: SteamConfig;
  tv: TVConfig;
}

const defaultConfig: PConsoleConfig = {
  app: {
    pollingIntervalMs: 1000,
    activationDebounceMs: 3000,
    inactivityTimeoutMs: 15 * 60 * 1000,
    autoActivationEnabled: false,
    deactivateAction: 'none'
  },
  steam: {
    executablePath: defaultSteamPath(),
    launchArgs: ['-gamepadui']
  },
  tv: {
    provider: 'mock',
    input: 'HDMI_1',
    host: null,
    macAddress: null,
    wakeOnLanBroadcastAddress: '255.255.255.255',
    wakeOnLanPort: 9,
    powerOnDelayMs: 8000,
    clientKey: null
  }
};

export async function loadConfig(logger: Logger): Promise<PConsoleConfig> {
  const configPath = path.resolve(process.cwd(), 'config.json');

  try {
    const rawConfig = await fs.readFile(configPath, 'utf8');
    const userConfig = JSON.parse(rawConfig) as Partial<PConsoleConfig>;
    return mergeConfig(defaultConfig, userConfig);
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      logger.warn('config.json nao encontrado; usando configuracao padrao de desenvolvimento.');
      return defaultConfig;
    }

    throw error;
  }
}

function mergeConfig(base: PConsoleConfig, override: Partial<PConsoleConfig>): PConsoleConfig {
  return {
    app: {
      ...base.app,
      ...override.app
    },
    steam: {
      ...base.steam,
      ...override.steam
    },
    tv: {
      ...base.tv,
      ...override.tv
    }
  };
}

function defaultSteamPath(): string | null {
  if (process.platform === 'win32') {
    return 'C:\\Program Files (x86)\\Steam\\steam.exe';
  }

  if (process.platform === 'darwin') {
    return '/Applications/Steam.app/Contents/MacOS/steam_osx';
  }

  return 'steam';
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
