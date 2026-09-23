# VFX — inventário I2

Documento de discovery. Depois de ler isto, dá para saber **efeito → onde roda → status**, sem abrir o código.

**Escopo varrido:** `presentation/effects/*` · `EffectManager.ts` · `ArmorAura.ts` · `CityWorld` · `CityGameSession` · `GameApp` · `data/balance/vfx.ts` · disco (0 arquivos `.vfx`/partículas em `public/`).  
**Conflito GDD × grill:** grill vence.

**Legenda de status**

| Status | Significado |
|---|---|
| `final` | Feedback em uso e tratado como oficial (ainda pode polir) |
| `placeholder` | Procedural / provisório; arte de arquivo falta |
| `falta` | Domínio esperado sem implementação |

Arquivo de asset VFX no disco: **0** → tudo vive em TypeScript / DOM.

---

## Resumo

| Família | Itens | Onde | Status dominante |
|---|---|---|---|
| Combate mesh | hit flash, pulse, slash, death scale, skill rings | `EffectManager` + sessão | placeholder |
| Level up | pulse + anel + shake + toast/HUD | `EffectManager` + `GameApp` | placeholder (fanfarra **sem áudio** → I11) |
| Ambiente hub | fonte água, brasas, embers, portal | `FountainWater` / `Brazier` / `AmbientEmbers` / `PortalVfx` | placeholder |
| HUD overlay | dmg numbers, HP bars, nameplates | DOM `#combat-overlay` | final (UI) |
| Aura arma | brilho + raios | `ArmorAura` (settings) | placeholder opcional |
| Pós-processo | bloom | `UnrealBloomPass` em `SceneRenderer` | final técnico |

---

## 1. Combate e skills (`EffectManager`)

| Id | Efeito | Gatilho | Onde roda | Status |
|---|---|---|---|---|
| `dmg-number` | Texto flutuante (dano / KO / MISS) | hit / kill / miss | overlay HTML | final |
| `hit-flash` | Emissive vermelho no mesh | dano em inimigo/jogador | material emissive | placeholder |
| `attack-pulse` | Scale squash no mesh | ataque (se chamado) | mesh scale | placeholder |
| `slash` | Linha ouro entre pontos | ataque básico | Line na cena | placeholder |
| `skill-bolt` | Linha colorida | skill árvore magia | Line | placeholder |
| `skill-burst` | Anel no chão | skill física | RingGeometry | placeholder |
| `skill-zone` | Anel menor | skill controle | RingGeometry | placeholder |
| `death-scale` | Scale down do mesh inimigo | morte inimigo | `playDeath` | placeholder (≠ clip GLB do player) |
| `range-ring` | Anel de alcance | indicador | RingGeometry | placeholder |
| `camera-punch` | Shake câmera | hit / kill / level up | offset câmera | placeholder |
| `hp-bar` | Barra world HP | combate | DOM | final (regra 40% verde/vermelho) |
| `npc-nameplate` | Nome NPC | hub | DOM | final |

Cores skill (sessão): magia `#b07cff` · controle `#6b7cff` · física `#c45c26`. Tempos: `VFX_BALANCE`.

---

## 2. Level up (liga D7)

| Id | Efeito | Onde | Status |
|---|---|---|---|
| `level-up-pulse` | Scale no player | `levelUpPulse` | placeholder |
| `level-up-ring` | Anel ouro no chão | cena 3D | placeholder |
| `level-up-shake` | `cameraPunch(0.14)` | câmera | placeholder |
| `level-up-toast` | “Nível N!” | `GameApp` toast | final UI |
| `level-up-hud` | `pulseFrame` + `flashBars` HP/MP/XP | frame do hub | final UI |
| `level-up-heal` | HP/MP full | lógica sessão | final regra |
| `level-up-sfx` | Fanfarra sonora | — | **falta** (I11) |

---

## 3. Ambiente

| Id | Efeito | Arquivo / classe | Cena | Status |
|---|---|---|---|---|
| `fountain-water` | Água animada (shader hook) | `FountainWater.ts` | cidade | placeholder → C12 |
| `brazier-flame` | Fogo + PointLight | `Brazier.ts` | cidade + dungeon | placeholder |
| `ambient-embers` | Points flutuantes | `AmbientEmbers.ts` | cidade | placeholder |
| `portal-gate` | Portal shader + partículas | `PortalVfx.ts` | cidade decor + saída dungeon | placeholder |
| `armor-aura` | Aura vermelha na arma | `ArmorAura.ts` | player (opt settings) | placeholder |

---

## 4. Falta / fora de escopo de arquivo

| Domínio | Status | Nota |
|---|---|---|
| Pack de partículas em `public/` | falta | nada versionado |
| VFX por skill nomeada (1:1 skillId) | falta | só 3 kinds genéricos |
| Morte inimigo com clip GLB | falta | só scale; anim = I1/C24 |
| Drop pickup sparkle | falta | só log UI (D6) |

---

## Fontes

- `game/src/presentation/effects/EffectManager.ts`
- `FountainWater.ts` · `PortalVfx.ts` · `Brazier.ts` · `AmbientEmbers.ts`
- `game/src/data/balance/vfx.ts`
- `CityGameSession` (gatilhos combate / level up)
