# Classes BM, FM e HT — implementação

Executar passos **1 → 36** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

FM fecha antes de HT. HT fecha antes de BM. Não abrir a classe seguinte com o QA da anterior vermelho.

## Pré-requisitos

- `Planos/Refatoracao 5.md` (skill sem nível), `6.md` (`tryLearnSkill`, DoT **3 s**), `8.md` (wire em `game/src/ui/wire/`, sem `GamePanels`) e `9.md` (`TkVfxRegistry`; não recriar campos `tk*` no `EffectManager`).
- `Planos/Skill TK linhagem 1.md` passos **1–30**, `linhagem 2.md` passos **1–15** e `linhagem 3.md` passos **1–16** já entregues. Este plano **não** refaz barra, teclado, compra, save nem VFX do TK.
- `game/src/data/balance/skill-purchase.ts` já soma **249** no nível 250. `SkillTreeService.canLearnEighthInTree` já bloqueia a 8ª se houver skill em outra árvore de combate.

## Comportamento

Personagem jogável, no mesmo critério do TK: criar na classe, comprar as 8 de uma árvore com a tabela única de pontos, ver `desc` em pt-BR, castar, buff/cura/dano/invocação/forma saírem no combate, VFX aparecer, 8ª exclusiva, reload sem perder skill nem barra. Números de dano, cura, buff e invocação **já estão** nas fichas. O `desc` repete esses campos. Não inventar número novo. O que a ficha não tem fica em Pendências.

### Onde cada código mora

| Assunto | Arquivo | Não colocar aqui |
|---|---|---|
| Ficha FM / BM / HT | `game/src/data/classes/skills/fm.ts`, `bm.ts`, `ht.ts` | wire, `EffectManager`, sessão |
| Árvore e rótulo | `game/src/data/classes/class-definitions.ts` | não copiar `BOOK_SKILLS` por classe |
| Custo de compra | `game/src/data/balance/skill-purchase.ts` | não criar tabela por classe |
| Ouro do treino | `game/src/data/balance/economy.ts` → `SKILL_TRAINING.goldCost` | |
| Cast, evasão, resist | `game/src/domain/combat/SkillCasting.ts` | sem `if (classId === …)` |
| Barra | `game/src/domain/combat/SkillLoadout.ts` | |
| Invocação | `game/src/domain/combat/SummonRuntime.ts` + `game/src/presentation/combat/SummonView.ts` | sem mesh de classe no wire |
| Forma | `game/src/domain/combat/FormState.ts`; escala já em `game/src/app/CityGameSession.ts` | |
| Mapa id → VFX | `game/src/presentation/effects/skill/SkillVfxCatalog.ts` | não editar chaves TK que o `check-tk-dispatch` exige |
| Controller novo | `game/src/presentation/effects/fmSkills/<pasta>/`, `bmSkills/<pasta>/`, `htSkills/<pasta>/` | não pasta `tkSkills/` |
| Case no despacho | `game/src/presentation/effects/EffectManager.ts` — um `case` por id dedicado | sem campo `fm*`, `bm*` ou `ht*` na classe |
| Registry TK | `game/src/presentation/effects/TkVfxRegistry.ts` | não registrar skill de outra classe |
| UI | `game/src/ui/wire/skillmaster.ts` e `skills.ts` leem `WireApi` | sem lista mock de skill |
| Arma visual | `game/src/presentation/player/weapon-set-catalog.json` | não mudar `classDefault` neste plano |
| QA | `game/scripts/check-fm-*.mjs`, `check-ht-*.mjs`, `check-bm-*.mjs` | não alterar assert dos `check-tk-*` |

### Restrições (regressão)

- Não mudar id, `name` ou número de skill em `tk.ts`.
- Não mudar `SKILL_PURCHASE_COST_BY_INDEX`, `SKILL_BALANCE.barSize`, `SKILL_BALANCE.pointsPerLevel`, `SAVE_VERSION` nem `ACCOUNT_SAVE_VERSION`.
- Não reintroduzir nível de skill, “Melhorar”, `levelScale` ou `upCost`.
- Não criar `persistSave`. Gravação só `markDirty("skills" \| "skillLoadout", "deferred")`.
- Não filtrar catálogo de skill por classe no wire. A classe vem do save.
- `desc` obrigatório nas 24 skills de cada classe (8 × 3). Passiva diz que não entra na barra. Índice 7 diz que só uma 8ª por personagem.
- Id em `FM_DEDICATED_VFX_BY_SKILL_ID` (ou o mapa BM/HT) só entra se existir `case` no `EffectManager`. Mapa sem `case` é buraco: o cast não desenha.
- Paleta nova de controller TK existente fica no registry TK, como `selo-gelo`. Não duplicar o controller.
- Capsule de invocação em `SummonView` permanece até existir GLB (Pendências). Não trocar por modelo inexistente.
- `classDefault`: TK `axe-shield`, FM `greatstaff`, BM `dual-gloves`, HT `dual-sword`. Passiva `weaponAny` continua exigindo o set da ficha (`bow`, `greatsword`, `greatstaff`, dual). Sem arma compatível a passiva não soma.
- Livros continuam `BOOK_SKILLS` compartilhado. Efeito real dos livros não é deste plano.
- Debug de cast só com `import.meta.env.DEV`.

