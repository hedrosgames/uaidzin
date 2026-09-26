# Skill TK — linhagem 3 (Magia) — implementação

## Comportamento

- Árvore `magia` (`TK_MAGIA` em `tk.ts`): 8 ativas (nenhuma passiva); todas podem ir na barra.
- Etapa 1 (mapa + textos + centro aoe) **já no código** — pular passos marcados.
- Etapa 2: paletas dedicadas gelo / veneno / fogo (uma skill por task, após etapa 1 validada).
- Mapa etapa 1: `lamina_energia`→`luz`, `mana_burn`→`aura`, `moon_ray`→`julgamento`, `death_stab`→`desafio`, `circulo_morte`→`tribunal`.
- Campo de Gelo, Poison Stab, Fire Slash: etapa 1 = genérico por elemento; etapa 2 = `selo-gelo`, `corte-veneno`, `golpe-fogo`.
- Aoe centrada no jogador: `tribunal` e `selo` usam `input.center` quando família `aoe`.
- Mana Burn: aura ~2,5 s no cast; buff 12 s (+28 % dano mágico, +40 % custo MP global).
- Nomes UI: `tk_mag_death_stab` → “Estocada do Veredito”; `tk_mag_circulo_morte` → “Círculo da Morte”.

| Pos | Skill | Id | VFX etapa 1 | VFX etapa 2 |
|---:|---|---|---|---|
| 1 | Lâmina de Energia | `tk_mag_lamina_energia` | luz | — |
| 2 | Campo de Gelo | `tk_mag_campo_gelo` | genérico gelo | selo paleta gelo |
| 3 | Mana Burn | `tk_mag_mana_burn` | aura | — |
| 4 | Moon Ray | `tk_mag_moon_ray` | julgamento | — |
| 5 | Poison Stab | `tk_mag_poison_stab` | genérico veneno | corte paleta veneno |
| 6 | Fire Slash | `tk_mag_fire_slash` | genérico fogo | golpe paleta fogo + `directionFor` |
| 7 | Estocada do Veredito | `tk_mag_death_stab` | desafio | — |
| 8 | Círculo da Morte | `tk_mag_circulo_morte` | tribunal (centro jogador) | — |

## Passos

### Etapa 1 — já no código (pular se presente)

1. `SkillVfxCatalog`: 5 entradas magia; sem `tk_mag_1..8`.
2. `EffectManager`: `areaCenter` para `selo`/`tribunal` em aoe; `aura` com `VFX_BALANCE.skillBuffAuraSeconds` (2,5 s).
3. `tk.ts`: 8× `desc`; nomes DM1/DM2.
4. `node scripts/check-tk-dispatch.mjs magia`.

### Etapa 2 — paletas (FM5)

5. Pré-requisito: lista de ciclo de vida única no `EffectManager` (plano linhagem 1 F7).
6. **Campo de Gelo:** `SeloVfxConfig.palette` (gelo); instância `tkSeloGelo`; `case "selo-gelo"`; mapa `tk_mag_campo_gelo`→`selo-gelo`; cast no `center` jogador.
7. **Poison Stab:** `CorteVfxConfig.palette` (veneno); `tkCorteVeneno`; `case "corte-veneno"`; mapa `tk_mag_poison_stab`.
8. **Fire Slash:** `GolpeVfxConfig.palette` (fogo) + `arcRadius` ~3,5; segunda instância `tkGolpeFogo`; `case "golpe-fogo"` com `directionFor`; mapa `tk_mag_fire_slash`.
9. `SkillVfxTypes`: `"selo-gelo"`, `"corte-veneno"`, `"golpe-fogo"`.

### QA e docs

10. `scripts/check-tk-magia.mjs`: Playwright fluxo completo (8 skills, Mana Burn ×1,4 MP, 8ª exclusiva).
11. Inventários: `skills.md`, `classes.md`, `vfx.md` — magia ofensiva vs aliases “sagrado”.

## Testar

- [ ] Lâmina/Moon Ray: alvo até 8 m.
- [ ] Campo de Gelo: slow 55 % por 3,5 s em todos no raio 3,4 m.
- [ ] Mana Burn: dano mágico ×1,28 e MP ×1,4 em outras skills enquanto buff ativo.
- [ ] Poison Stab: dot 35 % do dano/s por 4 s.
- [ ] Círculo da Morte: pilares ao redor do **jogador**; raio hit 4,2 m.
- [ ] Etapa 2: três elementais com cor dedicada; labs `check-tk-selo`, `check-tk-corte`, `check-tk-golpe` verdes com paleta padrão intacta.
- [ ] `node scripts/check-tk-dispatch.mjs magia` verde.
- [ ] `cd game && npm run typecheck && npm run vfx:runtime:qa && npm run smoke`.
