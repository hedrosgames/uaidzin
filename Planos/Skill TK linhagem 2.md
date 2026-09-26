# Skill TK — linhagem 2 (Controle · Defensivo)

**Status:** etapa 1 **executada** (mapa VFX, `directionFor`, descrições, QA Node — ver §11). Fundação F1–F4/F6 do plano 1 ainda **pendente** para barra de 10 e “Melhorar”.

**Repositório:** `Planos/Skill TK linhagem 2.md` na `main`.

Plano de implementação. Só arquitetura e regra de organização; **não contém código**. Continuação de `Planos/Skill TK linhagem 1.md`. Onde este documento diz “plano 1”, leia aquele arquivo.

---

## 0. Escopo e decisões herdadas

| # | Item | Valor |
|---|---|---|
| 1 | Linhagem 2 | Árvore **Controle** (`treeOrder[1]` do TK = `controle`, rótulo “Defensivo”) |
| 2 | Conjunto canônico das 8 | **Código atual** (`game/src/data/classes/skills/tk.ts` → `TK_CONTROLE`): Shield · Resistance · Taunt · Imunity · Parry · Sustain · Fear · Divine Armor |
| 3 | Barra 10, teclas 1–9,0, save com posição, wire como projeção, “Melhorar” | Do plano 1 (F1–F4, F6). (rev.) Só o teste ponta a ponta com barra de 10 depende deles; mapa, direção, durações, descrições e VFX de aprendizado não dependem e foram executados antes — ver seção 11 |
| 4 | Regras do projeto (`AGENTS.md`, grill) | Iguais ao plano 1, seção 1 |
| 5 | Restrições YAGNI gerais | Iguais ao plano 1, seção 3.4; as específicas desta árvore estão na seção 3.3 |

Aliases históricos desta árvore (inventário e `VFX-KIT-FIREBURST.md`): “Provocação · Postura · Rugido · Muralha · Âncora · Desafio · Guarda · Bastião”. São os nomes das **pastas de VFX** em `tkSkills/`, não das skills. Os IDs do código são o contrato; os controllers são reaproveitados pelo mapa `TK_DEDICATED_VFX_BY_SKILL_ID`.

Referência criativa nova (não usada no plano 1): `game/vfx/skills-vfx-brief.md` (Atelier X7) tem um conceito autoral por **id atual** (ex.: `tk_ctrl_shield` · “Guarda de ferro”). É estudo de lab, não runtime; serve para escolher qual controller pronto casa com cada skill.

---

## 1. Diagnóstico — estado atual da linhagem

### 1.1 O que já existe e é reaproveitado

| Peça | Onde | Estado |
|---|---|---|
| Definição das 8 (4 buffs, 1 cura, 2 danos em área com status, 1 passiva) | `tk.ts` → `TK_CONTROLE` | Completa; números provisórios |
| Buffs de `defense`, `maxHp`, `magicResist`, `evasion` e passiva `damageReduction` | `CombatMods.addStat/applyPassive` → `frameMods` | Completo; tetos: esquiva 0,60, redução 0,75, resistência 0,75 |
| Consumo dos mods no dano recebido (esquiva, redução, resistência vs arquétipo `ranged`, HP máximo) | `CityGameSession` ~L1262–1272 e `hpCap` ~L702 | Completo |
| Cura por `healRatio` (vale para `heal` **e** para buff com `healRatio`, caso da Resistance) | `SkillCasting.resolveSkill` | Completo; escala +5 %/nível |
| Status em inimigo: `tauntSec` (persegue e ataca o jogador), `stunSec` (para) | `EnemyModel.applySkillStatus` + `EnemyAI` | Completo |
| Auto: cura quando HP ≤ 62 %, buff quando não ativo, dano quando há alvo no raio, passiva nunca | `SkillController.autoUseful/autoScore` | Completo |
| 8 controllers defensivos prontos (lab + QA) | `tkSkills/{provocacao,postura,rugido,muralha,ancora,desafio,guarda,bastiao}` | Prontos e **órfãos** (nenhum id atual aponta para eles) |
| 2 controllers do conjunto “sagrado” reaproveitáveis aqui | `tkSkills/escudo-sagrado`, `tkSkills/bencao` | Prontos e órfãos |
| `case` de despacho para os 10 controllers acima | `EffectManager.dispatchSkillVfx` | Existe; falta só o mapa |
| QA por controller | `scripts/check-tk-{muralha,postura,provocacao,escudo-sagrado,guarda,bencao,rugido,bastiao}.mjs` | Prontos |

