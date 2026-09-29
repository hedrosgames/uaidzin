# AGENTS.md — UAIDZIN

Jogo RPG de farm 3D no navegador (Three.js + Vite + TypeScript). Código em `game/`. Doc ativa: `nongame/docs/` (inventários + VFX kit + este mapa em `nongame/docs/project/README.md`).

GDD histórico: cópia em `C:\Users\Felipe\Desktop\uaidzin-gdd`. Em conflito com código ou inventário, **código + save real + Felipe na sessão** vencem; GDD e inventários são referência, não ordem de execução.

**Fluxo:** painel de tarefas da sessão (`task` create / start / done).

## Idioma

- Prosa, commits e respostas ao Felipe em **português do Brasil**.
- Frases diretas, substantivo concreto.

## Ordem de leitura antes de mexer

1. `nongame/docs/project/README.md` — o que ainda vale no repo.
2. Inventário afetado em `nongame/docs/inventarios/` (ex.: `animacoes.md`, `save-load.md`).
3. Código ou boot da task (`game/src/`, `game/public/boot/`).

**Ignorar no fluxo normal:** `nongame/backup/`, planos/checklists/grill/tarefas removidos do mapa, e qualquer cópia local de `nongame/gdd/` se ainda estiver no disco. Não recriar esses arquivos sem pedido explícito do Felipe.

## Código — sem comentários (regra dura)

**Nunca escrever comentário no código** (TypeScript, JS, CSS, HTML inline).

- Exceção: `/// <reference types="vite/client" />`.
- Antes de fechar task de código: `game/scripts/_strip-comments.mjs` se precisar; `npm run typecheck` em `game/` tem que passar.

### Polimento ao fechar task de código

1. Zero comentários no diff.
2. Sem `console.log` de debug esquecido.
3. Sem temporário (`_test-*`, `_*-debug*`, screenshot morto).
4. Sem CSS/JS morto.
5. Sem emoji em UI.

## Painel de tarefas (obrigatório)

Mudança com 2+ passos ou pedido do Felipe vira task no painel.

1. Registrar **antes** de mexer no código.
2. `start` imediatamente antes de executar.
3. `done` só com resultado **testado**; falhou → `block`.
4. Pedido novo no meio → task nova.

## Doc durante a execução

- Atualizar `nongame/docs/inventarios/` só quando a task for listar/auditar conteúdo.
- VFX TK no padrão FireBurst: `nongame/docs/project/VFX-KIT-FIREBURST.md`.
- Não inventar balance — marcar **provisório** e citar fonte (código, inventário ou GDD no Desktop).
- UI/comportamento visível: Felipe valida antes de tratar como fechado.

## Como fazer UI

**Fonte de runtime:** `game/public/boot/` + `game/src/ui/` (`WireUi.ts`). Fonte wire = `game/src/ui/wire`. O que o jogador vê vem do save (`SaveVault` / boot `save-store.js`).

`visual/telas/` é espelho legado, se existir no disco — **não** é fonte de verdade; não portar wire paralelo “de mentira” no runtime.

### Travas de UI

| Regra | Valor |
|---|---|
| Paleta | **C · Salão/Brasa** — `#100c08` / `#241c14` / `#d4a017` / `#a33b3b` / `#f0e6d0` |
| Moldura principal | A — ferro + cantos ouro |
| Escudo (`clip-path`) | **Só** CTA Entrar no login e empty-state “Criar Personagem” |
| Demais botões | Retângulo `border-radius: 2px` |
| Emoji | **Proibidos** — só PNG/SVG |
| Arte de classe | `TKpng` / `FMpng` / `BMpng` / `HTpng` |
| HP (inimigo e world bar) | Verde ≥ 40%, vermelho &lt; 40% |
| HP no hub | Preferir frame da UI (world bar opcional na cidade) |
| Tutorial na UI | **Proibido**, exceto **Sábio** |
| Seleção de texto | `user-select: none`; exceção `input` / `textarea` / `[contenteditable=true]` |
| Nomes de classe | TK Thegn Knight · FM Frost Maiden · BM Beast Master · HT Huntress |
| pt-BR | Acentos corretos; sem acento reprova |
| Painéis C/K/I | Mesmos atalhos na cidade **e** na dungeon |

