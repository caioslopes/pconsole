import { GamingEnvironmentService } from './application/GamingEnvironmentService';
import { loadConfig } from './config/config';
import { ConsoleLogger } from './system/Logger';
import { SteamController } from './steam/SteamController';
import { createTVController } from './tv/createTVController';
import { WindowsInputMonitor } from './activity/WindowsInputMonitor';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);

  const tv = createTVController(config.tv, logger);
  const steam = new SteamController(config.steam, logger);
  const activityMonitor = new WindowsInputMonitor(config.app, logger);

  const service = new GamingEnvironmentService({
    activityMonitor,
    config: config.app,
    logger,
    steam,
    tv,
    tvInput: config.tv.input
  });

  process.on('SIGINT', async () => {
    logger.info('Encerrando pconsole...');
    await service.stop();
    process.exit(0);
  });

  await service.start();
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha fatal ao iniciar pconsole.', error);
  process.exit(1);
});