### 1.2 Lacunas específicas desta árvore

| ID | Lacuna | Evidência |
|---|---|---|
| C1 | Nenhum dos 8 ids tem VFX dedicado ligado; as chaves `tk_ctrl_1..8` do mapa nunca casam — as 8 caem no genérico (`buff`/`heal`/`aoe`/`passive`) | `TK_DEDICATED_VFX_BY_SKILL_ID` |
| C2 | Skills `self` chegam ao despacho com `target = null` → `target = center = origin` → **direção zero** nos controllers frontais (`castMuralha`, `castEscudo`, `castGuarda` recebem `target − origin`) | `CityGameSession` ~L1108–1110; `dispatchSkillVfx` |
| C3 | `magicResist` só reduz dano de inimigo com `archetype === "ranged"` (não existe dano mágico de inimigo) | `CityGameSession` ~L1270 |
| C4 | Quatro buffs e uma cura sem indicador na tela (sem HUD de buff) | plano 1, 2.3 — segue fora do escopo, mas pesa mais aqui |
| C5 | Grafia: “Imunity” (nem inglês nem pt-BR) | `tk.ts` |
| C6 | 8ª (Divine Armor) é passiva: não casta, logo nunca aciona VFX dedicado; `bastiao` fica órfão | `SkillLoadout` filtra passiva; `syncPassives` só toca o genérico |
| C7 | Anel da Provocação (`ringMaxRadius` 2,6) menor que o raio mecânico do Taunt (5); ondas do Rugido (4,8) maiores que o raio do Fear (3,8) | configs `DEFAULT_*_VFX_CONFIG` |

### 1.3 Fora do escopo (registrado)

| Item | Motivo |
|---|---|
| HUD de buffs/cura | Feature própria; vale para as três linhagens e para FM/BM/HT — abrir plano separado |
| Dano mágico de inimigo / resistência por elemento | Sistema de inimigos; C3 fica documentado na descrição da skill |
| Aura que segue o jogador | Mesmo motivo do plano 1 (D7) |
| Paleta sombria para o Rugido (Fear) | Só depois de o Felipe ver o Rugido vermelho/dourado no jogo |
| Âncora e Desafio | Sem skill dona nesta árvore; Desafio é candidato na linhagem 3 |

---

## 2. Arquitetura desta árvore

### 2.1 Mapa skill → VFX (fonte única: `TK_DEDICATED_VFX_BY_SKILL_ID`)

| Pos. | Skill | Controller | Chamada no despacho (já existe) | Por que casa |
|---:|---|---|---|---|
| 1 | Shield | `muralha` | `castMuralha(origin, direção)` | Atelier “Guarda de ferro”: painel sobe da base, fecha a frente, aparas caem — blocos materializam do chão, persistem 1 s e desmoronam |
| 2 | Resistance | `postura` | `castPostura(center, duração)` | Anel de chão ferro/ouro com pulsos periódicos de “resistência” — vigor sustentado |
| 3 | Taunt | `provocacao` | `castProvocacao(center)` | Estampido + anel de choque + marcas voltadas ao cavaleiro (“Batida no escudo”) |
| 4 | Imunity | `escudo-sagrado` | `castEscudo(origin, direção)` | Domo frontal facetado com faísca desviada (“Vidro consagrado”) |
| 5 | Parry | `guarda` | `castGuarda(origin, direção)` | Concha frontal com três ondulações nos tempos de bloqueio (“Ricochete”) |
| 6 | Sustain | `bencao` | `castBencao(center)` | Anel + coluna de luz, cura (“Brasa vital”) |
| 7 | Fear | `rugido` | `castRugido(origin)` | Onda de rugido a partir do peito, raio 4,8 (“Sombra do elmo”) — cor fica para depois |
| 8 | Divine Armor | genérico de passiva; **opcional** `bastiao` no aprendizado | `castBastiao(origin)` | Cerca de estacas e correntes sobe ao redor — evento único de capstone |

