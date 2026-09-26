# Skill TK — linhagem 3 (Magia) — implementação

Executar **Etapa 1** passos **1 → 10**; depois **Etapa 2** passos **11 → 16** (uma skill elemental por task). Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Skill TK linhagem 1.md` passo **23** (lista de ciclo de vida no `EffectManager`) antes da Etapa 2.
- `Planos/Skill TK linhagem 2.md` passos **1–2** (`directionFor`) antes do passo **16** (Fire Slash paleta).
- Campo `desc` em `skill-types.ts` (linhagem 1 passo **15**).

## Comportamento

- Ficha: `game/src/data/classes/skills/tk.ts` → `TK_MAGIA` (8 **ativas**; todas podem ocupar barra).
- **Etapa 1:** cinco VFX dedicados; três elementais usam genérico (`SkillVfxDirector` + cor do elemento).
- **Etapa 2:** substituir genérico por paletas `selo-gelo`, `corte-veneno`, `golpe-fogo`.
- Aoe centrada no jogador: cases `tribunal` e `selo` usam `input.center` quando `profile.family === "aoe"`.
- Mana Burn: aura visual **2,5 s**; buff **12 s** — `magicPower +28 %`, `mpCostMul 1,4` em **todas** as skills.
- Nomes UI: id `tk_mag_death_stab` → **“Estocada do Veredito”**; id `tk_mag_circulo_morte` → **“Círculo da Morte”**.

| Pos | Id | Etapa 1 VFX | Etapa 2 VFX |
|---:|---|---|---|
| 1 | `tk_mag_lamina_energia` | `luz` | — |
| 2 | `tk_mag_campo_gelo` | genérico gelo | `selo-gelo` |
| 3 | `tk_mag_mana_burn` | `aura` | — |
| 4 | `tk_mag_moon_ray` | `julgamento` | — |
| 5 | `tk_mag_poison_stab` | genérico veneno | `corte-veneno` |
| 6 | `tk_mag_fire_slash` | genérico fogo | `golpe-fogo` |
| 7 | `tk_mag_death_stab` | `desafio` | — |
| 8 | `tk_mag_circulo_morte` | `tribunal` | — |

## Passos — Etapa 1

### A — Despacho

1. `game/src/presentation/effects/EffectManager.ts` — para `case "tribunal"` e `case "selo"`: se `input.profile.family === "aoe"`, centro = `input.center` (jogador).
2. Mesmo arquivo — `case "aura"`: duração **2,5 s** via `game/src/data/balance/vfx.ts` → `skillBuffAuraSeconds`.

### B — Mapa

3. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — ligar ids da tabela (etapa 1); **remover** `tk_mag_1` … `tk_mag_8`.
4. **Não** mapear `tk_mag_campo_gelo`, `tk_mag_poison_stab`, `tk_mag_fire_slash` (ficam no genérico).

### C — Fichas

5. `game/src/data/classes/skills/tk.ts` — `name` e `desc` das 8 (textos abaixo).
6. Rodar pipeline do repo que regenera `game/vfx/skills-manifest.json` e `game/vfx/uaidzin_skill_catalog.js` se `tk.ts` alimentar o manifest (se existir script npm, executar após editar).

Textos `desc`:

- Lâmina de Energia — “Fio de alvorada: um feixe de luz corta um inimigo a até 8 m. Dano mágico. Nível aumenta o dano.”
- Campo de Gelo — “Geada radial: dano de gelo num raio de 3,4 m e os atingidos andam a 55 % da velocidade por 3,5 s. Nível aumenta o dano.”
- Mana Burn — “Mana em combustão: dano mágico +28 % por 12 s, mas toda skill custa 40 % mais mana enquanto durar.”
- Moon Ray — “Fenda lunar: um raio vertical cai sobre um inimigo a até 8 m. Dano mágico alto. Nível aumenta o dano.”
- Poison Stab — “Agulha verde: estocada curta que envenena o alvo por 4 s (35 % do dano do golpe por segundo). Nível aumenta o dano e o veneno.”
- Fire Slash — “Varredura de brasa: corte largo de fogo que atinge todos num raio de 3,5 m. Nível aumenta o dano.”
- Estocada do Veredito — “Lança do veredito: estocada sagrada que ignora 20 % da defesa. Dano mágico muito alto em um alvo. Nível aumenta o dano.”
- Círculo da Morte — “Tribunal de lâminas: pilares de luz caem ao redor de você num raio de 4,2 m. Só uma 8ª skill por personagem: comprar esta bloqueia Fire Burst e Divine Armor.”

### D — QA Etapa 1

7. `game/scripts/check-tk-dispatch.mjs` — árvore `magia`: 5 dedicadas + 3 genéricas elementares; `desc` presente.
8. `game/scripts/check-tk-magia.mjs` (novo) — Playwright: 8 skills, Mana Burn infla MP, 8ª exclusiva, reload.
9. `cd game && node scripts/check-tk-controllers.mjs luz aura julgamento desafio tribunal`.
10. `cd game && npm run typecheck && npm run vfx:runtime:qa && npm run smoke`.

## Passos — Etapa 2 (paletas)

11. `game/src/presentation/effects/tkSkills/selo/` — `palette` em config; instância gelo; `EffectManager`: `tkSeloGelo`, `case "selo-gelo"`; mapa `tk_mag_campo_gelo`.
12. `game/src/presentation/effects/tkSkills/corte/` — paleta veneno; `tkCorteVeneno`, `case "corte-veneno"`; mapa `tk_mag_poison_stab`.
13. `game/src/presentation/effects/tkSkills/golpe/` — paleta fogo, `arcRadius` ~3,5; `tkGolpeFogo`, `case "golpe-fogo"` com `directionFor`; mapa `tk_mag_fire_slash`.
14. `game/src/presentation/effects/skill/SkillVfxTypes.ts` — `"selo-gelo"`, `"corte-veneno"`, `"golpe-fogo"`.
15. `cd game && node scripts/check-tk-selo.mjs && node scripts/check-tk-corte.mjs && node scripts/check-tk-golpe.mjs` (paleta **padrão** de cada controller intacta).
16. Validar visual das três skills elementais in-game.

## Testar

- [ ] Lâmina / Moon Ray: acerto até 8 m; sem alvo não gasta MP.
- [ ] Campo de Gelo: slow 0,55 por 3,5 s no raio 3,4 m.
- [ ] Mana Burn: dano mágico ×1,28; MP ×1,4 enquanto buff ativo.
- [ ] Círculo da Morte: dano 4,2 m centrado no jogador.
- [ ] Etapa 1: passos 7–10 verdes.
- [ ] Etapa 2: passo 15 verde; três elementais com arte dedicada.
