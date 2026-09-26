# Refatoração 9 — VFX registro — implementação

Executar passos **1 → 11** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Skill TK linhagem 1.md` passos **23** (lista de ciclo de vida no `EffectManager`) e **28** (`check-tk-dispatch.mjs`).
- `Planos/Refatoracao 4.md` passo **17** (views de HUD com diff).

## Comportamento

- Controllers TK registrados em mapa id→factory; **lazy** na primeira cast.
- `update`/`clear`/`dispose` iteram só instâncias **ativas**.
- Pool compartilhado de `PointLight` criado no load do mundo (**4**, provisório, constante `TK_LIGHT_POOL_SIZE`); cast nunca cria/remove luz; contagem de luzes constante no combate.
- Textura do atlas de fogo gerada **uma** vez e compartilhada (cache por chave).
- Texturas base compartilhadas parametrizadas por paleta.
- Não alterar comportamento validado de `fireBurst/`.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #9 | total | passo 4; critérios do Complemento de #9 |
| #12 | total | passos 1–3, 5 |

## Passos

1. `game/src/presentation/effects/TkVfxRegistry.ts` (novo) — registrar factory por `DedicatedSkillVfx`.
2. `game/src/presentation/effects/EffectManager.ts` — substituir campos `tkGolpe`, … por registry; dispatch chama `registry.get(vfx)`.
3. `game/src/presentation/effects/EffectManager.ts` — lazy init na primeira `cast*` de cada tipo.
4. `game/src/presentation/effects/TkLightPool.ts` (novo) — adquirir/liberar luzes do pool; controllers usam o pool.
5. `game/src/presentation/effects/fireBurst/FireBurstFlameTexture.ts` — cache único do atlas.
6. `game/src/presentation/effects/tkSkills/shared/` — textura/shader comuns consumidos por 2+ controllers (migrar um par como prova).
7. `game/src/presentation/effects/EffectManager.ts` — `getSkillVfxState` soma via registry.
8. `cd game && node scripts/check-tk-dispatch.mjs fisica controle magia`.
9. `cd game && node scripts/check-tk-controllers.mjs` (subset crítico: golpe furia muralha luz tribunal).
10. `cd game && npm run vfx:runtime:qa`.
11. `cd game && npm run typecheck && npm run smoke`.

## Testar

- [ ] Passos 8–11 verdes.
- [ ] Cast de 3 skills TK: `renderer.info.programs.length` não cresce após aquecimento; contagem de `PointLight` constante.
- [ ] Boot do jogo sem gerar atlas de fogo 5×.
- [ ] Fire Burst inalterado visualmente.
