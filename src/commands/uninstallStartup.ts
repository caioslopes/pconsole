import { WindowsStartupManager } from '../startup/WindowsStartupManager';
import { ConsoleLogger } from '../system/Logger';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const manager = new WindowsStartupManager();
  const removedPath = await manager.uninstall();

  if (!removedPath) {
    logger.info('pconsole nao estava instalado no startup do Windows.');
    return;
  }

  logger.info(`Startup do pconsole removido: ${removedPath}`);
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao remover startup do pconsole.', error);
  process.exit(1);
});
