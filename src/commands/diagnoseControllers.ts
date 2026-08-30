import { devices } from 'node-hid';
import { formatHidDeviceDetails } from '../activity/HidDeviceFormatter';
import { ConsoleLogger } from '../system/Logger';

function main(): void {
  const hidDevices = devices();

  if (hidDevices.length === 0) {
    process.stdout.write('\nNenhum dispositivo HID encontrado.\n');
    return;
  }

  process.stdout.write(`\nDispositivos HID encontrados: ${hidDevices.length}\n\n`);

  hidDevices.forEach((device, index) => {
    process.stdout.write(`#${index + 1}\n`);
    for (const line of formatHidDeviceDetails(device)) {
      process.stdout.write(`  ${line}\n`);
    }
    process.stdout.write('\n');
  });

  process.stdout.write('Para configurar um controle generico, copie vendorId e productId para controller.vendorId e controller.productIds no config.json.\n');
}

try {
  main();
} catch (error: unknown) {
  const logger = new ConsoleLogger();
  logger.error('Falha ao diagnosticar controles HID.', error);
  process.exit(1);
}
