import { Device } from 'node-hid';

export function formatHidId(value: number): string {
  return `0x${value.toString(16).padStart(4, '0')}`;
}

export function describeHidDevice(device: Device): string {
  const manufacturer = device.manufacturer ?? '(fabricante desconhecido)';
  const product = device.product ?? '(produto desconhecido)';

  return `${manufacturer} ${product}`;
}

export function formatHidDeviceDetails(device: Device): string[] {
  return [
    `name: ${describeHidDevice(device)}`,
    `vendorId: ${device.vendorId} (${formatHidId(device.vendorId)})`,
    `productId: ${device.productId} (${formatHidId(device.productId)})`,
    `usagePage: ${formatOptionalNumber(device.usagePage)}`,
    `usage: ${formatOptionalNumber(device.usage)}`,
    `interface: ${device.interface}`,
    `release: ${device.release}`,
    `serialNumber: ${device.serialNumber || '(vazio)'}`,
    `path: ${device.path ?? '(sem path)'}`
  ];
}

function formatOptionalNumber(value: number | undefined): string {
  if (value === undefined) {
    return '(nao informado)';
  }

  return `${value} (${formatHidId(value)})`;
}
