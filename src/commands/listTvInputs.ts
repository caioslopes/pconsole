import { loadConfig } from '../config/config';
import { ConsoleLogger } from '../system/Logger';
import { LGWebOSController } from '../tv/LGWebOSController';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);

  if (config.tv.provider !== 'lg-webos') {
    throw new Error('Configure tv.provider como "lg-webos" antes de listar entradas.');
  }

  const tv = new LGWebOSController(config.tv, logger);
  const inputs = await tv.listExternalInputs();

  if (inputs.length === 0) {
    logger.warn('Nenhuma entrada externa foi retornada pela TV.');
    return;
  }

  process.stdout.write('\nEntradas encontradas:\n\n');
  for (const input of inputs) {
    process.stdout.write(`- id: ${input.id} | label: ${input.label || '(sem label)'}\n`);
  }
  process.stdout.write('\nUse o id desejado em tv.input no config.json.\n');
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao listar entradas da TV.', error);
  process.exit(1);
});
