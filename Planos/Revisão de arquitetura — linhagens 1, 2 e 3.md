# Revisão de arquitetura — planos das linhagens 1, 2 e 3 do TK

Revisão sênior dos três planos em `Planos/`, cruzada com o código na **`main`** após merge do PR #8 (26/09/2026).

Método: leitura integral dos três planos; cada afirmação estrutural foi conferida no código (arquivo e linha citados abaixo); os testes existentes foram executados onde o ambiente permite (Node). As correções de documento apontadas aqui **já foram aplicadas** aos planos, com a marca “rev.” no texto; as mudanças de código propostas ficam como tasks, não foram executadas.

---

## 1. Veredito

| Plano | Veredito | Resumo |
|---|---|---|
| 1 — Física | **Aprovado com ressalvas** (3 achados altos) | A fundação F1–F7 está bem cortada, mas F1 quebra o bot e os caminhos de debug se for feita como escrito; F3 duplica métodos que a sessão já tem; S2 cruza o limite que o próprio plano fixou para refatorar o ciclo de vida do `EffectManager`. |
| 2 — Controle | **Aprovado** (etapa 1 executada) | Executado antes da fundação do plano 1, o que o plano dizia ser pré-requisito; na prática só a barra de 10 dependia dela. Texto ajustado para refletir o que foi feito (`directionFor`, `playPassiveLearnVfx`, QA em Node). |
| 3 — Magia | **Aprovado** (etapa 1 executada; etapa 2 condicionada) | Etapa 2 (paletas) depende do achado A3 (ciclo de vida) para não inflar o `EffectManager`; dependência registrada no plano. |

Princípios que os três planos respeitam e que a revisão confirma: uma informação com um dono (`tk.ts`, `SKILL_BALANCE`, `SkillLoadout`, mapa de VFX); nenhum controller novo; ids como contrato; números provisórios com fonte; UI como projeção do save.

---

## 2. Achados

Severidade: **Alta** = quebra funcionalidade existente ou viola regra do projeto se executado como está; **Média** = duplicação, dono duplo ou lacuna que gera retrabalho; **Baixa** = precisão de texto, risco pequeno.

### A1 · Alta · F1 remove o preenchimento automático da barra e quebra o bot e os caminhos de debug

Evidência: `SkillLoadout.refresh()` hoje preenche a barra por pontuação (`SkillLoadout.ts` L52–82) com `auto: true` (L82, L135). Quem depende disso: `CityGameSession.debugLearnRandomSkill` (L1710–1721, chama `learn` + `refresh`), `DebugApi.learnFirstSkill` (L223–229), `GamePanels` ação `learn` (L59–64) e o bot `scripts/bot-play.mjs` (L138 usa `learnRandomSkill` e conta `skillSlots`). O plano 1 (F1) só prevê equipar no nível 1 dentro de `tryLearnSkill`.

Impacto: após F1 + D1 (`auto` desligado), o bot aprende skills que nunca entram na barra e nunca são usadas; `npm run bot` deixa de exercitar skills sem nenhum teste falhar.

Recomendação (aplicada ao plano 1, F1): um único ponto na sessão — `afterSkillLearned(tree, index)` — chamado por **todos** os chamadores de `skillTree.learn` (`tryLearnSkill`, `debugLearnRandomSkill`, `DebugApi.learnFirstSkill`, `GamePanels`), que faz `refresh`, `assign` no nível 1 de ativa e `playPassiveLearnVfx`. O caminho de debug liga `auto` explicitamente (é QA, não regra de jogo). `DebugApi.skillSlots` passa a contar posições ocupadas (já previsto).

### A2 · Alta · F3 duplica na bridge o que a sessão já expõe, sem persistir

Evidência: `CityGameSession.equipSkill` (L1327), `toggleSkillAuto` (L1332) e `clearSkillSlot` (L1336) já existem e são usados por `GamePanels`; nenhum deles chama `persistSave`. O plano 1 (F3) manda a bridge chamar `session.skillLoadout.assign` + `persistSave` diretamente, criando um segundo dono da regra “equipar e salvar”.

Recomendação (aplicada): a bridge chama os três métodos da sessão; a sessão passa a persistir neles (um lugar). `equipSkill` ganha `index?` e devolve `boolean`. Nada de acesso direto ao `SkillLoadout` fora da sessão.

### A3 · Alta · S2 do plano 1 é o 24º controller e o `EffectManager` já tem 5 listas manuais de 23 itens

