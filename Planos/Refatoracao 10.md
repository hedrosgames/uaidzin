# Refatoração 10 — views async, diff e jogo após login — implementação

Executar passos **1 → 17** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 4.md` passos **1 → 26**; `Planos/Refatoracao 3.md` passos **8 → 10** (lock de conta antes de `createGameApp`).

## Comportamento

- Carga de GLB/animação cancelável por **token de geração** (troca de set de arma, spawn inimigo); callback obsoleto descartado e recursos liberados.
- `PlayerView.setWeaponSet`: a última chamada vence (rig, clipes e `weaponSet` coerentes).
- `EnemyRuntimeView`: modelo que chega para inimigo morto/removido é descartado; `sync` por diff (só remonta quando id/modelo muda); sem traversal por frame; mixer parado fora da tela ou morto.
- Oclusão do player: lista explícita de occluders estáticos (ou `layers`); inimigos, grama, marcadores e VFX fora do raycast.
- Jogo só carrega depois do login e da seleção: `createGameApp` roda após `runBootFlow`; tela de carregamento (paleta C) cobre download e init.
- Cards do boot: **um** `WebGLRenderer` compartilhado; rAF só para cards visíveis.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #10 | total | passos 5–6 |
| #15 | total | passos 3–4 |
| #21 | total | passos 7–9; critérios do Complemento de #21 |
| #25 | total | passo 1 |
| #26 | total | passo 2 |
| #20 | parcial (ordem de carga + tela); assets em `Refatoracao 11.md` | passos 7–8 |

## Passos

1. `game/src/presentation/player/PlayerView.ts` — `setWeaponSet` com token; `WeaponRig.equip` e bind de clipes ignoram resultado obsoleto.
2. `game/src/presentation/enemies/EnemyRuntimeView.ts` — token por inimigo para model + clip; descartar e liberar se inimigo morreu/saiu.
3. `game/src/presentation/enemies/EnemyRuntimeView.ts` — `sync(state)` compara id/hp/anim antes de trocar mesh; emissive só quando muda; referências cacheadas no spawn.
4. `game/src/presentation/enemies/EnemyRuntimeView.ts` — mixer pausado fora da tela ou morto.
5. `game/src/presentation/rendering/SceneRenderer.ts` — `updatePlayerGhost` usa lista de occluders (ou `layers`), sem `intersectObject(worldRoot, true)`.
6. `game/src/world/CityProps.ts` — registrar occluders estáticos da cidade e da dungeon.
7. `game/src/main.ts` — `createGameApp` depois de `runBootFlow`; nada do jogo requisitado no login/seleção.
8. `game/src/ui/LoadingScreen.ts` (novo) — tela entre seleção e jogo; some após primeiro frame renderizado.
9. `game/public/boot/assets/char-preview.mjs` — renderer compartilhado para roster e criação; rAF só em card visível.
10. `game/src/presentation/player/player-view.test.ts` (novo) — três `setWeaponSet` rápidos: vence o último.
11. `game/scripts/check-model-lab.mjs` — regressão.
12. Manual: trocar arma rápido 5× — sem mesh duplicada ou NaN.
13. Manual: spawn → kill → spawn — sem inimigo fantasma.
14. Manual: DevTools Network no login — nenhum GLB/FBX/textura do jogo; ≤ 1 contexto WebGL na seleção.
15. `cd game && npm run typecheck && npm run test`.
16. `cd game && npm run smoke`.
17. `cd game && npm run check:model-lab`.

## Testar

- [ ] Passos 15–17 verdes.
- [ ] Spam de troca de arma não acumula rigs invisíveis.
- [ ] Login e seleção não baixam assets do jogo; tela de carregamento aparece após escolher personagem.
- [ ] Performance panel: raycast de oclusão fora do topo do frame.