Sobram em reserva: `ancora`, `desafio` (linhagem 3), e do conjunto sagrado `selo`, `aura`, `julgamento`, `luz`, `purificar`, `tribunal` (linhagem 3).

### 2.2 Peças novas (todas pequenas e reutilizáveis)

| Peça | Onde | O que faz | Quem usa |
|---|---|---|---|
| `directionFor(input, target)` (feito) | método privado de `EffectManager` | `target − origin` no plano do chão; sem `input.target` ou com alvo na origem, usa o vetor da `facing` (convenção do jogo: `x = sin(facing)`, `z = cos(facing)`, a mesma de `SkillCasting.inFront`) | `muralha`, `escudo-sagrado`, `guarda` aqui; `golpe` em Fire Slash na linhagem 3 |
| Duração explícita no `case` de `postura` | `dispatchSkillVfx` | Passa um número curto (provisório) em vez do padrão de 6 s do controller, porque o anel fica parado no ponto do cast; `bencao` (1,35 s) fica com o padrão | Resistance |
| VFX de aprendizado de passiva (C6) (feito) | `CityGameSession.playPassiveLearnVfx(skill)`, chamado por `tryLearnSkill` (e por `afterSkillLearned` quando o plano 1 F1 existir) | Ao comprar o **nível 1** de uma passiva cujo perfil tem `dedicatedVfx`, despacha um cast com origem/centro no jogador | Divine Armor agora; Mestre Dual e Increase Critical se um dia ganharem dedicado |

### 2.3 Restrições YAGNI desta árvore

1. **Nenhum controller novo, nenhuma pasta nova.** Sete entradas no mapa (oito com FC3) e um helper de direção.
2. **Sem paleta nesta linhagem.** As oito casam em forma; cor só muda se o Felipe pedir (Fear).
3. **Sem “aura que segue”**; passar duração curta é o teto.
4. **Sem mexer em `EnemyAI`/`EnemyModel`**: taunt e stun já fazem o que a ficha diz.
5. **Sem alterar C3**: escrever na descrição que a resistência vale contra ataques à distância; a regra muda num plano de inimigos.
6. **Não ajustar `DEFAULT_*_VFX_CONFIG`** por causa de C7 antes de o Felipe ver; se ajustar, é uma constante e o lab/QA do controller precisam continuar verdes.
7. **Sem renomear ids.** Grafia de `name` só com decisão do Felipe (DC4).

---

## 3. Fundação específica (depois de F1–F7 do plano 1)

### FC1 — Direção por `facing` no despacho

**Objetivo:** controllers frontais recebem direção válida em skills `self`.

Arquitetura: `directionFor` em `EffectManager`; os três `case` frontais passam a usá-lo. Sem alvo, ou com alvo coincidindo com a origem, a direção é a da `facing` (rev.: nunca um eixo fixo do mundo). Nenhuma mudança no request nem no `CityGameSession`.

Restrição de código: uma função e três linhas alteradas em `EffectManager.ts`.

Teste: `typecheck`; no jogo, castar Shield olhando para quatro direções e ver a muralha sempre à frente; `check-tk-muralha.mjs` inalterado.

### FC2 — Mapa VFX da árvore Controle

**Objetivo:** as sete entradas de ativas da tabela 2.1 no mapa; remover as chaves mortas `tk_ctrl_1..8`.

Arquitetura: só `SkillVfxCatalog.ts`. Divine Armor **não** entra no mapa como cast (passiva); se FC3 for aprovada, entra com `bastiao` e o despacho de aprendizado a consome. `check-skill-vfx.mjs` segue em 96.

Restrição de código: um arquivo.

Teste: `npm run vfx:runtime:qa`; cada ativa castada no jogo soma `session.effects.getSkillVfxState().active > 0` no frame do cast.

### FC3 — VFX de aprendizado de passiva com dedicado (opcional · DC3)

**Objetivo:** capstone passiva tem um momento visível quando é comprada, sem tocar no loop de frame.

Arquitetura: em `tryLearnSkill`, após aprender com sucesso, `playPassiveLearnVfx(skill)`: se `kind === "passive"`, nível resultante = 1 e `getSkillVfxProfile(id).dedicatedVfx` existir → `effects.dispatchSkillVfx` com o mesmo `SkillVfxRequest` do pipeline de cast, `origin = center = jogador`, `target = null`, `hits = []`. Nada muda em `syncPassiveVfx` (o pulso genérico continua marcando a passiva ativa a cada sessão; os dois tocam juntos na compra — DC7).

