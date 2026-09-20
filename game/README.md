# UAIDZIN — jogo (greybox)

RPG 3D de farm/autofarm para navegador. Loop completo: cidade → dungeon → loot → progressão.

Stack: **Vite + TypeScript + Three.js**. Sem backend. Offline.

---

## Como rodar

```bash
cd UAIDZIN/game
npm install
npm run dev          # http://127.0.0.1:5173
```

Produção:

```bash
npm run build        # tsc + vite → dist/
npm run preview      # serve dist/
```

---

## Ferramentas

### 1. Editor de configurações (balance WYD)

`tools/config-editor.html` — HTML standalone, sem build.

```bash
start tools/config-editor.html
# ou com dev server:
# http://127.0.0.1:5173/tools/config-editor.html
```

| Aba | O que edita |
|---|---|
| **Monstros** | Nome, tipo (fixed/chaser/ranged), nível, HP, ATQ, DEF, range, intervalo, speed, XP, gold, cor, boss |
| **Dungeons** | 8 dungeons; em cada arena, **qual monstro** nasce em cada ponto (x, z) |
| **Skills** | 4 classes × 3 árvores × 8 skills (nome, multiplicador, range, CD, auto) |
| **Drops** | Tabela por monstro: item + chance (0–1) + quantidade |
| **Itens** | Slot, raridade, bônus ATQ/DEF, valor de venda, descrição |
| **Lojas** | Mercador / Ferreiro: até 16 slots (item, qtd, preço) |

Botões do topo:
- **Exportar JSON** — baixa `game-config.json`
- **Importar JSON** — carrega um arquivo exportado
- **Seed padrão** — restaura os dados atuais do jogo

O editor salva sozinho no `localStorage` (`uaidzin-config-v1`). Layout responsivo 16:9.

Seed canônico: `public/data/game-config.json`.

> Wire no jogo (fase 2): o runtime ainda lê `src/data/**/*.ts`. O JSON exportado é a fonte de verdade de balance; o boot passará a fazer `fetch('/data/game-config.json')`.

---

### 2. Bot de autoteste (headed)

Joga sozinho: escolhe classe, ativa 10×, entra em dungeons, compra skills aleatórias, distribui atributos, mata monstros.

```bash
npm run dev                                          # terminal 1
npm run bot -- --max-level 15 --timeout-min 5        # terminal 2 (janela do Chromium)
```

| Flag | Default | Descrição |
|---|---|---|
| `--base` | `http://127.0.0.1:5173/` | URL do jogo |
| `--max-level` | `150` | Para ao atingir o nível |
| `--timeout-min` | `120` | Tempo máximo da run |
| `--speed` | `10` | TimeScale 1 ou 10 |

Script: `scripts/bot-play.mjs`. Usa `window.__UAIDZIN__` + UI real (portal, mercador).

---

### 4. Typecheck e build

```bash
npm run typecheck    # tsc --noEmit
npm run build        # tsc && vite build
```

Rode typecheck antes de commitar mudança em `src/`.

---

## Controles do jogo

| Ação | Tecla |
|---|---|
| Mover | WASD / setas / clique |
| Interagir | E |
| Skill | 1 (e 2+ no loadout) |
| Personagem | C |
| Skills | K |
| Inventário | I |
| Fechar painel | Esc |
| Velocidade 1×/10× | botão no HUD (canto superior direito) |
| Debug HUD | F1 |
| +1 nível | F2 |
| Gastar pts FOR | F3 |
| Timer dungeon → 3s | F9 |
| Reset (nível máx) | F5 |
| Evoluir (nível máx) | F6 |

C, K e I abrem os painéis no HTML da wire UI. Com `wireUi` montada, `bindPanels` em `GameApp.ts` retorna sem tratar teclas. Não há `KeyB` nem `KeyN`.

---

## Loop de gameplay

Aurelion → portal (dungeon do nível) → farm 10 min → resumo → cidade.

- Ataque básico **só parado**; skills manuais/auto no loadout (máx 4).
- Inimigos: fixed (laranja), chaser (vermelho), ranged (roxo) + boss.
- Loot → inventário (40). Cheio **perde** o item.
- Ouro: venda (Mercador) · refine +0–+10 (Ferreiro).
- XP/nível: 5 pts de atributo. Reset no nível máx da etapa: +1.000 pts.
- 4 classes (TK/FM/BM/HT), 3 árvores × 8 skills, 8ª exclusiva.
- Save (IndexedDB + localStorage, AES-GCM) ao voltar à cidade e a cada 30s; sync do hub.
- API: `__UAIDZIN__.save.persist|wipeProfile|wipeAccount|wipeAll|status`
- Wipe UI: `/tools/save-wipe.html`
- Teste: `npm run test:save`

---

## Estrutura do projeto

