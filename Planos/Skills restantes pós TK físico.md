# Skills restantes pós TK físico — implementação

Executar passos **1 → 45** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- Depois de `Planos/Refatoracao 5.md` (skill sem nível), `6.md` (efeitos/status no combate), `8.md` (wire em `game/src/ui/wire/`) e `9.md` (`TkVfxRegistry`).
- `Planos/Skill TK linhagem 1.md` passos **1–30**, `Planos/Skill TK linhagem 2.md` passos **1–15** e `Planos/Skill TK linhagem 3.md` passos **1–16** são referência funcional. O estado atual do código vence os textos antigos quando houver divergência.
- Este plano substitui `Planos/Classes BM FM HT.md` como roteiro de execução das skills restantes, porque incorpora as regressões e o padrão de validação encontrados depois do trabalho recente no TK físico.
- `game/src/domain/combat/tk-physical-skills.test.ts`, `game/scripts/check-tk-fisica.mjs`, `game/scripts/check-tk-dispatch.mjs` e `game/scripts/check-skill-vfx.mjs` são o padrão de aceite: testar comportamento real, MP/CD, auto/manual, passivas, status, VFX e persistência.
- TK Física já validada permanece como regressão obrigatória. Não alterar ids, valores ou comportamento dessa árvore para fazer as demais passarem.
- Não editar `PlayerView.fitStandingHeight`, `TARGET_HEIGHT`, `model.scale` nem o encaixe de escala de inimigos. Forma do BM usa somente `FormState` e o caminho de escala já existente na sessão.
- As 4 skills de Livros (`book_hp`, `book_gold`, `book_xp`, `book_cd`) ficam fora da execução deste plano porque continuam com `bookStub` e magnitude `0`; os efeitos e valores canônicos estão sem definição no inventário atual. Fechar a pendência de Livros antes de criar comportamento real para elas.

## Comportamento

O catálogo atual tem **100 perfis**: 96 skills de classe e 4 Livros. Este plano fecha as **88 skills de classe ainda sem o mesmo nível de validação da TK Física**: 16 do TK, 24 FM, 24 HT e 24 BM.

| Escopo | Estado auditado | Alvo |
|---|---|---|
| TK Física | 8/8 com `desc`; teste de domínio; Playwright; VFX | manter verde |
| TK Controle | 0/8 com `desc`; mapa VFX usa ids antigos `tk_ctrl_1…8` | 8/8 descritas, mecânica testada e ids canônicos ligados aos VFX existentes |
| TK Magia | 0/8 com `desc`; mapa VFX usa ids antigos `tk_mag_1…8` | 8/8 descritas, mecânica testada e VFX canônico por skill |
| FM | 0/24 com `desc`; 8 VFX dedicados declarados, só 3 controllers/cases existem | 24/24 descritas e testadas; 8/8 VFX declarados realmente despachados |
| HT | 0/24 com `desc`; VFX genérico por família | 24/24 descritas e testadas; família `arrow`/melee/aoe/buff/passive comprovada no runtime |
| BM | 0/24 com `desc`; transform/summon já passam pelo motor genérico | 24/24 descritas e testadas; forma, summon, pack e passivas comprovados no runtime |
| Livros | 4 `bookStub`, magnitude 0 | bloqueado por definição de efeito/valor |

Regras de aceite para qualquer skill ativa:

- Cast manual funciona com `auto` desligado; auto-cast só funciona quando o slot está com `auto: true`.
- MP só é gasto quando o cast resolve; cooldown só começa após cast válido; MP insuficiente não inicia cooldown.
- `shape`, `range`, `radius`, `maxTargets`, `hits`, `pierce`, `power` e resistência elemental seguem a ficha em `game/src/data/classes/skills/*.ts`.
- Buff, cura, cleanse, lifesteal, execute, slow, stun, DoT, anti-heal, taunt e knock precisam de teste no consumidor real, não apenas teste de presença do campo.
- Passiva não entra na barra. Restrição `weaponAny`, crítico, evasão, redução de dano, bônus isolado, crítico transformado e vínculo de summon precisam alterar o cálculo correspondente.
- 8ª skill continua exclusiva entre `fisica`, `controle` e `magia`; custo e ordem de compra são compartilhados e não ganham tabela por classe.
- Toda skill ativa produz VFX dedicado ou genérico. `dedicatedVfx` só pode existir no catálogo se houver despacho real para aquele id.
- VFX não pode gerar `NaN`, infinito, objeto abaixo do chão ou resíduos após `clear`/`dispose`.
- `desc` é pt-BR e descreve apenas valores que existem na própria ficha. Passiva informa que não entra na barra; 8ª informa a exclusividade. Não inventar balance.
- Save/reload preserva skills aprendidas, `eighthTree`, slots vazios, índice do slot e flag `auto`.

### Contratos especiais que os testes precisam cobrir

| Classe/árvore | Casos obrigatórios |
|---|---|
| TK Controle | defesa, `maxHp` + cura, taunt, resistência mágica, evasão, cura, stun, `damageReduction` |
| TK Magia | slow, `magicPower` + custo de MP, DoT, pierce, AoE e resistência elemental |
| FM Física | buffs, `mpToHp`, passiva de arco, crítico, anti-heal |
| FM Controle | cura, cleanse, buffs duplos, execute, dano + cura |
| FM Magia | slow, DoT, pierce e AoE elementais |
| HT Física | buffs, slow físico, pierce, `isolated`, `hits: 7` |
| HT Controle | DoT corpo a corpo, evasão, buffs duplos, lifesteal, `twoHand`, stealth + próximo hit |
| HT Magia | dano mágico, slow, stun probabilístico, pierce e AoE |
| BM Física | 3 formas, knock, buffs, `transformedCrit`, expiração e restauração da forma |
| BM Magia | slow, stun probabilístico, buffs e AoE elementais |
| BM Controle | summon individual, refresh do mesmo summon, limite do runtime, `summonLink` e pack de `bm_ctrl_exercito` |

## Passos

### A — Travas globais e contrato das 96 skills de classe

1. `game/src/data/classes/skill-contract.test.ts` — criar teste table-driven para exigir 24 skills por classe, 8 por árvore, ids únicos, índices 0–7 e `desc` preenchida nas 96 skills de classe.
2. `game/src/domain/skills/skill-tree.test.ts` — ampliar para as quatro classes e três árvores, cobrindo compra sequencial, custo compartilhado, soma **249**, skill já aprendida e exclusividade da 8ª sem regra específica por classe.
3. `game/src/domain/combat/skill-runtime-test-fixture.ts` — extrair o setup reutilizável do teste físico do TK para montar classe, árvore, personagem, buffs, forma, summons, loadout, alvo e cast manual/auto sem duplicar regra de produção nos novos testes.
4. `game/scripts/check-skill-vfx-contract.mjs` — criar QA que rejeita chave de mapa para skill inexistente e `dedicatedVfx` sem caminho real de despacho/controller; deve detectar os ids legados do TK e os cinco dedicados FM ainda sem case no estado atual.
5. `game/scripts/check-skill-vfx.mjs` — ampliar a varredura de representantes para todas as skills ativas, exigindo VFX observável, estado finito, `y >= -0.001`, `clear` sem resíduos e catálogo final com 100 ids únicos.

### B — TK Controle e Magia

