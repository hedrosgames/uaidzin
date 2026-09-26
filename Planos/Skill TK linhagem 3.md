# Skill TK — linhagem 3 (Magia) — implementação

## Comportamento

- Árvore `magia` (`TK_MAGIA` em `tk.ts`): 8 ativas; todas podem ir na barra (10 slots).
- Etapa 1: cinco VFX dedicados + três elementais no genérico por cor (`SkillVfxDirector`).
- Etapa 2 (depois da 1 validada): paletas `selo-gelo`, `corte-veneno`, `golpe-fogo` (uma skill por task).
- Aoe no jogador: `tribunal` e `selo` usam `input.center` quando `profile.family === "aoe"`.
- Mana Burn: aura visual ~2,5 s; buff 12 s — `magicPower +28 %`, `mpCostMul 1,4` em todas as skills.
- Nomes UI: `tk_mag_death_stab` → “Estocada do Veredito”; `tk_mag_circulo_morte` → “Círculo da Morte”.

| Pos | Skill | Id | VFX etapa 1 | VFX etapa 2 |
|---:|---|---|---|---|
| 1 | Lâmina de Energia | `tk_mag_lamina_energia` | luz | — |
| 2 | Campo de Gelo | `tk_mag_campo_gelo` | genérico gelo | selo-gelo |
| 3 | Mana Burn | `tk_mag_mana_burn` | aura | — |
| 4 | Moon Ray | `tk_mag_moon_ray` | julgamento | — |
| 5 | Poison Stab | `tk_mag_poison_stab` | genérico veneno | corte-veneno |
| 6 | Fire Slash | `tk_mag_fire_slash` | genérico fogo | golpe-fogo |
| 7 | Estocada do Veredito | `tk_mag_death_stab` | desafio | — |
| 8 | Círculo da Morte | `tk_mag_circulo_morte` | tribunal | — |

## Passos

### A — Despacho (centro e duração)

1. `EffectManager.dispatchSkillVfx`: helper `areaCenter` — para `case "tribunal"` e `case "selo"`, se família `aoe`, usar `input.center` (jogador), não o inimigo mais próximo.
2. `case "aura"`: duração curta provisória **2,5 s** (`VFX_BALANCE.skillBuffAuraSeconds`).

### B — Mapa VFX etapa 1

3. `SkillVfxCatalog.ts`: `tk_mag_lamina_energia`→`luz`, `tk_mag_mana_burn`→`aura`, `tk_mag_moon_ray`→`julgamento`, `tk_mag_death_stab`→`desafio`, `tk_mag_circulo_morte`→`tribunal`; remover `tk_mag_1` … `tk_mag_8`.
4. Campo de Gelo, Poison Stab, Fire Slash **fora** do mapa (genérico elementar).

### C — Fichas e UI

5. `skill-types.ts` + `defineSkill`: campo `desc` (se ainda ausente).
6. `tk.ts`: `name` “Estocada do Veredito” e “Círculo da Morte”; `desc` pt-BR nas 8 (textos abaixo).
7. Regenerar `game/vfx/skills-manifest.json` / catálogo lab se o pipeline do repo exigir após mudar `tk.ts`.

**Textos `desc`:**

- Lâmina de Energia: “Fio de alvorada: um feixe de luz corta um inimigo a até 8 m. Dano mágico. Nível aumenta o dano.”
- Campo de Gelo: “Geada radial: dano de gelo num raio de 3,4 m e os atingidos andam a 55 % da velocidade por 3,5 s. Nível aumenta o dano.”
- Mana Burn: “Mana em combustão: dano mágico +28 % por 12 s, mas toda skill custa 40 % mais mana enquanto durar.”
- Moon Ray: “Fenda lunar: um raio vertical cai sobre um inimigo a até 8 m. Dano mágico alto. Nível aumenta o dano.”
- Poison Stab: “Agulha verde: estocada curta que envenena o alvo por 4 s (35 % do dano do golpe por segundo). Nível aumenta o dano e o veneno.”
- Fire Slash: “Varredura de brasa: corte largo de fogo que atinge todos num raio de 3,5 m. Nível aumenta o dano.”
- Estocada do Veredito: “Lança do veredito: estocada sagrada que ignora 20 % da defesa. Dano mágico muito alto em um alvo. Nível aumenta o dano.”
- Círculo da Morte: “Tribunal de lâminas: pilares de luz caem ao redor de você num raio de 4,2 m. Só uma 8ª skill por personagem: comprar esta bloqueia Fire Burst e Divine Armor.”

### D — QA etapa 1

8. `game/scripts/check-tk-dispatch.mjs` com argumento `magia`: 5 dedicadas + 3 genéricas elementares; `desc` presente.
9. `game/scripts/check-tk-magia.mjs`: Playwright — 8 skills, Mana Burn × MP, 8ª exclusiva, reload.

### E — Paletas etapa 2

10. Pré-requisito: lista única de ciclo de vida dos controllers TK no `EffectManager` (plano linhagem 1, passo F7).
11. Campo de Gelo: `SeloVfxConfig.palette` gelo; instância `tkSeloGelo`; `DedicatedSkillVfx` + `case "selo-gelo"`; mapa `tk_mag_campo_gelo`.
12. Poison Stab: `CorteVfxConfig.palette` veneno; `tkCorteVeneno`; `case "corte-veneno"`; mapa `tk_mag_poison_stab`.
13. Fire Slash: `GolpeVfxConfig.palette` fogo, `arcRadius` ~3,5; `tkGolpeFogo`; `case "golpe-fogo"` com `directionFor` (plano linhagem 2, passo A); mapa `tk_mag_fire_slash`.

### F — Docs (ao fechar)

14. Inventários: magia ofensiva; nota de que pastas “sagrado” no lab são aliases históricos.

## Testar

- [ ] Lâmina / Moon Ray: hit até 8 m; sem alvo não gasta MP.
- [ ] Campo de Gelo: dano em 3,4 m; `slowFactor` 0,55 por 3,5 s.
- [ ] Mana Burn: dano mágico ×1,28; MP das skills ×1,4 enquanto buff ativo.
- [ ] Poison Stab: dot 4 s; Círculo da Morte: dano em 4,2 m centrado no jogador.
- [ ] Etapa 1: `node scripts/check-tk-dispatch.mjs magia` verde.
- [ ] Etapa 2: `check-tk-selo`, `check-tk-corte`, `check-tk-golpe` verdes (paleta padrão intacta).
- [ ] `cd game && npm run typecheck && npm run vfx:runtime:qa && npm run smoke`.
