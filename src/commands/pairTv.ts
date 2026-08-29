import { loadConfig } from '../config/config';
import { ConsoleLogger } from '../system/Logger';
import { LGWebOSController } from '../tv/LGWebOSController';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);

  if (config.tv.provider !== 'lg-webos') {
    throw new Error('Configure tv.provider como "lg-webos" antes de parear.');
  }

  const tv = new LGWebOSController(config.tv, logger);
  logger.info('Solicitando pareamento. Aceite a permissao na TV quando ela aparecer.');
  const clientKey = await tv.pair();

  if (!clientKey) {
    logger.warn('A TV nao retornou uma nova clientKey. Se voce ja tinha uma configurada, ela provavelmente foi aceita.');
    return;
  }

  process.stdout.write('\nAdicione esta clientKey ao seu config.json:\n\n');
  process.stdout.write(`"clientKey": "${clientKey}"\n\n`);
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao parear com a TV.', error);
  process.exit(1);
});