### Comportamento de UI

- UI **não mente**: classe, nome, atributos, skills, ouro vêm do **save**.
- Personagem novo: **5/5/5/5**, **0 ouro**, sem equip, skills zeradas; nome **3–12** letras, sem número/símbolo; nome **não repete** entre contas.
- Sábio: só tutorial/codex — não abre equip. Skills por **K**.
- Item sem ícone **não** entra em lista de jogo.
- Drop na dungeon: log canto **inferior esquerdo**; sem tela de resultado cheia.
- Click longe em NPC: anda e abre UI ao chegar; click-to-move **não** anda no lugar.
- Toggle “não perguntar mais”: no jogo + Settings para restaurar.

## Save e sessão

- Boot: `game/public/boot/assets/save-store.js`. Runtime: `game/src/persistence/`.
- Contrato: `nongame/docs/inventarios/save-load.md` + `SaveTypes` / `SaveVault`.
- Lab: **admin / admin** no `bootstrap()`.
- Lembrar login: **só userId**.
- AES-GCM com `crypto.subtle`; XOR só em `file://`.
- Wipe: `http://127.0.0.1:5173/tools/save-wipe.html` e `__UAIDZIN__.save.wipe*`.

## Jogo (Vite)

```text
cd game
npm run dev          # http://127.0.0.1:5173
npm run typecheck
npm run smoke        # smoke rápido
```

- **Model lab** (dev, fora da build): `http://127.0.0.1:5173/model-lab.html` — 4 classes, 9 conjuntos de arma, 19 clipes; ajuste de mount grava em `game/src/data/weapons/weapon-mounts.json` via `POST /api/dev/weapon-mounts`. QA: `npm run check:model-lab`. Runtime **não** lê `weapon-mounts.json` ainda; grips no jogo = `WeaponRig` + `weapon-set-catalog.json`.
- Animações/sets: `game/src/presentation/player/weapon-set-catalog.json`, `WeaponSetCatalog.ts`, `PlayerAnimCatalog.ts`, `WeaponRig.ts`, `PlayerView.ts`; inventário I1: `nongame/docs/inventarios/animacoes.md`.
- Mixamo no disco: `game/public/models/anims/`; organize: `game/scripts/mixamo-organize.mjs`.
- Inspeção Three.js (dev): skill `.cursor/skills/threejs/SKILL.md` + `nongame/game/docs/THREEJS-DEVTOOLS-MCP.md`.
- Porta fixa em `vite.config.ts` (5173). `game/dist/` é gerado — não editar à mão.

## Validação

- Boot: reler trecho; Playwright se houver interação.
- `game/src`: `typecheck`; Playwright pontual se visual.
- Felipe valida UI/HUD/comportamento visível.
- Não marcar `done` no painel sem teste.

## O que não fazer

- Não commitar sem pedido explícito.
- Não inventar balance sem marcar provisório.
- Não reintroduzir abas “Criar Mortal” no topo da seleção.
- Não fechar UI “porque parece pronto”.
- Não emoji nem escudo fora dos usos travados.
- Não escrever tutorial de controle na UI (exceto Sábio).
- **Não resetar a escala do player.** Calibrada uma vez no load, no bind pose, em `PlayerView.fitStandingHeight`. `TARGET_HEIGHT` = `1.72 * 1.1`. A função mede só o eixo Y dos ossos, sem `mixer.update` e sem usar Z. Proibido sem pedido explícito do Felipe: editar `fitStandingHeight`, `TARGET_HEIGHT`, `model.scale`, medir altura de novo, ou “corrigir” tamanho ao mexer em animação, arma, oclusão ou carregamento. Animação quebrada se corrige no clip e no mixer. O encaixe de escala do inimigo em `EnemyRuntimeView` também não se mexe.
