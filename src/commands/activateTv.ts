import { loadConfig } from '../config/config';
import { ConsoleLogger } from '../system/Logger';
import { createTVController } from '../tv/createTVController';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);
  const tv = createTVController(config.tv, logger);

  await tv.turnOn();
  await tv.setInput(config.tv.input);
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao ativar a TV.', error);
  process.exit(1);
});
