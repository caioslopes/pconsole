import { getSteamDiagnosticsSnapshot } from '../steam/SteamDiagnostics';
import { ConsoleLogger } from '../system/Logger';

async function main(): Promise<void> {
  const snapshot = await getSteamDiagnosticsSnapshot();

  process.stdout.write(`\nSteam diagnostics (${snapshot.capturedAt})\n\n`);

  if (snapshot.platform !== 'win32') {
    process.stdout.write('Diagnostico detalhado de janelas da Steam esta disponivel apenas no Windows.\n');
    return;
  }

  process.stdout.write(`Processos Steam encontrados: ${snapshot.processes.length}\n\n`);
  for (const processInfo of snapshot.processes) {
    process.stdout.write(`- ${processInfo.processName} pid=${processInfo.id}\n`);
    process.stdout.write(`  title: ${processInfo.mainWindowTitle || '(sem titulo)'}\n`);
    process.stdout.write(`  handle: ${processInfo.mainWindowHandle}\n`);
    process.stdout.write(`  responding: ${formatNullable(processInfo.responding)}\n`);
    process.stdout.write(`  path: ${processInfo.path ?? '(sem path)'}\n`);
  }

  process.stdout.write(`\nJanelas Steam encontradas: ${snapshot.windows.length}\n\n`);
  for (const windowInfo of snapshot.windows) {
    const marker = isBigPictureWindow(windowInfo) ? ' [BIG PICTURE]' : '';
    process.stdout.write(`- pid=${windowInfo.processId} process=${windowInfo.processName ?? '(desconhecido)'}\n`);
    process.stdout.write(`  title: ${windowInfo.title || '(sem titulo)'}${marker}\n`);
    process.stdout.write(`  className: ${windowInfo.className || '(sem classe)'}\n`);
    process.stdout.write(`  handle: ${windowInfo.handle}\n`);
  }

  process.stdout.write('\nRode este comando com Steam fechada, Steam normal aberta, Big Picture aberta e depois de sair do Big Picture.\n');
}

function formatNullable(value: boolean | null): string {
  if (value === null) {
    return '(nao informado)';
  }

  return value ? 'true' : 'false';
}

function isBigPictureWindow(windowInfo: { processName: string | null; className: string; title: string }): boolean {
  return (
    windowInfo.processName?.toLowerCase() === 'steamwebhelper' &&
    windowInfo.className === 'SDL_app' &&
    windowInfo.title.toLowerCase().includes('big picture')
  );
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao diagnosticar Steam.', error);
  process.exit(1);
});