6. `game/src/data/classes/skills/tk.ts` — preencher `desc` das 8 `TK_CONTROLE` a partir dos campos atuais, incluindo duração/magnitude de buff, cura, taunt, stun e passiva de redução de dano.
7. `game/src/data/classes/skills/tk.ts` — preencher `desc` das 8 `TK_MAGIA` a partir dos campos atuais, incluindo slow, custo aumentado de Mana Burn, DoT, pierce e raios; corrigir acentuação visível inequívoca sem alterar ids.
8. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — trocar `tk_ctrl_1…8` pelos oito ids canônicos `tk_ctrl_*`, preservando o mapeamento Muralha/Postura/Provocação/Escudo Sagrado/Guarda/Bênção/Rugido/Bastião.
9. `game/src/presentation/effects/tkSkills/selo/SeloVfx.ts` — aceitar paleta opcional e criar a variação de gelo usada por `tk_mag_campo_gelo`, mantendo a paleta atual como padrão.
10. `game/src/presentation/effects/tkSkills/corte/CorteVfx.ts` — aceitar paleta opcional e criar a variação de veneno usada por `tk_mag_poison_stab`, mantendo a paleta atual como padrão.
11. `game/src/presentation/effects/tkSkills/golpe/GolpeVfx.ts` — aceitar paleta opcional e criar a variação de fogo usada por `tk_mag_fire_slash`, mantendo a paleta atual como padrão.
12. `game/src/presentation/effects/TkVfxRegistry.ts` — registrar `selo-gelo`, `corte-veneno` e `golpe-fogo` como instâncias do controller existente com paleta própria, sem criar campos `tk*` no `EffectManager`.
13. `game/src/presentation/effects/skill/SkillVfxTypes.ts` — incluir os três ids de variação TK no tipo `DedicatedSkillVfx`.
14. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — trocar `tk_mag_1…8` pelos ids canônicos: Lâmina→`luz`, Campo de Gelo→`selo-gelo`, Mana Burn→`aura`, Moon Ray→`julgamento`, Poison Stab→`corte-veneno`, Fire Slash→`golpe-fogo`, Death Stab→`desafio`, Círculo da Morte→`tribunal`.
15. `game/src/presentation/effects/EffectManager.ts` — despachar as três novas variações pelo `TkVfxRegistry` e manter centro/alvo coerente com `shape` sem duplicar controller.
16. `game/src/domain/combat/tk-control-magic-skills.test.ts` — testar as 16 skills restantes do TK no padrão de `tk-physical-skills.test.ts`, incluindo MP/CD/auto/manual e todos os casos especiais da tabela de contratos.
17. `game/scripts/check-tk-dispatch.mjs` — aceitar `fisica`, `controle` e `magia`, validar 8 defs por árvore, `desc`, cinco direções, VFX finito/acima do chão e despacho dedicado dos ids canônicos.

### C — Frost Maiden

18. `game/src/data/classes/skills/fm.ts` — preencher `desc` pt-BR nas 24 skills usando somente os campos atuais; marcar `fm_fis_mestre_arco` como passiva fora da barra e as três posições 7 como 8ª exclusiva.
19. `game/src/domain/combat/fm-skills.test.ts` — testar as 24 skills FM: MP/CD/auto/manual, buffs e `mpToHp`, arco, crítico, anti-heal, cura/cleanse, buffs duplos, execute, dano + cura, slow, DoT, pierce e AoE.
20. `game/src/presentation/effects/fmSkills/picada-peconhenta/PicadaPeconhentaVfx.ts` — implementar controller dedicado completo com `cast`, `update`, `clear`, `dispose`, contadores e origem/alvo válidos.
21. `game/src/presentation/effects/fmSkills/tempestade-brasa/TempestadeBrasaVfx.ts` — implementar controller dedicado de AoE centrado conforme o perfil da skill, com ciclo de vida completo.
22. `game/src/presentation/effects/fmSkills/sombra-corrosiva/SombraCorrosivaVfx.ts` — implementar controller dedicado de projétil/impacto com ciclo de vida completo.
23. `game/src/presentation/effects/fmSkills/nevasca/NevascaVfx.ts` — implementar controller dedicado de AoE de gelo com ciclo de vida completo.
24. `game/src/presentation/effects/fmSkills/colapso-elemental/ColapsoElementalVfx.ts` — implementar controller dedicado de AoE misto com ciclo de vida completo e centro coerente com a skill.
25. `game/src/presentation/effects/FmVfxRegistry.ts` — criar registry para os 8 controllers FM, incorporando Esfera Ígnea, Lança Glacial e Choque Vital já existentes e os cinco novos, com ciclo de vida e contadores agregados.
26. `game/src/presentation/effects/EffectManager.ts` — trocar os três campos FM isolados pelo `FmVfxRegistry`, despachar os oito ids declarados e agregar `update`, `clear`, `dispose`, active e particles pelo registry.
27. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — manter no mapa FM apenas os oito ids cujo controller está registrado e garantir que cada entrada usa o id canônico da ficha.

