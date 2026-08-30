import { loadConfig } from '../config/config';
import { ConsoleLogger } from '../system/Logger';
import { createTVController } from '../tv/createTVController';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);

  if (config.app.deactivateAction === 'turn-off-tv') {
    const tv = createTVController(config.tv, logger);
    await tv.turnOff();
    return;
  }

  logger.info('Nenhuma acao manual de saida configurada. Use deactivateAction="turn-off-tv" para desligar a TV.');
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao desativar modo console.', error);
  process.exit(1);
});
