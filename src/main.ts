import { GamingEnvironmentService } from './application/GamingEnvironmentService';
import { createGamingEnvironmentService } from './application/createGamingEnvironmentService';
import { loadConfig } from './config/config';
import { ConsoleLogger } from './system/Logger';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);

  const service: GamingEnvironmentService = createGamingEnvironmentService({
    app: config.app,
    controller: config.controller,
    logger,
    steam: config.steam,
    tv: config.tv
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