Restrição de código: um helper e um `if` em `CityGameSession.ts`; entrada `tk_ctrl_divine_armor: "bastiao"` no mapa.

Teste: comprar Divine Armor no Mestre → Bastião toca uma vez na cidade; recarregar → não toca de novo; `check-tk-bastiao.mjs` verde.

### FC4 — QA da linhagem

**Portão Node (feito):** `game/scripts/check-tk-dispatch.mjs controle` (`npm run tk:dispatch:qa`) simula `dispatchSkillVfx` para as 8 skills em 5 direções: controller certo inicia o cast, o genérico não dispara junto, cena sem NaN após 30 frames, `desc` presente.

**Portão navegador (pendente, `check-tk-controle.mjs`):** molde do `check-tk-fisica.mjs` (plano 1, F7), usando só `window.__UAIDZIN__` (`debugAddLevels`, `wire.learnSkill`, `session`, `persistSave`).

Roteiro: TK → níveis → ouro → compra as 8 → barra com 7 ativas e sem a passiva → para cada ativa: casta por tecla e por clique, lê `getSkillVfxState().active`, confere efeito mecânico (tabela da seção 4) → 8ª exclusiva bloqueia Fire Burst e Círculo da Morte → recarrega e confere.

Restrição de código: um script novo.

---

## 4. As 8 skills, uma a uma

Convenções iguais ao plano 1: `i` = posição (0–7); compra = 1 ponto + `(i + 1) × 28` ouro por nível; MP/CD de `tk.ts` ou `tierMp/tierCd[i]`; spec da árvore Controle reduz CD até 25 %; nível dá +5 % só em dano e cura. **Tudo provisório.**

### S1 — Shield · `tk_ctrl_shield` · posição 1/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · buff próprio (`kind buff`, `shape self`) |
| Efeito | Defesa **+32 %** por **12 s** (`buff tk_shield`, `stat defense` → `defenseMul`) |
| Números | MP **6** · CD **2,4 s** |
| Pré-requisito | Nenhum |
| Custo compra | 1 ponto + **28** ouro |
| Barra | **Sim** |
| Auto | Só quando `tk_shield` não está ativo |
| VFX | **`muralha`** via `directionFor` (FC1) |
| Descrição (para `desc`) | “Ergue a guarda: defesa +32 % por 12 s.” |

Delta: entrada no mapa; `desc`. Nível não escala (registrar).

Restrição de código: `SkillVfxCatalog.ts`, `tk.ts`.

Teste: `frameMods.defenseMul ≈ 1,32`; dano recebido de um mesmo inimigo cai; muralha nasce à frente do jogador em qualquer direção.

Riscos: muralha de 3,2 m de largura por 2,5 s para um buff — se pesar, alternativa é `guarda` (e Parry vai para `postura`); trocar é um valor no mapa (DC6).

### S2 — Resistance · `tk_ctrl_resistance` · posição 2/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · buff próprio com cura no cast |
| Efeito | HP máximo **+25 %** por **14 s** (`stat maxHp` → `hpCap`) **e** cura **12 %** do HP máximo ao castar (`healRatio 0,12`) |
| Números | MP **8** · CD **3,2 s** |
| Pré-requisito | Shield ≥ 1 |
| Custo compra | 1 ponto + **56** ouro |
| Barra | **Sim** |
| Auto | Só quando `tk_resistance` não está ativo (regra de buff; a cura é bônus) |
| VFX | **`postura`** com duração curta passada no `case` (provisório **3 s**, DC1) |
| Descrição | “Raízes de aço: HP máximo +25 % por 14 s e cura 12 % do HP máximo ao usar. Nível aumenta a cura.” |

Delta: entrada no mapa; duração no `case "postura"`; `desc`.

Restrição de código: `SkillVfxCatalog.ts`, `EffectManager.ts` (um argumento), `tk.ts`.

Teste: `hpCap` sobe 25 % e volta ao expirar (HP é limitado ao teto novo); número de cura verde no cast; `check-tk-postura.mjs` verde.

