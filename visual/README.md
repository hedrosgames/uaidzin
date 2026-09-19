# Camada visual do GDD (v2)

Os `.md` são a fonte de verdade da prosa. Este diretório guarda apenas diagramas.

## Arquivos

- `manifest.json` — liga cada figura a uma seção do GDD (`section` = slug gerado no build).
- `svg/*.svg` — SVGs autocontidos (sem CDN, sem fontes externas).

## Como adicionar um diagrama

1. Crie o SVG em `svg/nome.svg` com as cores do GDD.
2. Adicione uma entrada em `manifest.json` com o slug da seção (ex.: `ch-03--loop-principal`).
3. Rode `node build/build-v2.js` (gera `GDD-v2.html`).

O slug é `ch-NN--titulo-da-secao` em minúsculas, sem acentos, espaços viram `-`.

## Fidelidade

Não invente números. O que o GDD marca como pendente fica como TBD no visual.
