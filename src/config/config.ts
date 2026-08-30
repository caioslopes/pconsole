import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Logger } from '../system/Logger';

export interface AppConfig {
  pollingIntervalMs: number;
  activationDebounceMs: number;
  inactivityTimeoutMs: number;
  autoActivationEnabled: boolean;
  deactivateAction: 'none' | 'turn-off-tv';
  exitWhenBigPictureCloses: boolean;
  exitWhenSteamCloses: boolean;
  steamExitGracePeriodMs: number;
  steamExitPollingIntervalMs: number;
}

export interface ControllerConfig {
  enabled: boolean;
  vendorId: number;
  productIds: number[];
  scanIntervalMs: number;
  warmupMs: number;
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
  controller: ControllerConfig;
  steam: SteamConfig;
  tv: TVConfig;
}

export interface LoadedPConsoleConfig {
  config: PConsoleConfig;
  path: string | null;
}

const defaultConfig: PConsoleConfig = {
  app: {
    pollingIntervalMs: 1000,
    activationDebounceMs: 3000,
    inactivityTimeoutMs: 15 * 60 * 1000,
    autoActivationEnabled: false,
    deactivateAction: 'none',
    exitWhenBigPictureCloses: true,
    exitWhenSteamCloses: true,
    steamExitGracePeriodMs: 15000,
    steamExitPollingIntervalMs: 5000
  },
  controller: {
    enabled: true,
    vendorId: 0x054c,
    productIds: [0x0ce6, 0x0df2],
    scanIntervalMs: 3000,
    warmupMs: 1000
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
  const loaded = await loadConfigWithMetadata(logger);
  return loaded.config;
}

export async function loadConfigWithMetadata(logger: Logger): Promise<LoadedPConsoleConfig> {
  const configPaths = getConfigPaths();

  for (const configPath of configPaths) {
    try {
      const rawConfig = await fs.readFile(configPath, 'utf8');
      const userConfig = JSON.parse(rawConfig) as Partial<PConsoleConfig>;
      logger.info(`Config carregado de ${configPath}.`);
      return {
        config: mergeConfig(defaultConfig, userConfig),
        path: configPath
      };
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        continue;
      }

      throw error;
    }
  }

  logger.warn(
    `config.json nao encontrado em: ${configPaths.join(', ')}; usando configuracao padrao de desenvolvimento.`
  );
  return {
    config: defaultConfig,
    path: null
  };
}

function mergeConfig(base: PConsoleConfig, override: Partial<PConsoleConfig>): PConsoleConfig {
  return {
    app: {
      ...base.app,
      ...override.app
    },
    controller: {
      ...base.controller,
      ...override.controller
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

function getConfigPaths(): string[] {
  const portableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  const portableExecutableFile = process.env.PORTABLE_EXECUTABLE_FILE;
  const portableExecutableParent = portableExecutableFile ? path.dirname(portableExecutableFile) : undefined;

  const paths = [
    process.env.PCONSOLE_CONFIG_PATH,
    portableExecutableDir ? path.join(portableExecutableDir, 'config.json') : undefined,
    portableExecutableParent ? path.join(portableExecutableParent, 'config.json') : undefined,
    portableExecutableDir ? path.resolve(portableExecutableDir, '..', 'config.json') : undefined,
    portableExecutableParent ? path.resolve(portableExecutableParent, '..', 'config.json') : undefined,
    path.resolve(process.cwd(), 'config.json'),
    path.resolve(process.execPath, '..', 'config.json'),
    path.resolve(process.execPath, '..', '..', 'config.json')
  ].filter((configPath): configPath is string => Boolean(configPath));

  return Array.from(new Set(paths));
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