Riscos: ao expirar com HP acima do teto base, o HP é cortado — comportamento atual de `hpCap`; registrar na descrição se o Felipe achar necessário.

### S3 — Taunt · `tk_ctrl_taunt` · posição 3/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano em **área** físico com provocação (`shape aoe`, `power weapon`) |
| Efeito | Dano **×0,35** em todos num raio de **5 m** e **taunt 5 s**: o inimigo persegue o jogador (velocidade mínima 2,4) e ataca ao alcance, mesmo arqueiro/fixo (`EnemyAI`) |
| Números | MP **8** · CD **4,0 s** |
| Pré-requisito | Resistance ≥ 1 |
| Custo compra | 1 ponto + **84** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo no raio; prioridade baixa no `autoScore` (0,35 × nível) |
| VFX | **`provocacao`** (`castProvocacao(center)`) |
| Descrição | “Batida no escudo: dano leve em área e todos os inimigos num raio de 5 m vêm atrás de você por 5 s.” |

Delta: entrada no mapa; `desc`.

Restrição de código: `SkillVfxCatalog.ts`, `tk.ts`.

Teste: inimigo `ranged` a 5 m para de recuar e vem ao corpo a corpo por 5 s (`tauntTimer`); números de dano em todos no raio; sem inimigo no raio não gasta MP; `check-tk-provocacao.mjs` verde.

Riscos: C7 (anel 2,6 m vs raio 5 m) — decidir depois de ver (DC5).

### S4 — Imunity · `tk_ctrl_imunity` · posição 4/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · buff próprio |
| Efeito | Resistência mágica **+35 %** por **12 s** (`stat magicResist`); hoje reduz só o dano de inimigos de arquétipo `ranged` (C3) |
| Números | MP **10** · CD **4,6 s** |
| Pré-requisito | Taunt ≥ 1 |
| Custo compra | 1 ponto + **112** ouro |
| Barra | **Sim** |
| Auto | Só quando `tk_imunity` não está ativo |
| VFX | **`escudo-sagrado`** via `directionFor` (FC1) |
| Descrição | “Vidro consagrado: reduz em 35 % o dano de ataques à distância por 12 s.” |

Delta: entrada no mapa; `desc` honesta com C3; grafia do `name` (DC4).

Restrição de código: `SkillVfxCatalog.ts`, `tk.ts`.

Teste: dano de inimigo `ranged` ×0,65; dano de `chaser` inalterado; `check-tk-escudo-sagrado.mjs` verde.

Riscos: a descrição só é verdadeira enquanto C3 valer; quando existir dano mágico de inimigo, muda a descrição, não a skill.

### S5 — Parry · `tk_ctrl_parry` · posição 5/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · buff próprio |
| Efeito | Esquiva **+18 %** por **10 s** (`stat evasion`; teto 60 %) — ataque esquivado mostra “miss” |
| Números | MP **10** · CD **5,2 s** |
| Pré-requisito | Imunity ≥ 1 |
| Custo compra | 1 ponto + **140** ouro |
| Barra | **Sim** |
| Auto | Só quando `tk_parry` não está ativo |
| VFX | **`guarda`** via `directionFor` (FC1) |
| Descrição | “Ricochete: 18 % de chance de aparar qualquer ataque por 10 s.” |

Delta: entrada no mapa; `desc`.

Restrição de código: `SkillVfxCatalog.ts`, `tk.ts`.

Teste: `frameMods.evasion = 0,18`; amostra de 200 ataques recebidos via `__UAIDZIN__` com proporção de “miss” compatível (tolerância larga); `check-tk-guarda.mjs` verde.

Riscos: nenhum.

### S6 — Sustain · `tk_ctrl_sustain` · posição 6/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · **cura** própria (`kind heal`, `shape self`) |
| Efeito | Cura **10 %** do HP máximo (`healRatio 0,10`), escala +5 %/nível e com `healPower` |
| Números | MP **12** (`tierMp[5]`) · CD **6 s** (explícito em `tk.ts`) |
| Pré-requisito | Parry ≥ 1 |
| Custo compra | 1 ponto + **168** ouro |
| Barra | **Sim** |
| Auto | Quando HP ≤ **62 %** (`healAutoHpRatio`); prioridade cresce quanto menor o HP |
| VFX | **`bencao`** (`castBencao(center)`; duração padrão 1,35 s serve) |
| Descrição | “Brasa vital: recupera 10 % do HP máximo. Nível aumenta a cura.” |

