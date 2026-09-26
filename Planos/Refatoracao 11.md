# Refatoração 11 — render, mundo e qualidade gráfica — implementação

Executar passos **1 → 12** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 4.md` passo **19** (`SettingsPanel`) e `Planos/Refatoracao 10.md` passos **7 → 8** (jogo após login).

## Comportamento

- Seletor de qualidade gráfica nas Opções: **Baixo / Médio / Alto**, salvo junto das demais opções (`options`).
- Preset controla (provisório): MSAA do render target (0 / 2× / 4×), `antialias` do canvas desligado quando há render target, bloom em meia resolução (Baixo sem bloom), DPR máximo (1 / 1,5 / 2), sombras e tamanho do shadow map.
- Troca de preset aplica sem recarregar e sem `needsUpdate` em massa por frame.
- Mundo: props com `frustumCulled` padrão; shaders procedurais de chão com custo reduzido no Baixo.
- Assets: TK não baixa `BM.glb` só para idle; loads em paralelo; PNG de chão ≤ 1 MB (KTX2/WebP ou redimensionado); inimigo especial em formato leve.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #11 | total | passos 1–4; critérios do Complemento de #11 |
| #18 | total | passos 5–6 |
| #20 | total (com `Refatoracao 10.md`) | passos 7–9 |

## Passos

1. `game/src/presentation/rendering/GraphicsQuality.ts` (novo) — presets Baixo/Médio/Alto.
2. `game/src/presentation/rendering/SceneRenderer.ts` — aplicar preset (MSAA, bloom, DPR, sombras); sem MSAA duplicado.
3. `game/src/ui/SettingsPanel.ts` — seletor de qualidade; salvar em `options`.
4. `game/src/persistence/SaveTypes.ts` — `options.graphicsQuality` (padrão Médio).
5. `game/src/world/CityProps.ts` — remover `frustumCulled = false` onde não há deformação; `game/src/world/CityWorld.ts` idem.
6. `game/src/world/CityGround.ts` — variante barata do shader no Baixo.
7. `game/src/presentation/player/PlayerView.ts` — idle por classe sem `BM.glb`; loads em paralelo.
8. `game/public/textures/` — `city-granite-albedo.png` e `dungeon-cemetery-albedo.png` ≤ 1 MB.
9. `nongame/docs/inventarios/assets.md` — formatos/caminhos novos (task de auditoria).
10. Manual: Baixo/Médio/Alto — FPS e visual (Felipe valida).
11. `cd game && npm run typecheck && npm run smoke`.
12. `cd game && npm run build`.

## Testar

- [ ] Passos 11–12 verdes.
- [ ] Preset persiste após reload e muda MSAA/bloom/DPR/sombras.
- [ ] `renderer.info` sem recompilação ao trocar volume.
- [ ] Payload da primeira carga do jogo menor que antes (Network).
