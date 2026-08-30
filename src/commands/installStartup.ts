import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { WindowsStartupManager } from '../startup/WindowsStartupManager';
import { ConsoleLogger } from '../system/Logger';

const execFileAsync = promisify(execFile);

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const projectDirectory = process.cwd();

  logger.info('Gerando build antes de instalar startup.');
  await execFileAsync('npm', ['run', 'build'], { cwd: projectDirectory });

  const manager = new WindowsStartupManager();
  const startupFilePath = await manager.install(projectDirectory);

  logger.info(`pconsole instalado para iniciar com a sessao do Windows: ${startupFilePath}`);
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao instalar startup do pconsole.', error);
  process.exit(1);
});
