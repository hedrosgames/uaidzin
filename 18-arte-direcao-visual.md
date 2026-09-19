# UAIDZIN

## Arte e Direção Visual

## Direção Atual

O jogo será produzido inicialmente em greybox 3D.

O greybox deve validar escala, movimentação, câmera, arenas, combate, inimigos e fluxo antes da produção visual definitiva.

## 3D

O jogo será executado em navegador e deverá utilizar modelos 3D, animações, efeitos e demais recursos compatíveis com a plataforma Web.

## Prioridade Visual

A prioridade inicial é a legibilidade do combate e a leitura clara das arenas.

O personagem, os inimigos, os ataques, as habilidades e os limites do cenário precisam ser facilmente identificáveis durante o farm.


## Proposta de Design

### Estilo final

- 3D estilizado legível, com silhueta forte.
- Não é realismo. Não é cartoon infantil.
- Referência de peso visual: RPG de ação isométrico moderno, com cores saturadas em personagens e inimigos e fundo mais contido.

### Proporção dos personagens

- Corpo levemente estilizado, cabeça um pouco acima do realista para leitura em câmera ¾.
- Personagem jogável e inimigos com silhuetas distintas em preto e branco.

### Ambientes

- Cidade: pedra, madeira, faíscas de ferreiro, luz quente.
- Dungeons: um bioma forte por dungeon, com paleta limitada.
- Greybox usa volumes cinza e cores de gameplay: jogador azul, inimigo vermelho, spawn âmbar, drop dourado.

### Iluminação

- Direcional simples + ambiente.
- Sem sombras caras no protótipo.
- Luz de gameplay clara o suficiente para ver alcance e área de ataque.

### Materiais e VFX

- Poucos materiais por cena.
- VFX de ataque com leitura imediata: cor por tipo de dano.
- Sem VFX que cubra o personagem inteiro.

### Animações

- Prioridade: idle, andar, ataque básico, morte, hit.
- Skills podem começar com pose simples e efeito.
- Transições curtas. O farm não pode esperar animação longa.

### Interface visual

Direção fechada em `visual/DECISOES-ESTILO.md` (lab de 2026-10).

- Identidade: nórdico medieval de salão — ferro, bronze quente, runas, vermelho de forja em perigo.
- Paleta base **C · Salão/Brasa**: fundo `#100c08`, painel `#241c14`, ouro `#d4a017`, sangue `#a33b3b`, texto `#f0e6d0`.
- Moldura principal: ferro com cantos dourados. Couro só em contexto de salão/NPC.
- Botões com silhouette própria (escudo na ação principal).
- Tipografia: serif display + sans UI + mono para números + runas Elder Futhark.
- Materiais aprovados: ferro e bronze. Couro opcional.
- Ícones de skill legíveis a 32px, sempre PNG ou SVG — **sem emoji**.
- Cores de raridade iguais à tabela de itens.
- Vida em world space (personagem e inimigos): verde ≥ 40%, vermelho &lt; 40%.

## Pendências

- Moodboard fechado.
- Guia de cores por bioma.
- Tamanho final de texturas e polígonos por asset.
