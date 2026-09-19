# UAIDZIN

## Técnico e Arquitetura

## Plataforma Técnica

O jogo será executado no navegador e terá renderização 3D através de tecnologias Web.

A implementação deverá utilizar HTML, JavaScript e as bibliotecas necessárias para renderização 3D, carregamento de modelos, animações, efeitos e áudio.

## Modelos

O projeto deverá suportar modelos 3D em formatos adequados ao navegador, incluindo FBX caso a pipeline escolhida ofereça suporte apropriado, ou formatos convertidos quando necessário.

## Arquitetura

A arquitetura deverá separar, sempre que possível:

- Dados do personagem.
- Combate.
- Skills.
- Equipamentos.
- Inventário.
- Inimigos.
- Dungeons.
- Economia.
- Save.
- Interface.

## Offline

O jogo não depende de backend para executar o loop principal.

A progressão é armazenada localmente.

## Desenvolvimento

O primeiro objetivo técnico é validar um protótipo 3D funcional no navegador, com uma cidade simples, uma dungeon em greybox, movimentação, ataque automático, inimigos, loot e progressão básica.


## Proposta de Design

### Biblioteca 3D

- **three.js** como motor de renderização no navegador.
- Gerenciador de cena próprio enxuto ou ecossistema mínimo em volta.
- Não usar engine pesada desktop no protótipo.

### Tooling

- Vite para dev server e build.
- **TypeScript** para código de gameplay, dados de personagem e save.

### Pipeline de assets

- Modelos em glTF/GLB.
- Texturas em WebP ou PNG comprimido.
- Animações dentro do GLB.
- Nomes padronizados por tipo: `char_`, `enemy_`, `prop_`, `vfx_`.

### Arquitetura de dados

- Estado do jogo separado em: save, runtime de dungeon, configuração.
- Save não mistura objeto three.js.
- Tabelas de balanceamento em JSON versionado.

### Carregamento

- Cidade e dungeon básica no boot.
- Assets de dungeon carregados na seleção.
- Pool de inimigos reutilizado.

### Empacotamento

- Build estático para qualquer host HTTP.
- Sem backend no lançamento.
- Alvo de publicação: página única com assets ao lado ou empacotados.

## Pendências

- Estrutura final de pastas.
- Orçamento de tamanho total do build.
