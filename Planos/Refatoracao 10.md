# Refatoração 10 — views async, diff e jogo após login — implementação

Executar passos **1 → 26** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 3.md` passos **11 → 17** (lock de conta no `BootFlow`, skip só em DEV).
- `Planos/Refatoracao 4.md` passos **1 → 33**.
- `Planos/Refatoracao 9.md` passos **1 → 16** (registry para pré-aquecer VFX).

## Comportamento

- Carga de GLB/animação cancelável por **token de geração** (troca de set de arma, `PlayerView.load`, spawn inimigo); callback obsoleto descartado e recursos liberados. Loader injetável para teste.
- `PlayerView.setWeaponSet`: a última chamada vence (rig, clipes e `weaponSet` coerentes); `load()` reaplica o `weaponSet` atual sob o mesmo token.
- `EnemyRuntimeView`: o `ctrl` é reaproveitado por id de spawn — modelo que chega para inimigo **morto** é anexado e toca `death`; só é descartado se o inimigo saiu (`hideAll`/`dispose`). Transição morto→vivo reinicia `currentAnim`. Promise rejeitada sai do cache `modelPrototypes`/`sharedClips`. Clipes carregados com `Promise.all`.
- `sync` por diff (só remonta quando id/modelo muda); emissive só quando muda; sem traversal por frame; mixer parado fora da tela ou morto; placeholder com `material.visible = false`; `isDying`/`isFlashing` em O(1) (`Set` no `EffectManager`).
- Oclusão do player: `BuiltWorld.occluders` montado por `CityProps.ts` e `CityWorld.ts` (prédios, paredes da cidade e das dungeons); inimigos, NPCs, baús, grama, marcadores e VFX fora do raycast.
- Temporários por frame fora de `WeaponRig.syncBowRest`, `SkillVfxRuntime.syncPassives` e `ArmorAura` (resto de #19).
- Jogo só carrega depois do login e da seleção: `main.ts` faz `import()` dinâmico de `GameCompositionRoot` após `runBootFlow`; nada do jogo é requisitado no login/seleção.
- Tela de carregamento (paleta C) substitui o `bootSceneFade`: cobre download, init e pré-aquecimento (VFX do loadout via registry + `renderer.compile`); some após o primeiro frame; erro de carga mostra mensagem pt-BR com Tentar de novo.
- Cards do boot: **um** `WebGLRenderer` compartilhado; rAF só para cards visíveis; pausa em `visibilitychange`; ao desmontar ou sair do boot, `dispose` + `forceContextLoss()`.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #10 | total | passos 9–10, 22 |
| #15 | total | passos 5–8 |
| #19 | total (com `Refatoracao 6.md`) | passo 11 |
| #21 | total | passos 15–16, 21; critérios do Complemento de #21 |
| #25 | total | passos 1–2, 17–18 |
| #26 | total | passos 3–4, 20 |
| #20 | parcial (ordem de carga + tela); assets em `Refatoracao 11.md` | passos 12–14 |

## Passos

### A — Player

1. `game/src/presentation/player/PlayerView.ts` — `setWeaponSet` e `load` com token; loader injetável; `load` reaplica `weaponSet`.
2. `game/src/presentation/player/WeaponRig.ts` — `equip` e bind de clipes ignoram resultado obsoleto.

### B — Inimigos

3. `game/src/presentation/enemies/EnemyRuntimeView.ts` — token por inimigo para model + clip; morto recebe modelo e toca `death`; descarte só após `hideAll`/`dispose`; reset de `currentAnim` no respawn.
4. `game/src/presentation/enemies/EnemyRuntimeView.ts` — cache sem promise rejeitada; clipes em `Promise.all`.
5. `game/src/presentation/enemies/EnemyRuntimeView.ts` — `sync(state)` compara id/hp/anim antes de trocar mesh; emissive só quando muda; referências cacheadas no spawn.
6. `game/src/presentation/enemies/EnemyRuntimeView.ts` — mixer pausado fora da tela ou morto; placeholder com `material.visible = false`.
7. `game/src/presentation/effects/EffectManager.ts` — `Set` de raízes em morte/flash para `isDying`/`isFlashing`.
8. `game/src/presentation/enemies/enemy-runtime-view.test.ts` (novo) — modelo chega após morte: anexado com `death`; após `dispose`: descartado; respawn reinicia animação.

### C — Oclusão e temporários

9. `game/src/presentation/rendering/SceneRenderer.ts` — `updatePlayerGhost` usa `occluders`, sem `intersectObject(worldRoot, true)`.
10. `game/src/world/CityProps.ts` e `game/src/world/CityWorld.ts` (`buildTestDungeonWorld`, `buildDungeon2World`) — preencher `BuiltWorld.occluders` com estáticos.
11. `game/src/presentation/player/WeaponRig.ts`, `game/src/presentation/effects/skill/SkillVfxRuntime.ts`, `game/src/presentation/player/ArmorAura.ts` — temporários reutilizados.

### D — Jogo após login

12. `game/src/main.ts` — `import()` dinâmico de `GameCompositionRoot` depois de `runBootFlow`; skip de DEV e `smoke.mjs` continuam funcionando.
13. `game/src/ui/LoadingScreen.ts` (novo) — substitui `bootSceneFade`/`releaseBootSceneFade` de `game/src/app/BootFlow.ts`; estado de erro pt-BR com Tentar de novo; some após primeiro frame renderizado.
14. `game/src/app/GameApp.ts` — pré-aquecer controllers VFX do loadout (`TkVfxRegistry`) e `renderer.compile` com a tela de carregamento visível.

### E — Cards do boot

15. `game/public/boot/assets/char-preview.mjs` — renderer compartilhado para roster e criação; rAF só em card visível; pausa em `visibilitychange`.
16. `game/public/boot/assets/char-preview.mjs` — desmontar com `dispose` + `forceContextLoss()`; desmontar tudo ao sair do boot.

### F — QA

17. `game/src/presentation/player/player-view.test.ts` (novo) — três `setWeaponSet` rápidos: vence o último; `load` durante troca mantém o set pedido.
18. `game/scripts/check-weapon-set-race.mjs` (novo) — Playwright com rede lenta: trocar set 5× e conferir `weaponRig.currentSet === getWeaponSet()`.
19. `game/scripts/check-model-lab.mjs` — regressão.
20. Manual: spawn → kill → spawn — sem inimigo fantasma nem cápsula permanente.
21. Manual: abrir/fechar criação de personagem 10× — ≤ 1 contexto WebGL, sem aviso de context loss.
22. Medição: tempo do raycast de oclusão e do `EnemyRuntimeView.sync` antes/depois (Performance panel).
23. Manual: DevTools Network no login — nenhum GLB/FBX/textura/chunk do jogo antes de escolher personagem.
24. `cd game && npm run typecheck && npm run test`.
25. `cd game && npm run smoke && node scripts/check-weapon-set-race.mjs`.
26. `cd game && npm run check:model-lab`.

## Testar

- [ ] Passos 24–26 verdes.
- [ ] Spam de troca de arma não acumula rigs invisíveis.
- [ ] Login e seleção não baixam assets do jogo; tela de carregamento aparece após escolher personagem; primeiro golpe sem travada de VFX.
- [ ] Performance panel: raycast de oclusão fora do topo do frame.

## Pendências

- Nenhuma.