```
game/
  index.html              # shell do jogo (HUD, canvas, painéis)
  package.json
  vite.config.ts
  tsconfig.json
  public/
    data/game-config.json # seed de balance (shape do editor)
  tools/
    config-editor.html    # editor de monstros/dungeons/skills/drops/itens
  scripts/
    bot-play.mjs          # bot headed longo
    shot-combat.mjs       # screenshot de combate (legado)
  src/
    main.ts               # bootstrap
    app/                  # GameApp, CityGameSession, GameLoop, composition
    core/                 # EventBus, GameState, clock, errors
    data/                 # balance + defs (fonte TS atual)
      balance/            # combat, dungeon, economy, progression, skills, vfx
      classes/            # 4 classes × 3 árvores
      dungeons/           # 8 dungeons Mortal + test
    domain/               # regras (sem three.js)
      character/ combat/ dungeons/ economy/ enemies/
      inventory/ items/ progression/ skills/
    gameplay/             # PlayerController, PlayerRuntime
    persistence/          # SaveService (IndexedDB)
    presentation/         # three.js: renderer, camera, enemies, effects
    ui/                   # WireUi (overlay C/K/I/B), GamePanels legado, InteractionPanel
    world/                # CityWorld, WorldManager, boundaries
  docs/compose/spec/      # specs de features (compose-next)
```

### Onde mexer no quê

| Quer mudar… | Arquivo/pasta |
|---|---|
| Balance de combate/inimigos | `src/data/balance/combat.ts` (hoje) ou editor → JSON |
| Dungeons e spawns | `src/data/dungeons/` (hoje) ou editor → JSON |
| Skills das classes | `src/data/classes/class-definitions.ts` ou editor |
| Drops / economia | `src/data/balance/economy.ts`, `src/domain/economy/` |
| Progressão / XP / reset | `src/domain/progression/`, `balance/progression.ts` |
| Combate (dano, hit, skills) | `src/domain/combat/` |
| Cena / player mesh | `src/presentation/rendering/SceneRenderer.ts` |
| Inimigos na tela | `src/presentation/enemies/EnemyRuntimeView.ts` |
| VFX / juice | `src/presentation/effects/EffectManager.ts` |
| HUD e painéis | `index.html`, `src/ui/`, `src/app/GameApp.ts` |
| Save | `src/persistence/SaveService.ts` |
| Cidade / NPCs / portal | `src/world/definitions.ts`, `CityWorld.ts` |

### Convenções

- **Domínio** (`src/domain/`) não importa three.js.
- **UI** não calcula dano/XP — chama `CityGameSession`.
- Balance centralizado em `src/data/` (não espalhar números no domínio).
- Debug API em `window.__UAIDZIN__` só para bot/debug — não usar em gameplay.
- Specs de feature em `docs/compose/spec/<nome>.md` (formato compose-next).
- Design canônico: `../00-GDD-INDEX.md` e capítulos na raiz de `UAIDZIN/`.
- Decisões confirmadas: `../plano de implementação/19-decisoes-confirmadas.md`.

---

## Debug API (`window.__UAIDZIN__`)

Usada pelo bot e por inspeção manual. No console do browser ou via Playwright:

```js
__UAIDZIN__.getSnapshot()          // mode, level, kills, skillPoints, timeScale…
__UAIDZIN__.setTimeScale(10)       // 1 ou 10
__UAIDZIN__.enterDungeon()
__UAIDZIN__.toCity()
__UAIDZIN__.teleportPlayer(x, z)
__UAIDZIN__.learnRandomSkill()
__UAIDZIN__.spendRandomAttributes()
__UAIDZIN__.openInteractionById("npc-portal-guard")
__UAIDZIN__.enterDungeon()
__UAIDZIN__.clearSave()
__UAIDZIN__.save.persist()
__UAIDZIN__.save.wipeProfile()
__UAIDZIN__.save.wipeAccount()
__UAIDZIN__.save.wipeAll()
__UAIDZIN__.save.status()
__UAIDZIN__.debugAddLevels(n)
```

---

## Fluxo de trabalho sugerido

1. `npm run dev` + abrir o jogo.
2. Mudança de balance → preferir o **editor HTML**, exportar JSON (e depois sincronizar TS se ainda não houver wire).
3. Mudança de código → `npm run typecheck`.
4. Feature nova → criar `docs/compose/spec/<feature>.md` e seguir DoD.
5. Antes de commitar: typecheck limpo + inspeção visual quando a UI mudar.

---

## Design e roadmap

- GDD: `UAIDZIN/00-GDD-INDEX.md` … `32-auditoria-e-cobertura.md`
- Plano de implementação: `UAIDZIN/plano de implementação/`
- Fases 1–13 em greybox. Balance provisório identificado em `src/data/balance/`.
