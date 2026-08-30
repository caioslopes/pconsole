import { createGamingEnvironmentService } from '../application/createGamingEnvironmentService';
import { loadConfig } from '../config/config';
import { ConsoleLogger } from '../system/Logger';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);

  const service = createGamingEnvironmentService({
    app: config.app,
    controller: config.controller,
    logger,
    steam: config.steam,
    tv: config.tv
  });

  await service.activateConsoleMode();
  await service.stop();
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao ativar modo console.', error);
  process.exit(1);
});
