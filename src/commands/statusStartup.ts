import { WindowsStartupManager } from '../startup/WindowsStartupManager';
import { ConsoleLogger } from '../system/Logger';

async function main(): Promise<void> {
  const status = await new WindowsStartupManager().getStatus();

  if (!status.supported) {
    process.stdout.write('\nStartup automatico esta disponivel apenas no Windows.\n');
    return;
  }

  process.stdout.write('\nStartup do pconsole\n\n');
  process.stdout.write(`Instalado: ${status.installed ? 'sim' : 'nao'}\n`);
  process.stdout.write(`Pasta: ${status.startupDirectory}\n`);
  process.stdout.write(`Arquivo: ${status.startupFilePath}\n`);
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao consultar startup do pconsole.', error);
  process.exit(1);
});
