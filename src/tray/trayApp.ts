import { app, Menu, nativeImage, Tray } from 'electron';
import { createGamingEnvironmentService } from '../application/createGamingEnvironmentService';
import { loadConfig } from '../config/config';
import { ConsoleLogger } from '../system/Logger';

let tray: Tray | null = null;
let service: ReturnType<typeof createGamingEnvironmentService> | null = null;
let isQuitting = false;

async function startTray(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);

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
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">',
    '<rect width="32" height="32" rx="7" fill="#101820"/>',
    '<path d="M8 18c0-4 3-7 7-7h2c4 0 7 3 7 7v2c0 2-1 4-3 4-1 0-2-1-3-2l-1-2h-2l-1 2c-1 1-2 2-3 2-2 0-3-2-3-4v-2z" fill="#f4f7fb"/>',
    '<path d="M11 17h5M13.5 14.5v5" stroke="#101820" stroke-width="1.8" stroke-linecap="round"/>',
    '<circle cx="20" cy="16" r="1.2" fill="#101820"/>',
    '<circle cx="22.5" cy="19" r="1.2" fill="#101820"/>',
    '</svg>'
  ].join('');

  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
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