### D — Huntress

28. `game/src/data/classes/skills/ht.ts` — preencher `desc` pt-BR nas 24 skills usando os valores atuais; passivas informam restrição de barra/arma e as três posições 7 informam exclusividade.
29. `game/src/domain/combat/ht-skills.test.ts` — testar as 24 skills HT: MP/CD/auto/manual, buffs, slow físico, pierce, bônus isolado, sete hits independentes, DoT, evasão, lifesteal, duas mãos, stealth/next hit, dano mágico, stun probabilístico e AoEs.
30. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — manter HT sem `dedicatedVfx` enquanto não houver controller dedicado; garantir `arrow` para flecha/tiro, melee para alcance curto e famílias genéricas corretas para AoE/buff/passiva.
31. `game/scripts/check-skill-vfx-contract.mjs` — incluir assert específico de HT para todas as skills ativas produzirem família válida e nenhuma entrada declarar arte dedicada inexistente.

### E — Beast Master

32. `game/src/data/classes/skills/bm.ts` — preencher `desc` pt-BR nas 24 skills, incluindo duração e multiplicadores das formas, knock, status elementais, buffs, specs das invocações, `summonLink` e pack do Exército Primordial.
33. `game/src/domain/combat/bm-skills.test.ts` — testar as 24 skills BM: MP/CD/auto/manual, três formas, buffs, knock, crítico transformado, magia elemental, summons individuais, refresh, vínculo e pack.
34. `game/src/domain/combat/form-state.test.ts` — testar aplicação, renovação, expiração e restauração de attack/defense/hp/scale/attackSpeed para Lobo, Ursão e Titã sem tocar na calibração de escala do `PlayerView`.
35. `game/src/domain/combat/summon-runtime.test.ts` — testar spawn, refresh por `kind`, limite de cinco atores, movimento/ataque, splash, dano recebido e divisão por `summonLink`.
36. `game/src/app/CityGameSession.ts` — manter a escala visual da forma limitada ao estado `form.active` já existente e garantir restauração em 1 após expiração; nenhuma recalibração de altura/modelo entra nesta task.
37. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — manter BM nas famílias genéricas `transform`, `summon`, `buff`, `projectile`, `aoe` e `passive`, sem declarar `dedicatedVfx` inexistente.
38. `game/scripts/check-skill-vfx-contract.mjs` — incluir asserts de BM para forma/summon/pack terem família correta e efeito visual genérico observável.

### F — Runtime completo, Wire e persistência