Delta: entrada no mapa; `desc`.

Restrição de código: `SkillVfxCatalog.ts`, `tk.ts`.

Teste: número de cura = 10 % do HP máximo (nível 1); auto dispara ao cair abaixo de 62 %; `check-tk-bencao.mjs` verde.

Riscos: nenhum.

### S7 — Fear · `tk_ctrl_fear` · posição 7/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano em **área** sombrio com atordoamento (`shape aoe`, `element shadow`, `power weapon`) |
| Efeito | Dano **×0,7** num raio de **3,8 m** e **stun 1,6 s** garantido (sem `stunChance`): inimigo não anda nem ataca |
| Números | MP **12** · CD **7 s** |
| Pré-requisito | Sustain ≥ 1 |
| Custo compra | 1 ponto + **196** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo no raio; `autoScore` 0,7 × nível |
| VFX | **`rugido`** (`castRugido(origin)`); cor vermelho/dourado hoje |
| Descrição | “Sombra do elmo: dano em área e todos num raio de 3,8 m ficam atordoados por 1,6 s. Nível aumenta o dano.” |

Delta: entrada no mapa; `desc`.

Restrição de código: `SkillVfxCatalog.ts`, `tk.ts`.

Teste: inimigos no raio param 1,6 s (`stunTimer`), inclusive o que está atrás; dano ×0,7; `check-tk-rugido.mjs` verde.

Riscos: elemento `shadow` é só cor no genérico e não aparece no Rugido; paleta sombria fica para depois da validação (1.3).

### S8 — Divine Armor · `tk_ctrl_divine_armor` · posição 8/8 (8ª exclusiva)

| Campo | Valor (fonte) |
|---|---|
| Tipo | **Passiva** (`passive damageReduction`) |
| Efeito | Todo dano recebido **−12 %** (aplicado antes da resistência; teto de redução 75 %) |
| Números | MP 0 · CD 0 |
| Pré-requisito | Fear ≥ 1 **e** nenhuma 8ª de outra árvore; ao comprar, `eighthTree = "controle"` |
| Custo compra | 1 ponto + **224** ouro |
| Barra | **Não** |
| VFX | Genérico de passiva (evento `equip`); **opcional** `bastiao` uma vez no aprendizado (FC3) |
| Descrição | “Couraça solar. Passiva: todo dano recebido cai 12 %. Só uma 8ª skill por personagem. Não entra na barra.” |

Delta: `desc`; FC3 se aprovada. Nível não escala (registrar).

Restrição de código: `tk.ts` (+ FC3).

Teste: `frameMods.damageReduction = 0,12` → dano ×0,88; `canLearn("fisica", 7)` e `canLearn("magia", 7)` falsos; ausente em `barSnapshot()`; `resetSkills` libera.

Riscos: nenhum.

---

## 5. Tabelas de referência

### 5.1 Resumo

| Pos. | Skill | Id | Tipo | Barra | Compra | MP / CD | VFX | Delta |
|---:|---|---|---|---|---|---|---|---|
| 1 | Shield | `tk_ctrl_shield` | Ativa · buff defesa | Sim | 1 + 28 | 6 / 2,4 s | `muralha` | mapa, FC1, desc |
| 2 | Resistance | `tk_ctrl_resistance` | Ativa · buff HP + cura | Sim | 1 + 56 | 8 / 3,2 s | `postura` (3 s) | mapa, duração, desc |
| 3 | Taunt | `tk_ctrl_taunt` | Ativa · área + provocação | Sim | 1 + 84 | 8 / 4 s | `provocacao` | mapa, desc |
| 4 | Imunity | `tk_ctrl_imunity` | Ativa · buff resistência | Sim | 1 + 112 | 10 / 4,6 s | `escudo-sagrado` | mapa, FC1, desc |
| 5 | Parry | `tk_ctrl_parry` | Ativa · buff esquiva | Sim | 1 + 140 | 10 / 5,2 s | `guarda` | mapa, FC1, desc |
| 6 | Sustain | `tk_ctrl_sustain` | Ativa · cura | Sim | 1 + 168 | 12 / 6 s | `bencao` | mapa, desc |
| 7 | Fear | `tk_ctrl_fear` | Ativa · área + stun | Sim | 1 + 196 | 12 / 7 s | `rugido` | mapa, desc |
| 8 | Divine Armor | `tk_ctrl_divine_armor` | Passiva · 8ª | **Não** | 1 + 224 | — | genérico (+ `bastiao` opcional) | desc (+ FC3) |

