# pconsole

Automacao local para transformar um PC Windows em uma experiencia de console:
ativa TV, seleciona HDMI e abre a Steam em Big Picture quando houver atividade relevante.

## Primeiro uso

```bash
npm install
npm run dev
```

Copie `config.example.json` para `config.json` quando quiser ajustar caminhos,
entrada HDMI, tempos e provedor de TV.

## Estado atual

Esta primeira versao entrega a fundacao:

- maquina de estados do modo console;
- orquestrador da experiencia;
- monitor de atividade do Windows via `GetLastInputInfo`;
- controlador inicial da Steam;
- controlador de TV simulado para desenvolvimento;
- ligacao de TV LG pela rede via Wake-on-LAN.

Para ligar a TV pela rede, configure `tv.provider` como `lg-webos` e informe
o `macAddress` da TV no `config.json`. O controle completo via webOS, incluindo
troca real de HDMI, sera implementado depois do pareamento com a TV.

Teste manual para ligar a TV:

```bash
npm run tv:wake
```
