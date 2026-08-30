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

## Comandos principais

Ativar a experiencia completa manualmente:

```bash
npm run console:activate
```

Esse comando liga a TV, seleciona a entrada configurada e abre a Steam em Big
Picture.

Executar as acoes de saida configuradas:

```bash
npm run console:deactivate
```

Diagnosticar processos e janelas da Steam:

```bash
npm run steam:diagnose
```

Rodar com icone na bandeja do Windows:

```bash
npm run dev:tray
```

Gerar um executavel Windows portatil:

```bash
npm run dist:win
```

O executavel fica em:

```text
release/pconsole.exe
```

Depois disso, voce pode abrir o app pelo `.exe` sem manter um terminal aberto.

Instalar inicializacao automatica no login do Windows:

```bash
npm run startup:install
```

Consultar ou remover a inicializacao automatica:

```bash
npm run startup:status
npm run startup:uninstall
```

## Estado atual

Esta primeira versao entrega a fundacao:

- maquina de estados do modo console;
- orquestrador da experiencia;
- monitor de atividade do Windows via `GetLastInputInfo`;
- controlador inicial da Steam;
- controlador de TV simulado para desenvolvimento;
- ligacao de TV LG pela rede via Wake-on-LAN;
- pareamento e comandos iniciais via webOS.

Para ligar a TV pela rede, configure `tv.provider` como `lg-webos` e informe
o `macAddress` da TV no `config.json`.

Teste manual para ligar a TV:

```bash
npm run tv:wake
```

Diagnosticar IP e portas webOS:

```bash
npm run tv:diagnose
```

Pareamento webOS:

```bash
npm run tv:pair
```

Deixe a TV ligada e na mesma rede do PC durante o pareamento. O comando tenta
conectar tanto em `wss://TV:3001` quanto em `ws://TV:3000`.

Depois de aceitar a permissao na TV, copie a `clientKey` exibida para o
`config.json`.

Listar entradas HDMI/externas:

```bash
npm run tv:inputs
```

Use o `id` retornado pela TV no campo `tv.input`.

Ativar TV e selecionar a entrada configurada:

```bash
npm run tv:activate
```

## Automacao

Por seguranca, a ativacao automatica vem desligada por padrao:

```json
"autoActivationEnabled": false
```

Quando estiver pronto para testar atividade do controle no Windows, altere
para `true` no `config.json` e rode:

```bash
npm run dev
```

A ativacao automatica observa o controle configurado, nao mouse/teclado. Para
conferir se o DualSense foi encontrado:

```bash
npm run controller:list
```

Para configurar um controle wireless generico, liste todos os dispositivos HID:

```bash
npm run controller:diagnose
```

Copie o `vendorId` e o `productId` do controle para `controller.vendorId` e
`controller.productIds` no `config.json`.

Por padrao, o timeout de inatividade nao desliga a TV:

```json
"deactivateAction": "none"
```

Para permitir desligamento automatico da TV no futuro, use:

```json
"deactivateAction": "turn-off-tv"
```

Por padrao, se a Steam for fechada enquanto o modo console estiver ativo, o app
volta para `idle`. O fechamento do Big Picture tambem e observado por padrao:

```json
"exitWhenBigPictureCloses": true
```

Fallback para quando a Steam inteira fecha:

```json
"exitWhenSteamCloses": true
```

Depois de ativar, o app aguarda uma pequena janela antes de considerar que a
Steam foi fechada:

```json
"steamExitGracePeriodMs": 15000
```

Para investigar uma saida especifica do Big Picture, rode `npm run
steam:diagnose` com a Steam fechada, com a Steam normal aberta, com Big Picture
aberto e depois de sair do Big Picture.

## Startup no Windows

O pconsole deve iniciar com a sessao do usuario, nao como servico do Windows,
porque precisa acessar controle HID, Steam e janelas da sessao grafica.

O comando `npm run startup:install` gera o build e cria `pconsole.cmd` na pasta
de Inicializar do usuario. Na proxima entrada no Windows, ele roda o app de
bandeja. Se existir um executavel empacotado em `release/pconsole.exe`, o
startup usa esse executavel e nao deixa terminal aberto. Caso contrario, ele
usa o modo de desenvolvimento:

```bash
npm run tray
```

Os logs do startup ficam em:

```text
logs/pconsole-startup.log
```
