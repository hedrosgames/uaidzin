---
name: threejs
description: Inspecionar e ajustar cenas Three.js do UAIDZIN via threejs-devtools-mcp (dev only). Use ao debugar personagem, animação, materiais ou câmera no browser.
---

# Skill /threejs — UAIDZIN + Three.js DevTools MCP

## Pré-requisitos

1. `cd game && npm run dev` (porta **5173**).
2. MCP **threejs-devtools-mcp** habilitado no Cursor (`.cursor/mcp.json`).
3. Aba aberta em **http://localhost:9222** (proxy do MCP, não a URL crua do Vite).
4. Jogo principal ou laboratório: `http://localhost:9222/` ou `http://localhost:9222/anim-lab.html`.

## Fluxo obrigatório

```
INSPECT → UNDERSTAND → MODIFY → VERIFY
```

Nunca assuma nomes de mesh, clip ou osso. Sempre use `scene_tree`, `find_objects`, `object_details`, `animation_details`, `skeleton_details` antes de editar.

## UAIDZIN — pontos fixos

| Alvo | Nome típico |
|------|-------------|
| Cena | `UAIDZIN_Scene` |
| Mundo | `WorldRoot` |
| Jogador | `PlayerRoot` + filho com classe (`TK`, `FM`, …) |
| Câmera de jogo | exposta via `__THREE_CAMERA__` (GameCamera, não o RenderPass interno) |
| Pós-processo | `EffectComposer` em `renderer.userData.effectComposer` |

Atalho de jogo (proxy): `__UAIDZIN__.skipToGame()` entra na cidade com personagem carregado.

Laboratório mínimo: `/anim-lab.html` — personagem TK, idle + run, luz, cubo `AnimLab_Prop`.

Mixers expostos em dev: `window.__THREE_ANIMATION_MIXERS__` (PlayerView / anim lab).

## Ferramentas MCP (ordem sugerida)

1. `bridge_status` — proxy conectado?
2. `scene_tree` (`compact: true`) — hierarquia
3. `find_objects` — `type: SkinnedMesh`, `namePattern: Player`
4. `skeleton_details` — ossos do personagem
5. `animation_details` — clips e actions do mixer
6. `camera_details` / `set_camera` — enquadramento
7. `set_animation` — play/pause, `clipName`, `timeScale`, crossfade via play + fade
8. `take_screenshot` / `performance_snapshot` — prova visual

## Animação

Preferir clips GLB existentes (`idle`, `run`, `attack`, …) e **crossFade** / `timeScale` em actions já registradas no `AnimationMixer`.

Não inventar centenas de keyframes no browser.

Clips humanos: `/models/anims/human/`. Mutant (BM): `/models/anims/mutant/`.

## Personagem (GLB)

```
GLB → scene_tree / find_objects (SkinnedMesh)
    → skeleton_details
    → animation_details
    → só então set_material / set_object_transform / set_animation
```

## Verificação visual

Mudança concluída só após `take_screenshot`, `animation_details` (action running) ou inspeção de transform/material coerente. Código sem erro no console não basta.

## Falhas comuns

| Sintoma | Causa |
|---------|--------|
| Bridge not connected | Aba 9222 fechada ou dev server parado |
| No AnimationMixer | Personagem ainda não carregou; usar skipToGame ou anim-lab |
| Cena vazia | Boot/login; skipToGame ou anim-lab |
| postprocessing_list vazio | Composer não registrado — conferir integração dev |

## Segurança

MCP e `run_js` são **somente desenvolvimento**. Não habilitar em build de produção nem expor proxy publicamente.
