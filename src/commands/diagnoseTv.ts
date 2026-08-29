import { loadConfig } from '../config/config';
import { probeTcpPort } from '../network/TcpProbeService';
import { ConsoleLogger } from '../system/Logger';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const config = await loadConfig(logger);

  if (config.tv.provider !== 'lg-webos') {
    throw new Error('Configure tv.provider como "lg-webos" antes de diagnosticar a TV.');
  }

  if (!config.tv.host) {
    throw new Error('Configure tv.host com o IP da TV.');
  }

  process.stdout.write(`\nDiagnosticando TV em ${config.tv.host}\n\n`);
  process.stdout.write(`MAC configurado: ${config.tv.macAddress ?? '(nao informado)'}\n`);
  process.stdout.write(`Broadcast Wake-on-LAN: ${config.tv.wakeOnLanBroadcastAddress}:${config.tv.wakeOnLanPort}\n\n`);

  const probes = await Promise.all([
    probeTcpPort(config.tv.host, 3001),
    probeTcpPort(config.tv.host, 3000)
  ]);

  for (const probe of probes) {
    const status = probe.reachable ? 'ABERTA' : 'INDISPONIVEL';
    const detail = probe.error ? ` (${probe.error})` : '';
    process.stdout.write(`Porta ${probe.port}: ${status} em ${probe.elapsedMs}ms${detail}\n`);
  }

  const hasWebOsPort = probes.some((probe) => probe.reachable);
  if (!hasWebOsPort) {
    process.stdout.write('\nNenhuma porta webOS respondeu. Verifique se:\n');
    process.stdout.write('- tv.host e o IP real da TV, nao o IP do PC;\n');
    process.stdout.write('- a TV esta ligada durante o pareamento;\n');
    process.stdout.write('- a opcao LG Connect Apps / Mobile TV On / Ativar pela rede esta habilitada;\n');
    process.stdout.write('- PC e TV estao na mesma rede/VLAN.\n');
  }
}

main().catch((error: unknown) => {
  const logger = new ConsoleLogger();
  logger.error('Falha ao diagnosticar a TV.', error);
  process.exit(1);
});
