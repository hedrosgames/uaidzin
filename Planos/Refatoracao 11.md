# Refatoração 11 — render, mundo e qualidade gráfica — implementação

Executar passos **1 → 25** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 4.md` passo **24** (`SettingsPanel`, `uaidzin_settings`).
- `Planos/Refatoracao 10.md` passos **1 → 26** (token em `PlayerView.load`, jogo após login).

## Comportamento

- Seletor de qualidade gráfica nas Opções: **Baixo / Médio / Alto** (padrão Médio), salvo em `uaidzin_settings` (por máquina, fora do save do personagem).
- Preset controla (provisório): MSAA do render target (0 / 2× / 4×), `antialias` do canvas desligado quando há render target, bloom (Baixo sem bloom; Médio/Alto em meia resolução), DPR máximo (1 / 1,5 / 2), sombras e tamanho do shadow map. A opção de sombras avulsa vira parte do preset.
- Preset aplicado na criação do `SceneRenderer` e na troca, sem recarregar e sem `needsUpdate` em massa por frame.
- Shadow map re-renderiza só quando a luz segue o player e ele se moveu (`shadow.autoUpdate = false` + `needsUpdate` sob demanda).
- Mundo: props com `frustumCulled` padrão; shaders procedurais de chão, props e jardim com variante barata no Baixo; textura de granito carregada uma vez; luzes fixas da dungeon reduzidas a **4** (provisório).
- Assets: nenhuma classe baixa o GLB de outra só para idle (idle compartilhado em `game/public/models/player/shared/anims/`); loads em paralelo sem perder o token do plano 10; PNG de chão ≤ 1 MB; inimigo especial em GLB (sai `FBXLoader`); boot usa `three.module.min.js`; páginas `vfx/*.html` fora do build de produção.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #11 | total | passos 1–5, 21; critérios do Complemento de #11 |
| #18 | total | passos 6–10, 21 |
| #20 | total (com `Refatoracao 10.md`) | passos 11–18, 22 |

## Passos

### A — Qualidade gráfica

1. `game/src/presentation/rendering/GraphicsQuality.ts` (novo) — presets Baixo/Médio/Alto.
2. `game/src/presentation/rendering/SceneRenderer.ts` — aplicar preset na criação e na troca (MSAA, bloom, DPR, sombras); sem MSAA duplicado; `setShadowsEnabled` passa a ser interno do preset.
3. `game/src/presentation/rendering/SceneRenderer.ts` — `shadow.autoUpdate = false`; `followKeyLight` marca `needsUpdate` só quando a posição muda.
4. `game/src/ui/SettingsPanel.ts` — seletor de qualidade no lugar da opção de sombras; grava em `uaidzin_settings`.
5. `game/src/app/GameApp.ts` — ler o preset de `uaidzin_settings` antes de criar o `SceneRenderer`.

### B — Mundo

6. `game/src/world/CityProps.ts` — remover `frustumCulled = false` onde não há deformação; `hardenPropMaterials` com variante barata no Baixo.
7. `game/src/world/CityGround.ts` — granito carregado uma vez (hoje 2×); variante barata do shader no Baixo.
8. `game/src/world/CityLandscape.ts` — shader do jardim com variante barata no Baixo.
9. `game/src/world/CityWorld.ts` e `game/src/presentation/effects/Brazier.ts` — luzes fixas da dungeon reduzidas; braseiros sem `PointLight` própria além do limite.
10. Medição: draw calls e FPS da cidade e da dungeon-test por preset, antes/depois.

### C — Assets

11. `game/public/models/player/shared/anims/idle.glb` (novo) — idle exportado a partir do clipe usado hoje.
12. `game/src/presentation/player/PlayerView.ts` — idle por classe sem `BM.glb`; loads em paralelo preservando o token do plano 10.
13. `game/public/boot/assets/char-preview.mjs` — remover `IDLE_FROM = { TK: "BM" }`; usar o idle compartilhado.
14. `game/public/textures/` — `city-granite-albedo.png` e `dungeon-cemetery-albedo.png` ≤ 1 MB.
15. `game/public/models/enemies/skeleton-special.fbx` → `.glb`; `game/src/presentation/enemies/EnemyRuntimeView.ts` sem `FBXLoader`.
16. `game/public/vendor/three/three.module.min.js` (novo, copiado de `three/build/` na mesma versão do `package.json`); `game/public/boot/02-selecao-personagem.html` — importmap aponta para ele.
17. `game/vite.config.ts` — páginas `vfx/*.html` só no `dev` (fora de `build.rollupOptions.input`).
18. `nongame/docs/inventarios/assets.md` — formatos/caminhos novos (task de auditoria).

### D — QA

19. `cd game && npm run typecheck && npm run smoke`.
20. `cd game && npm run build && npm run check:model-lab`.
21. Manual: Baixo/Médio/Alto — FPS e visual.
22. Medição: tamanho de `game/dist/` e número de requisições da primeira carga do jogo antes/depois (Network).
23. Manual: `renderer.info.programs` não cresce ao trocar preset nem ao mexer em volume.
24. Manual: dungeon-test e D2 com luzes reduzidas mantêm leitura dos corredores.
25. Manual: inimigo especial anima igual ao FBX.

## Testar

- [ ] Passos 19–20 verdes.
- [ ] Preset persiste após reload e muda MSAA/bloom/DPR/sombras.
- [ ] Parado, o shadow map não re-renderiza.
- [ ] Payload da primeira carga do jogo menor que antes (Network).

## Pendências

- Visual e FPS de cada preset: Felipe valida no fim da refatoração (passo 21).