Custo total no nível 1: **8 pontos** e **1 008** de ouro (mesma observação do plano 1, 6.2, sobre pontos por nível).

### 5.2 Controllers após este plano

| Controller | Skill dona | Situação |
|---|---|---|
| `muralha` | Shield | passa a ser usado |
| `postura` | Resistance | passa a ser usado |
| `provocacao` | Taunt | passa a ser usado |
| `escudo-sagrado` | Imunity (cruzado do conjunto sagrado) | passa a ser usado |
| `guarda` | Parry | passa a ser usado |
| `bencao` | Sustain (cruzado do conjunto sagrado) | passa a ser usado |
| `rugido` | Fear | passa a ser usado |
| `bastiao` | Divine Armor (aprendizado, opcional) | condicionado a DC3 |
| `ancora` | — | **reserva** |
| `desafio` | — | reservado para a linhagem 3 |

---

## 6. Ordem de execução e tasks

| Ordem | Task | Depende de | Fecha | Teste mínimo para `done` |
|---:|---|---|---|---|
| 1 | FC1 direção por `facing` | plano 1 F7 | C2 | typecheck · manual 4 direções |
| 2 | FC2 mapa VFX Controle | FC1 | C1 | vfx:runtime:qa |
| 3 | FC4 `check-tk-controle.mjs` | FC2 | — | script verde |
| 4 | S1 Shield | FC2 | — | script + Felipe |
| 5 | S2 Resistance | FC2 | — | script + check-tk-postura + Felipe |
| 6 | S3 Taunt | FC2 | — | script + Felipe (C7) |
| 7 | S4 Imunity | FC2 | C3 (doc), C5 | script + Felipe |
| 8 | S5 Parry | FC2 | — | script + Felipe |
| 9 | S6 Sustain | FC2 | — | script + Felipe |
| 10 | S7 Fear | FC2 | — | script + Felipe |
| 11 | FC3 VFX de aprendizado (se DC3 = sim) | FC2 | C6 | check-tk-bastiao · manual |
| 12 | S8 Divine Armor | FC3 ou FC2 | — | script |
| 13 | Docs (seção 8) | tudo | — | leitura cruzada |

Uma skill por vez; a seguinte só abre com a anterior validada pelo Felipe. S8 não tem validação visual nova se DC3 = não.

---

## 7. Validação global

1. `npm run typecheck` e `npm run build` verdes; zero comentário; sem `console.log`.
2. Portão Node: `node scripts/check-tk-dispatch.mjs controle` verde. Portão navegador: `node scripts/check-tk-controle.mjs` verde.
3. `node scripts/check-tk-controllers.mjs muralha postura provocacao escudo-sagrado guarda bencao rugido bastiao` verde.
4. `npm run vfx:runtime:qa`, `npm run smoke`, `npm run test:save` verdes.
5. `node scripts/check-tk-fisica.mjs` continua verde (o mapa e o `EffectManager` são compartilhados).
6. Felipe: sete ativas com VFX à frente/no lugar certo; passiva fora da barra; descrições verdadeiras (inclusive a de Imunity).

---

## 8. Documentação a atualizar

| Arquivo | Mudança |
|---|---|
| `nongame/docs/inventarios/skills.md` | Linhas do TK controle: ids/nomes do código, efeito, custo, status |
| `nongame/docs/inventarios/classes.md` | Nomes do código na linha `controle` do TK |
| `nongame/docs/inventarios/vfx.md` | Tabela 5.2 |
| `nongame/docs/project/VFX-KIT-FIREBURST.md` | Alias id do código ao lado de Provocação…Bastião; nota de reuso cruzado (`escudo-sagrado`, `bencao`) |
| `nongame/docs/project/DECISOES-DESIGN.md` | DC1–DC6 conforme o Felipe responder |

