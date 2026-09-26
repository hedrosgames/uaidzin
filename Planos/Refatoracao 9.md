# Refatoração 9 — VFX registro — implementação

Executar passos **1 → 10** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Skill TK linhagem 1.md` passo **23** (lista de ciclo de vida no `EffectManager`).
- `Planos/Refatoracao 4.md` passo **14** (HP bars DOM com diff, se aplicável).

## Comportamento

- Controllers TK registrados em mapa id→instância; **lazy** na primeira cast.
- `update`/`clear`/`dispose` iteram só instâncias **ativas** ou registry completo sem duplicar 115 chamadas nominais.
- Pool compartilhado de `PointLight` para skills TK (limite provisório documentado em constante).
- Texturas base compartilhadas parametrizadas por paleta (não duplicar 23 arquivos `*Textures.ts` idênticos).
- Não alterar comportamento validado de `fireBurst/`.

## Passos

1. `game/src/presentation/effects/TkVfxRegistry.ts` (novo) — registrar factory por `DedicatedSkillVfx`.
2. `game/src/presentation/effects/EffectManager.ts` — substituir campos `tkGolpe`, … por registry; dispatch `switch` chama `registry.get(vfx)`.
3. `game/src/presentation/effects/EffectManager.ts` — lazy init na primeira `cast*` de cada tipo.
4. `game/src/presentation/effects/TkLightPool.ts` (novo) — adquirir/liberar luzes; integrar nos controllers que criam luz por cast.
5. `game/src/presentation/effects/tkSkills/shared/` — extrair textura/shader comuns consumidos por 2+ controllers (migrar um par como prova).
6. `game/src/presentation/effects/EffectManager.ts` — `getSkillVfxState` soma via registry.
7. `cd game && node scripts/check-tk-dispatch.mjs fisica controle magia` (criar script se ainda ausente — molde plano linhagem 2).
8. `cd game && node scripts/check-tk-controllers.mjs` (subset crítico: golpe furia muralha luz tribunal).
9. `cd game && npm run vfx:runtime:qa`.
10. `cd game && npm run typecheck && npm run smoke`.

## Testar

- [ ] Passos 7–10 verdes.
- [ ] Cast simultâneo de 3 skills TK não estoura luzes (contagem dev).
- [ ] Fire Burst inalterado visualmente (check-fire-chain se existir).
