import { listControllerDevices } from '../activity/DualSenseControllerMonitor';
import { describeHidDevice, formatHidId } from '../activity/HidDeviceFormatter';
import { loadConfig } from '../config/config';
import { ConsoleLogger } from '../system/Logger';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);
  const controllers = listControllerDevices(config.controller);

  if (controllers.length === 0) {
    process.stdout.write('\nNenhum controle compativel encontrado.\n');
    process.stdout.write('Confirme que o controle esta ligado e conectado por Bluetooth/USB.\n');
    process.stdout.write('Para controles genericos, rode npm run controller:diagnose e copie os IDs para o config.json.\n');
    return;
  }

  process.stdout.write('\nControles encontrados:\n\n');
  for (const controller of controllers) {
    process.stdout.write(`- ${describeHidDevice(controller)} ${formatHidId(controller.vendorId)}:${formatHidId(controller.productId)}\n`);
    process.stdout.write(`  path: ${controller.path ?? '(sem path)'}\n`);
  }
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao listar controles.', error);
  process.exit(1);
});
