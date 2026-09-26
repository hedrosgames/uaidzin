# Refatoração 10 — views async e diff — implementação

Executar passos **1 → 12** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- Nenhum bloqueio de save; pode rodar após plano 4.

## Comportamento

- Carga de GLB/animação cancelável por **token de geração** (equip arma, spawn inimigo).
- `WeaponRig.equip` / `EnemyRuntimeView.spawn`: ignorar callback se geração obsoleta.
- Sync visual por **diff** (só remount quando id/model muda).
- Oclusão: lista explícita de occluders; não raycast cego por frame em tudo.
- Cards do boot (`game/public/boot/`): **um** `WebGLRenderer` compartilhado ou canvas offscreen (meta: reduzir contextos WebGL).

## Passos

1. `game/src/presentation/player/WeaponRig.ts` — contador `generation`; async load aborta se `generation` mudou.
2. `game/src/presentation/enemies/EnemyRuntimeView.ts` — idem para model + clip.
3. `game/src/presentation/enemies/EnemyRuntimeView.ts` — `sync(state)` compara id/hp/anim antes de trocar mesh.
4. `game/src/world/OcclusionPass.ts` (novo ou existente) — registrar occluders estáticos da cena city/dungeon.
5. `game/src/app/CityGameSession.ts` ou view layer — passar occluders para barra HP world-space.
6. `game/public/boot/` — refatorar cards de personagem para renderer compartilhado (arquivos JS do boot).
7. `game/scripts/check-model-lab.mjs` — regressão se existir.
8. Manual: trocar arma rápido 5× — sem mesh duplicada ou NaN.
9. Manual: spawn kill spawn — sem inimigo fantasma.
10. `cd game && npm run typecheck`.
11. `cd game && npm run smoke`.
12. `cd game && npm run check:model-lab` se script existir.

## Testar

- [ ] Passos 10–11 verdes.
- [ ] Spam equip não acumula rigs invisíveis (devtools scene graph).
- [ ] Boot login cards renderizam com ≤1 contexto WebGL (meta).
