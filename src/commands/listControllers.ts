import { listControllerDevices } from '../activity/DualSenseControllerMonitor';
import { loadConfig } from '../config/config';
import { ConsoleLogger } from '../system/Logger';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);
  const controllers = listControllerDevices(config.controller);

  if (controllers.length === 0) {
    process.stdout.write('\nNenhum controle compativel encontrado.\n');
    process.stdout.write('Confirme que o DualSense esta ligado e conectado por Bluetooth/USB.\n');
    process.stdout.write('Se ele aparecer com outro productId, rode um diagnostico HID geral futuramente e adicione o ID em controller.productIds.\n');
    return;
  }

  process.stdout.write('\nControles encontrados:\n\n');
  for (const controller of controllers) {
    const vendorId = `0x${controller.vendorId.toString(16).padStart(4, '0')}`;
    const productId = `0x${controller.productId.toString(16).padStart(4, '0')}`;
    process.stdout.write(`- ${controller.manufacturer ?? '(fabricante)'} ${controller.product ?? '(produto)'} ${vendorId}:${productId}\n`);
    process.stdout.write(`  path: ${controller.path ?? '(sem path)'}\n`);
  }
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao listar controles.', error);
  process.exit(1);
});