Evidência: `EffectManager.ts` enumera todos os controllers em cinco lugares — `clear` (L253–277), `getSkillVfxState` (L383–437, duas vezes), `update` (L627–652) e `dispose` (L760–785): 115 chamadas `this.tkX.*`. Todos os 23 controllers já têm a mesma assinatura (`update(dt, width?, height?)`, `clear`, `dispose`, `getActiveCastCount`, `getParticleCount`), conferido por grep em `tkSkills/*/*Vfx.ts`. O plano 1 (§2.3) adia o “registry” para “quando entrar o 24º” — e a instância `tkDescuidado` de S2 **é** o 24º; o plano 3 (FM5) traz mais três.

Recomendação (aplicada ao plano 1, F7, e como pré-requisito da FM5 no plano 3): uma lista privada `tkControllers` tipada por interface estrutural, montada no construtor, e os cinco laços de ciclo de vida iteram a lista. O `switch` de despacho continua explícito por nome (não é registry de despacho). Custo: uma interface e cinco laços; cada instância nova passa a custar campo + `push` + `case`.

### A4 · Média · Aprender skill no painel de fallback não cobra ouro nem salva

Evidência: `GamePanels.ts` L59–64 chama `skillTree.learn` direto (só pontos), sem `SKILL_TRAINING.goldCost` nem `persistSave`. É um caminho vivo quando não há wire.

Recomendação (aplicada ao plano 1, F6): `GamePanels` chama `session.tryLearnSkill`, que já cobra ouro, revalida a barra e salva. Resolve também parte do A1.

### A5 · Média · Pontos por nível: se D5 mudar para 2, a mudança não pode ser feita nos chamadores

Evidência: `grantSkillPoints(levelsGained)` é chamado em três pontos de `CityGameSession.ts` (L898, L1640, L1676) e a regra “1 por nível” está implícita na chamada.

Recomendação (aplicada como nota em D5): quando o Felipe decidir, a constante `SKILL_BALANCE.skillPointsPerLevel` entra **dentro** de `SkillTreeService.grantSkillPoints` (multiplica níveis por pontos), sem tocar nos três chamadores.

### A6 · Média · Critérios de `done` dependem de navegador que pode não existir no ambiente de execução

Evidência: `check-tk-fisica.mjs` (proposto), `smoke`, `test:save` e `vfx:runtime:qa` usam Playwright; nesta sessão o Chromium não pôde ser baixado. As linhagens 2 e 3 foram fechadas com `game/scripts/check-tk-dispatch.mjs` (simulação em Node do `dispatchSkillVfx`, 16 skills × 5 direções) mais `check-tk-controllers.mjs`.

Recomendação (aplicada aos três planos): dois portões, nesta ordem — (1) Node: `typecheck`, `check-tk-dispatch.mjs <árvore>`, `check-tk-controllers.mjs`; (2) navegador (máquina do Felipe): scripts Playwright e validação visual. Rodar `check-tk-dispatch.mjs fisica` hoje falha só por `desc` ausente nas 8 físicas — exatamente o F5 pendente.

### A7 · Média · Os planos 2 e 3 declaravam F1–F7 como pré-requisito, mas foram executados sem ela

Evidência: seção 0 dos planos 2 e 3 (“só começa depois deles”). Na prática, só a validação com 10 slots dependia do plano 1; mapa, direção, centro, durações, descrições e VFX de aprendizado não dependiam.

Recomendação (aplicada): texto dos planos 2 e 3 corrigido — a dependência real é só do teste ponta a ponta com barra de 10 (F1–F4) e do “Melhorar” (F6). Plano 1 ganha nota de que F5 (estrutura) já existe e restam os oito textos.

### A8 · Baixa · Texto do FC1 divergia da implementação

Evidência: plano 2 dizia “vetor degenerado cai para `(0, 0, 1)`” e `directionFor(request)`; o código é `directionFor(input, target)` e, sem alvo ou com alvo na origem, usa o vetor da `facing` (`EffectManager.ts`, método `directionFor`).

Recomendação (aplicada): texto ajustado. A versão implementada é melhor: nunca aponta para um eixo fixo do mundo.

### A9 · Baixa · O `SkillVfxRequest` é montado em dois lugares

Evidência: pipeline de cast (`CityGameSession.ts` ~L1113–1130) e `playPassiveLearnVfx` (~L1785). Duas montagens de 13 campos.

Recomendação: deixar como está até o terceiro uso (YAGNI); se F7/S1 do plano 1 precisar montar request fora do cast, extrair `buildSkillVfxRequest` na sessão nesse momento. Registrado, não aplicado.