### O que já está no código

- 8 skills por árvore em `fm.ts`, `bm.ts`, `ht.ts`. Ids abaixo são o contrato.
- FM magia: controllers em disco só para `esfera-ignea`, `lanca-glacial`, `choque-vital`. O mapa também cita `picada-peconhenta`, `tempestade-brasa`, `sombra-corrosiva`, `nevasca`, `colapso-elemental` **sem** pasta e **sem** `case`.
- BM: `transform` (Lobo, Ursão, Titã) e `summon` / `pack` já passam por `SkillController` e `SummonRuntime`. Visual da forma = escala do player. Visual da invocação = cápsula por `role`.
- HT: `familyFor` já devolve `arrow` se o nome tem “flecha” ou “tiro”. Não há pasta `htSkills/`.
- Compra, 8ª exclusiva, barra 10 e reload já são da classe que está no save.

| Classe | Índice 7 (8ª) |
|---|---|
| FM | `fm_fis_negacao_vida` · `fm_ctrl_graca_ceu` · `fm_mag_colapso` |
| HT | `ht_fis_rapid_hit` · `ht_ctrl_invisibilidade` · `ht_mag_tempestade` |
| BM | `bm_fis_tita` · `bm_mag_furia_quatro` · `bm_ctrl_exercito` |

## Passos

### A — Trava do TK e da economia

1. `game/src/data/balance/skill-purchase.test.ts` — manter a soma **249** e o custo **1** no índice 0. Não editar `skill-purchase.ts`.
2. `game/src/domain/skills/skill-tree.test.ts` — manter a 8ª bloqueada com skill em outra árvore. Não editar a regra em `SkillTreeService.ts`.
3. `game/scripts/check-tk-dispatch.mjs` — não mudar a lista de ids TK. Os scripts novos deste plano são arquivos à parte.

### B — Texto das fichas

4. `game/src/data/classes/skills/fm.ts` — `desc` pt-BR nas 24 skills. Números só se o campo já existe na mesma skill (`damageMultiplier`, `buff`, `healRatio`, `enemy`, `passive`).
5. `game/src/data/classes/skills/ht.ts` — o mesmo para as 24.
6. `game/src/data/classes/skills/bm.ts` — o mesmo para as 24, incluindo transform (`sec`, `attack`, `defense`, `hp`, `scale`) e summon (`SummonSpec` já no arquivo).
7. `game/src/ui/WireGameBridge.ts` — conferir `desc: sk.desc` para qualquer `classId`. Sem ramo TK.

### C — FM magia (controllers que o mapa já promete)

8. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — tirar de `FM_DEDICATED_VFX_BY_SKILL_ID` os cinco ids sem `case`: `fm_mag_picada`, `fm_mag_tempestade_brasa`, `fm_mag_sombra_corrosiva`, `fm_mag_nevasca`, `fm_mag_colapso`. Enquanto isso o genérico da família cobre o cast.
9. `game/src/presentation/effects/fmSkills/picada-peconhenta/` — controller no padrão de `esfera-ignea` (update, clear, dispose, cast).
10. `game/src/presentation/effects/fmSkills/tempestade-brasa/` — idem.
11. `game/src/presentation/effects/fmSkills/sombra-corrosiva/` — idem.
12. `game/src/presentation/effects/fmSkills/nevasca/` — idem.
13. `game/src/presentation/effects/fmSkills/colapso-elemental/` — idem. Centro no jogador se `family === "aoe"`, igual `tribunal`.
14. `game/src/presentation/effects/EffectManager.ts` — um `case` para cada pasta dos passos **9–13**, no mesmo ciclo `update` / `clear` / `dispose` das três FM que já existem. Sem campo novo na classe.
15. `game/src/presentation/effects/skill/SkillVfxTypes.ts` — incluir os cinco ids dedicados se o tipo `DedicatedSkillVfx` ainda não os tem.
16. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — recolocar os cinco ids no mapa FM, cada um apontando para o `case` do passo **14**.

### D — FM física e controle

17. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — tabela FM física e controle: buff e cura reusam controller já registrado (`furia`, `postura`, `bencao`, `guarda`, `muralha`) com a cor do elemento da ficha; dano usa a família (`projectile`, `melee`, `line`, `aoe`) até existir pasta própria. Não criar pasta vazia.
18. `game/src/presentation/effects/EffectManager.ts` — se o reuse do passo **17** precisar de paleta, registrar paleta no controller **já existente** (padrão `descuidado` / `selo-gelo`). Não copiar a pasta TK.

### E — QA FM