---

## 9. Decisões em aberto para o Felipe

| ID | Pergunta | Padrão assumido | Custo de mudar |
|---|---|---|---|
| DC1 | Duração da Postura no cast da Resistance | **3 s** (provisório) | um número |
| DC2 | Descrição da Imunity fala em “ataques à distância” (C3)? | **Sim** (UI não mente) | texto |
| DC3 | Divine Armor toca Bastião ao ser comprada? | **Sim** (FC3) | um `if` a menos |
| DC4 | Grafia de “Imunity” | **Manter** até decisão sobre idioma dos nomes (plano 1, D4) | `name` em `tk.ts` |
| DC5 | Ajustar `ringMaxRadius` da Provocação (2,6 → 5) e ondas do Rugido (4,8 → 3,8)? | **Não** antes de ver | uma constante cada; lab/QA continuam |
| DC6 | Shield = `muralha` e Parry = `guarda`, ou trocar Shield para `guarda` e Parry para `postura`? | **Como está** | valores no mapa |
| DC7 | Pular o pulso genérico de passiva quando o aprendizado já toca um VFX dedicado (Bastião)? (rev.) | **Não** antes de ver | um `if` em `syncPassives` |

---

## 10. Glossário (só o que este plano acrescenta)

| Termo | Caminho |
|---|---|
| Definição da árvore | `game/src/data/classes/skills/tk.ts` → `TK_CONTROLE` |
| Mods e consumo | `game/src/domain/combat/CombatMods.ts` · `game/src/app/CityGameSession.ts` (dano recebido ~L1255–1280) |
| Status de inimigo | `game/src/domain/enemies/EnemyModel.ts` (`applySkillStatus`) · `EnemyAI.ts` |
| Controllers desta árvore | `game/src/presentation/effects/tkSkills/{muralha,postura,provocacao,escudo-sagrado,guarda,bencao,rugido,bastiao}/` |
| Atelier (conceitos por id) | `game/vfx/skills-vfx-brief.md` |
| QA | `game/scripts/check-tk-dispatch.mjs controle` (feito no lugar do `check-tk-controle.mjs`, simulação em Node) · `check-tk-<controller>.mjs` |

---

## 11. Estado de execução (2026-09-26)

Executado sem a fundação do plano 1 (barra de 10 e Mestre): as sete ativas continuam usando os 4 slots atuais para o teste em jogo.

| Item | Estado | Como foi feito | Teste executado |
|---|---|---|---|
| FC1 direção por `facing` | done | `EffectManager.directionFor` (alvo − origem quando há alvo; senão `(sin facing, 0, cos facing)`); usado por `muralha`, `escudo-sagrado`, `guarda` | `check-tk-dispatch.mjs controle` (5 direções, sem cast perdido) |
| FC2 mapa VFX Controle | done | 8 entradas em `SkillVfxCatalog.ts`; `tk_ctrl_1..8` mortas removidas | `check-tk-dispatch.mjs controle` · `check-tk-controllers.mjs` nos 8 controllers |
| FC3 VFX de aprendizado (DC3 assumido = sim) | done | `CityGameSession.playPassiveLearnVfx` dispara `bastiao` ao aprender Divine Armor (nível 1) | typecheck · dispatch de `bastiao` no script; falta ver no jogo |
| FC4 QA | done (adaptado) | `game/scripts/check-tk-dispatch.mjs` (`npm run tk:dispatch:qa`), simulação em Node de `dispatchSkillVfx`, cobre Controle e Magia; não substitui o navegador | verde para as 16 skills |
| Descrições (`desc`) | done | `SkillDef.desc` + 8 textos em `tk.ts`; bridge expõe `desc` e `passive`; tooltip e Mestre mostram “Passiva · não vai para a barra” | typecheck · sintaxe do wire |
| Duração da Postura (DC2, provisório 3 s) | done | `VFX_BALANCE.skillBuffRingSeconds` | check-tk-postura |
| Docs seção 8 · DC1–DC6 no `DECISOES-DESIGN.md` | pendente | aguarda respostas do Felipe | — |
| Validação visual do Felipe · `vfx:runtime:qa` · `smoke` · `test:save` | não executados | sem Chromium do Playwright neste ambiente | — |

