import { GamingEnvironmentService } from '../application/GamingEnvironmentService';
import { WindowsInputMonitor } from '../activity/WindowsInputMonitor';
import { loadConfig } from '../config/config';
import { SteamController } from '../steam/SteamController';
import { ConsoleLogger } from '../system/Logger';
import { createTVController } from '../tv/createTVController';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);

  const service = new GamingEnvironmentService({
    activityMonitor: new WindowsInputMonitor(config.app, logger),
    config: config.app,
    logger,
    steam: new SteamController(config.steam, logger),
    tv: createTVController(config.tv, logger),
    tvInput: config.tv.input
  });

  await service.activateConsoleMode();
  await service.stop();
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao ativar modo console.', error);
  process.exit(1);
});