19. `game/scripts/check-fm-dispatch.mjs` (novo) — as 24 ids; `desc` não vazio; dedicadas dos passos **14** e **16** chamam o controller; as demais não lançam. Não importa lista TK.
20. `game/scripts/check-fm-play.mjs` (novo, molde `game/scripts/check-tk-fisica.mjs`) — criar FM, comprar as 8 de `magia` uma vez, barra, cast, 8ª `fm_mag_colapso` bloqueia física e controle, reload. Sem “Nível x / 10” e sem “Melhorar”.
21. `game/package.json` — scripts `fm:dispatch:qa` e `fm:play:qa` apontando para os dois arquivos. Não remover script `tk:*`.

### F — HT

22. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — `HT_DEDICATED_VFX_BY_SKILL_ID` vazio neste passo. `dedicatedVfxFor` continua caindo no genérico, com `arrow` para nome “flecha” ou “tiro”.
23. `game/src/presentation/effects/htSkills/flecha/` — um controller de projétil. As oito de magia e as de física cujo nome dispara `arrow` usam este id.
24. `game/src/presentation/effects/EffectManager.ts` — `case "flecha"`. Sem campo `htFlecha`.
25. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — preencher `HT_DEDICATED_VFX_BY_SKILL_ID` só com ids cujo `familyFor` é `arrow`, valor `"flecha"`.
26. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — buff, passiva e as que não são flecha ficam na família genérica (mesmo critério do passo **17**).
27. `game/scripts/check-ht-dispatch.mjs` e `game/scripts/check-ht-play.mjs` — 24 `desc`; compra da física; 8ª `ht_fis_rapid_hit` exclusiva; reload.
28. `game/package.json` — `ht:dispatch:qa` e `ht:play:qa`.

### G — BM

29. `game/src/domain/combat/SummonRuntime.ts` — conferir `spawn` de um `summon` e de `pack` (três atores em `bm_ctrl_exercito`). Se o pack já soma, não duplicar regra.
30. `game/src/presentation/combat/SummonView.ts` — cápsula por `role` permanece. Cor só da tabela `ROLE_COLOR` já existente.
31. `game/src/app/CityGameSession.ts` — conferir escala `form.scale` só com forma ativa; ao expirar volta a **1**. Não aplicar escala de forma em FM, HT ou TK.
32. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — `BM_DEDICATED_VFX_BY_SKILL_ID`: `transform` → família `transform`; `summon` → `summon`. Sem pasta nova se o diretor genérico já desenha o cast.
33. `game/src/presentation/effects/EffectManager.ts` — se o cast de transform/summon não dispara efeito nenhum, um `case` genérico único `"forma"` e um `"invocar"` em `bmSkills/forma/` e `bmSkills/invocar/`. Não um controller por animal.
34. `game/scripts/check-bm-dispatch.mjs` e `game/scripts/check-bm-play.mjs` — 24 `desc`; comprar controle até `bm_ctrl_exercito`; invocações vivas; forma Lobo altera a escala e volta; 8ª exclusiva; reload.
35. `game/package.json` — `bm:dispatch:qa` e `bm:play:qa`.

### H — Fechamento

36. `cd game && npm run typecheck && npm run smoke && npm test && node scripts/check-tk-dispatch.mjs fisica && node scripts/check-fm-dispatch.mjs && node scripts/check-ht-dispatch.mjs && node scripts/check-bm-dispatch.mjs` — TK verde junto com as três classes.

## Testar

- [ ] TK: `cd game && node scripts/check-tk-dispatch.mjs fisica` e `npm test` iguais aos de antes deste plano.
- [ ] Compra: índice 0 custa 1; as oito de uma árvore somam 249; tabela não foi copiada por classe.
- [ ] FM: 24 `desc`; as três magias que já tinham controller continuam; as cinco novas têm `case`; comprar `fm_mag_colapso` bloqueia as outras 8ª; reload.
- [ ] HT: flecha usa `case "flecha"`; passiva `twoHand` não soma com `dual-sword`; 8ª `ht_fis_rapid_hit` exclusiva.
- [ ] BM: Lobo escala e expira em 1; Condor e Exército aparecem como cápsula; 8ª `bm_ctrl_exercito` exclusiva.
- [ ] Wire sem “Nível x / 10” e sem “Melhorar” nas três classes.
- [ ] `classDefault` do `weapon-set-catalog.json` inalterado.
- [ ] `cd game && npm run typecheck && npm run smoke`.

## Pendências

- Rebalanceamento de dano, cura e buff. Fonte atual: as próprias fichas. Não somar bônus de nível antigo.
- GLB de luva do BM e troca do default da HT para `bow`. Hoje BM = `dual-gloves`, HT = `dual-sword` (`weapon-set-catalog.json`).
- Modelo das invocações no lugar da cápsula.
- Efeito real de `book_hp`, `book_gold`, `book_xp`, `book_cd` (hoje `bookStub`).
- Controller dedicado por skill de FM física/controle, HT corpo-a-corpo e BM animal, no padrão Fire Burst, depois do genérico deste plano estar verde.
