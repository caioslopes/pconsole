import { app, Menu, nativeImage, shell, Tray } from 'electron';
import path from 'node:path';
import { createGamingEnvironmentService } from '../application/createGamingEnvironmentService';
import { loadConfigWithMetadata, PConsoleConfig } from '../config/config';
import { ConsoleLogger } from '../system/Logger';

let tray: Tray | null = null;
let service: ReturnType<typeof createGamingEnvironmentService> | null = null;
let loadedConfig: PConsoleConfig | null = null;
let loadedConfigPath: string | null = null;
let isQuitting = false;

async function startTray(): Promise<void> {
  const logger = new ConsoleLogger();
  const loaded = await loadConfigWithMetadata(logger);
  const config = loaded.config;
  loadedConfig = config;
  loadedConfigPath = loaded.path;

  service = createGamingEnvironmentService({
    app: config.app,
    controller: config.controller,
    logger,
    steam: config.steam,
    tv: config.tv
  });

  await service.start();

  tray = new Tray(createTrayIcon());
  tray.setToolTip('pconsole');
  updateTrayMenu();
  logger.info('pconsole tray iniciado.');
}

function updateTrayMenu(): void {
  if (!tray || !service) {
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Status: ${service.getState()}`,
      enabled: false
    },
    {
      label: `Ativacao por controle: ${loadedConfig?.app.autoActivationEnabled ? 'ligada' : 'desligada'}`,
      enabled: false
    },
    {
      label: `Config: ${loadedConfigPath ?? 'padrao'}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Ativar modo console',
      click: () => {
        void service?.activateConsoleMode().finally(updateTrayMenu);
      }
    },
    {
      label: 'Desativar modo console',
      click: () => {
        void service?.deactivateConsoleMode('tray').finally(updateTrayMenu);
      }
    },
    {
      label: 'Atualizar status',
      click: updateTrayMenu
    },
    {
      label: 'Abrir pasta do app',
      click: () => {
        void shell.openPath(process.cwd());
      }
    },
    {
      label: 'Abrir pasta do config',
      enabled: Boolean(loadedConfigPath),
      click: () => {
        if (loadedConfigPath) {
          void shell.openPath(path.dirname(loadedConfigPath));
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Encerrar',
      click: () => {
        void shutdown();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

async function shutdown(): Promise<void> {
  isQuitting = true;

  if (service) {
    await service.stop();
    service = null;
  }

  app.quit();
}

function createTrayIcon(): Electron.NativeImage {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'pconsole.png')
    : path.resolve(__dirname, '../../pconsole.png');
  const icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    throw new Error(`Nao foi possivel carregar o icone do tray: ${iconPath}`);
  }

  return icon;
}

app.setName('pconsole');

app.on('ready', () => {
  void startTray();
});

app.on('before-quit', () => {
  if (!isQuitting && service) {
    void service.stop();
  }
});