39. `game/scripts/check-class-skills.mjs` — criar Playwright parametrizado por `classId` e árvore: criar personagem, conceder pontos/ouro, comprar as 8, conferir textos/passivas/barra, 8ª exclusiva, castar representantes e salvar/recarregar preservando `eighthTree`, índices, vazios e `auto`.
40. `game/scripts/check-class-skills.mjs` — incluir cenários especiais de integração: FM cleanse/execute, HT stealth + hit/lifesteal e BM forma + summon + Exército, usando APIs reais da sessão sem duplicar fórmulas do domínio.
41. `game/src/ui/wire-api.test.ts` — ampliar o contrato do bridge para TK/FM/HT/BM, exigindo catálogo derivado de `CLASSES[save.classId]`, `desc` canônica, 10 slots e nenhuma regra específica de classe.
42. `game/src/ui/wire/skills.ts` — manter compra única, passivas fora do drag para barra, MP/CD ocultos em passiva e textos sem nível/Melhorar; corrigir somente gaps revelados pelo Playwright multi-classe.
43. `game/package.json` — adicionar scripts para QA das três árvores TK, contrato VFX e Playwright multi-classe, preservando `tk:dispatch:qa` existente.

### G — Inventário e fechamento

44. `nongame/docs/inventarios/skills.md` — atualizar a auditoria após a implementação: ids canônicos atuais, 24 skills por classe, barra 10, status real de VFX, `desc` e remover gaps de placeholder que já não existem; manter Livros como `bookStub` enquanto a pendência não for decidida.
45. `game/` — fechar com `npm run typecheck`, `npm test`, `npm run smoke`, QA de catálogo/VFX, `check-tk-dispatch` nas 3 árvores e `check-class-skills.mjs` nas 11 árvores restantes; nenhum erro de console, NaN, VFX abaixo do chão ou regressão da TK Física.

## Testar

- [ ] Contrato: 96 skills de classe = 4 × 24; 8 por árvore; ids únicos; 96 `desc` não vazias.
- [ ] Catálogo VFX: 100 perfis únicos contando os 4 Livros; nenhum `dedicatedVfx` órfão; toda ativa gera efeito e limpa sem resíduos.
- [ ] TK Física: `tk-physical-skills.test.ts`, `check-tk-dispatch fisica` e `check-tk-fisica.mjs` continuam verdes.
- [ ] TK Controle: 8/8 compráveis em sequência; buffs, cura, taunt, stun e `damageReduction` alteram o runtime; VFX usa ids canônicos.
- [ ] TK Magia: 8/8; slow/DoT/pierce/AoE e Mana Burn comprovados; três variantes elementais registradas sem duplicar controller.
- [ ] FM: 24/24; `mpToHp`, arco, crítico, anti-heal, cleanse, execute e dano+cura comprovados; 8 VFX dedicados com case/registry real.
- [ ] HT: 24/24; `hits: 7`, isolated, lifesteal, twoHand, stealth e stun probabilístico comprovados; genérico `arrow`/melee/AoE produz VFX.
- [ ] BM: 24/24; formas expiram e restauram estado; summons renovam/atacam; vínculo divide dano; Exército cria o pack sem ultrapassar contrato do runtime.
- [ ] Auto: slot com `auto: false` nunca é escolhido automaticamente em nenhuma classe; cast manual continua funcionando.
- [ ] Compra: primeira skill custa 1 ponto; oito da árvore somam 249; 8ª bloqueia as outras duas árvores; nenhuma tabela por classe.
- [ ] Barra/save: 10 slots, passivas fora, slot vazio/índice/auto sobrevivem ao reload em TK, FM, HT e BM.
- [ ] Wire: sem “Nível x / 10”, “Melhorar” ou dados mock; `desc` pt-BR aparece para qualquer classe do save.
- [ ] `cd game && npm run typecheck && npm test && npm run smoke` verde.

## Pendências

- Livros: definir efeitos e magnitudes canônicas para `book_hp`, `book_gold`, `book_xp` e `book_cd`. Hoje são `bookStub` com magnitude `0`; implementar sem essa decisão inventaria balance.
- Rebalanceamento de dano, cura, buff, summon e forma fica fora deste plano. Os testes usam os valores atuais de `game/src/data/classes/skills/*.ts` como contrato.
- Arte dedicada individual para HT e BM fica fora do critério funcional. O contrato deste plano exige VFX genérico válido para todas e dedicado somente onde o catálogo explicitamente declarar um.
