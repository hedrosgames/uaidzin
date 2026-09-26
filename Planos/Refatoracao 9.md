# Refatoração 9 — VFX registro — implementação

Executar passos **1 → 16** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Skill TK linhagem 1.md` passos **23** (lista de ciclo de vida no `EffectManager`), **25** (paleta da Fúria usada por `descuidado`) e **28** (`check-tk-dispatch.mjs`).
- `Planos/Skill TK linhagem 2.md` e `3.md` (Etapa 1) podem vir antes ou depois; se vierem depois, registram as factories novas no `TkVfxRegistry`.

## Comportamento

- Controllers TK registrados em mapa id→factory (factory aceita paleta); **lazy** na primeira cast.
- `update`/`clear`/`dispose` iteram só instâncias criadas; controller sem cast ativa retorna cedo e pula `batchedRenderer.update`.
- Pool compartilhado de `PointLight` criado no load do mundo (**4**, provisório, constante `TK_LIGHT_POOL_SIZE` em `game/src/data/balance/vfx.ts`); nenhum cast cria/remove luz — vale para controllers TK, `GenericSkillVfxCast` e `FireBurstCast`; contagem de luzes constante no combate.
- Pool entra como parâmetro opcional do construtor; sem pool (demos, `check-tk-controllers.mjs`, `catalogDemo.ts`) o controller usa luz própria.
- Textura do atlas de fogo gerada **uma** vez e compartilhada (cache por chave), inclusive pelo `Brazier`.
- Texturas base compartilhadas parametrizadas por paleta em `game/src/presentation/effects/vfxKit/`.
- Visual do Fire Burst inalterado; só a origem da luz muda.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #9 | total | passos 4–6, 13; critérios do Complemento de #9 |
| #12 | total | passos 1–3, 7–10, 13 |

## Passos

1. `game/src/presentation/effects/TkVfxRegistry.ts` (novo) — factory por `DedicatedSkillVfx`, com paleta opcional.
2. `game/src/presentation/effects/EffectManager.ts` — substituir a lista do TK1 passo 23 e os campos `tkGolpe`, … pelo registry; dispatch chama `registry.get(vfx)`; lazy na primeira `cast*`.
3. `game/src/presentation/effects/EffectManager.ts` — `getSkillVfxState` soma via registry.
4. `game/src/presentation/effects/TkLightPool.ts` (novo) — adquirir/liberar luzes; criado no load do mundo; parâmetro opcional dos controllers.
5. `game/src/presentation/effects/tkSkills/` — controllers usam o pool quando recebido; fallback de luz própria.
6. `game/src/presentation/effects/skill/SkillVfxRuntime.ts` (`GenericSkillVfxCast`) e `game/src/presentation/effects/fireBurst/FireBurstVfx.ts` (`FireBurstCast`) — luz do pool, mesmo visual.
7. `game/src/presentation/effects/fireBurst/FireBurstFlameTexture.ts` — cache único do atlas; `game/src/presentation/effects/Brazier.ts` usa o cache.
8. `game/src/presentation/effects/tkSkills/` — `update` retorna cedo sem cast ativa e pula `batchedRenderer.update`.
9. `game/src/presentation/effects/vfxKit/` — textura/shader comuns consumidos por 2+ controllers TK (migrar um par como prova).
10. `game/scripts/check-tk-controllers.mjs` — construtor sem pool continua válido.
11. `cd game && node scripts/check-tk-dispatch.mjs fisica` (acrescentar `controle` e `magia` quando TK2/TK3 já estiverem na `main`).
12. `cd game && node scripts/check-tk-controllers.mjs` (subset crítico: golpe furia muralha luz tribunal).
13. Medição: `renderer.info.programs.length` e número de `PointLight` antes/depois de 3 casts TK + Fire Burst; tempo até o primeiro frame antes/depois.
14. `cd game && npm run vfx:runtime:qa`.
15. `cd game && npm run typecheck && npm run smoke`.
16. Manual: Fire Burst e 3 skills TK lado a lado com a versão anterior.

## Testar

- [ ] Passos 11–15 verdes.
- [ ] Cast de 3 skills TK e Fire Burst: `renderer.info.programs.length` não cresce após aquecimento; contagem de `PointLight` constante.
- [ ] Boot do jogo sem gerar atlas de fogo 5×.
- [ ] Fire Burst inalterado visualmente.

## Pendências

- Nenhuma.