### A10 · Baixa · Ao aprender Divine Armor tocam dois efeitos ao mesmo tempo

Evidência: `syncPassiveVfx` (pulso genérico de passiva) e `playPassiveLearnVfx` (`bastiao`) disparam no mesmo frame de compra.

Recomendação: validar visualmente antes de mexer; se sobrepor mal, pular o pulso genérico quando o perfil tem `dedicatedVfx` (um `if` no `SkillVfxDirector.syncPassives`). Registrado como DC7 no plano 2.

### A11 · Baixa · `paintBarState` por frame precisa de diff

Evidência: `GameApp.renderHud` roda por frame; o plano 1 (F3) manda repassar `hud.skills` ao wire a cada chamada.

Recomendação (aplicada como nota em F3): o wire só toca o DOM quando `cdRatio`/`ready`/`auto` da posição mudaram (comparação com o último estado pintado).

### A12 · Baixa · Padrão de paleta por instância é aceitável, com o A3 antes

Evidência: cores da Fúria estão em três lugares — gradientes de textura (`FuriaTextures.ts` L12–39), uniform `uColor` do anel (`FuriaVfx.ts` L83) e `PointLight` (L154). Uma paleta de três cores base com rampas de alfa preservadas cobre os três.

Recomendação: manter o desenho (instância por paleta, nome próprio na união `DedicatedSkillVfx`), porque paleta por cast exigiria cache de texturas por cor dentro de cada controller. Pré-requisito: A3.

---

## 3. Correções aplicadas aos planos nesta revisão

| Plano | Onde | Mudança |
|---|---|---|
| 1 | §0 | Nota de estado: linhagens 2 e 3 (etapa 1) executadas; F5 estrutura pronta |
| 1 | §2.1, §2.2 | `desc` existe; G6 fechada na estrutura; G4 restrita a `tk_fis_1..7` |
| 1 | §2.3, §3.4 | “Registry só no 24º” substituído pela lista de ciclo de vida em F7 (A3) |
| 1 | F1 | `afterSkillLearned` único para todos os chamadores de `learn`; debug liga `auto` (A1) |
| 1 | F3 | Bridge usa `equipSkill/clearSkillSlot/toggleSkillAuto` da sessão, que passam a persistir (A2); diff antes de pintar (A11) |
| 1 | F5 | Marcada como estrutura pronta; restam os 8 textos |
| 1 | F6 | `GamePanels` passa por `tryLearnSkill` (A4) |
| 1 | F7 | Lista de ciclo de vida; chaves `ctrl/mag` já removidas; portão Node (A3, A6) |
| 1 | §7, §8, §10 | Tabela de tasks e validação com os dois portões; D5 com nota do A5; D10 e D11 novas |
| 2 | §0, FC1, §2.2, FC4, §7, §9 | Dependência real do plano 1; texto do `directionFor`; `playPassiveLearnVfx`; QA em Node; DC7 (A10) |
| 3 | §0, §2.2, FM4, FM5, §7 | Nomes já renomeados; FM5 depende do A3; QA em Node |

---

## 4. Decisões novas para o Felipe (além das D/DC/DM já listadas)

| ID | Pergunta | Padrão assumido | Onde |
|---|---|---|---|
| D10 | Caminho de debug/bot liga `auto` ao equipar, mesmo com D1 = desligado para o jogador? | **Sim** (QA precisa castar) | plano 1, F1 |
| D11 | Painel de fallback (`GamePanels`) continua existindo depois de F3? | **Sim**, só compilando e cobrando pelo `tryLearnSkill` | plano 1, F6 |
| DC7 | Pular o pulso genérico de passiva quando há VFX dedicado no aprendizado? | **Não** antes de ver | plano 2, §9 |

---

## 5. Portões de teste (comum aos três planos)

1. Node, sempre: `npm run typecheck` · `node scripts/check-tk-dispatch.mjs <fisica|controle|magia>` · `node scripts/check-tk-controllers.mjs <controllers da árvore>` · `npm run vfx:atelier:validate` quando `tk.ts` mudar nomes ou `desc`.
2. Navegador, na máquina do Felipe: `npm run vfx:runtime:qa` · `npm run smoke` · `npm run test:save` · `check-tk-<árvore>.mjs` (Playwright) · validação visual.
3. Estado atual: portão 1 verde para Controle e Magia; Física falha só por `desc` (F5 pendente); portão 2 não executado nesta sessão (sem Chromium).
