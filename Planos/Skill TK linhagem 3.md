# Skill TK — linhagem 3 (Magia · Mágico)

Plano de implementação. Só arquitetura e regra de organização; **não contém código**. Continuação de `Planos/Skill TK linhagem 1.md` (fundação F1–F7, obrigatória) e de `Planos/Skill TK linhagem 2.md` (FC1 `directionFor`, reutilizado aqui). Onde este documento diz “plano 1” ou “plano 2”, leia aqueles arquivos.

Data: 26/09/2026 · Branch: `arena/01a0dd3a-uaidzin` · Base: commit `4148226`.

---

## 0. Escopo e decisões herdadas

| # | Item | Valor |
|---|---|---|
| 1 | Linhagem 3 | Árvore **Magia** (`treeOrder[2]` do TK = `magia`, rótulo “Mágico”) |
| 2 | Conjunto canônico das 8 | **Código atual** (`tk.ts` → `TK_MAGIA`): Lâmina de Energia · Campo de Gelo · Mana Burn · Moon Ray · Poison Stab · Fire Slash · Estocada do Veredito (id `tk_mag_death_stab`, rev.: renomeada por DM1) · Círculo da Morte (rev.: acento por DM2) |
| 3 | Fundação | FC1 do plano 2 (feito). Do plano 1, só o teste ponta a ponta com barra de 10 e o “Melhorar” (F1–F4, F6) — a etapa 1 daqui foi executada antes deles (rev., seção 11) |
| 4 | Regras e YAGNI gerais | Plano 1, seções 1 e 3.4 |

Aliases históricos desta árvore: “Bênção · Selo · Aura · Escudo Sagrado · Julgamento · Luz · Purificar · Tribunal” — nomes das **pastas de VFX** do conjunto “sagrado”, desenhadas para uma árvore de suporte que **não é** a do código (a Magia do código é ofensiva e elemental). Dois desses controllers já foram para a linhagem 2 (`escudo-sagrado`, `bencao`); os outros seis casam com cinco skills daqui. Para as três skills elementais sem controller de forma compatível (gelo, veneno, fogo), a base é o genérico por elemento e a melhoria é uma **paleta** sobre um controller existente, no mesmo padrão do Atk Descuidado (plano 1, S2).

Referência criativa: `game/vfx/skills-vfx-brief.md` (Atelier X7), um conceito por id (ex.: `tk_mag_moon_ray` · “Fenda lunar”).

---

## 1. Diagnóstico — estado atual da linhagem

### 1.1 O que já existe e é reaproveitado

| Peça | Onde | Estado |
|---|---|---|
| Definição das 8 (7 danos, 1 buff; nenhuma passiva) | `tk.ts` → `TK_MAGIA` | Completa; números provisórios |
| Poder mágico: `power: "magic"` multiplica o ataque da arma por `1 + magicPower` (não existe atributo de inteligência) | `SkillCasting.resolveSkill` | Completo — Mana Burn é o único `magicPower` do TK |
| Custo de mana multiplicado por `mpCostMul` (Mana Burn +40 %) | `SkillController.tick/affordable` | Completo |
| Status em inimigo: lentidão (`slow` = fator de velocidade), dano contínuo (`dotRatio` × dano do golpe por segundo) | `EnemyModel.applySkillStatus` | Completo |
| `pierce` (ignora fração da defesa) | `resolveSkill` | Completo |
| Elementos (`holy`, `ice`, `poison`, `fire`) | `elementColor` | **Só cor**; não há resistência por elemento |
| 6 controllers sagrados órfãos | `tkSkills/{selo,aura,julgamento,luz,purificar,tribunal}` | Prontos (lab + QA) |
| Controllers físicos órfãos reutilizáveis por paleta | `tkSkills/corte` (lâminas cruzadas no alvo), `tkSkills/golpe` (arco na origem) | Prontos |
| `case` de despacho para todos os acima | `EffectManager.dispatchSkillVfx` | Existe; falta o mapa |
| Genérico por elemento (base das três elementais) | `SkillVfxDirector` famílias `aoe`, `melee`, `projectile` com `colorHex` do elemento | Completo |

### 1.2 Lacunas específicas desta árvore

| ID | Lacuna | Evidência |
|---|---|---|
| M1 | Nenhum dos 8 ids tem VFX dedicado ligado; chaves `tk_mag_1..8` mortas | `TK_DEDICATED_VFX_BY_SKILL_ID` |
| M2 | Dois “Death Stab” no mesmo personagem (`tk_fis_death_stab` e `tk_mag_death_stab`) — tooltip, log e barra ficam ambíguos | `tk.ts` |
| M3 | “Circulo da Morte” sem acento (regra pt-BR) | `tk.ts` |
| M4 | Controllers de área centrados no alvo (`castTribunal(target)`, `castSelo(center)`) recebem hoje o **inimigo mais próximo** como `target`, mas a mecânica de `aoe` é em torno do **jogador** (`center = origin`) | `CityGameSession` ~L1110; `dispatchSkillVfx` |
| M5 | Mana Burn encarece todas as skills em 40 % por 12 s e não há HUD de buff para avisar | plano 1, 2.3 |
| M6 | Três skills elementais (gelo, veneno, fogo) sem controller de forma e cor compatíveis | tabela 2.1 |
| M7 | Docs com nomes de suporte (Bênção…Tribunal) para uma árvore ofensiva | `skills.md`, `classes.md`, `VFX-KIT` |

### 1.3 Fora do escopo (registrado)

| Item | Motivo |
|---|---|
| Atributo de poder mágico / resistência por elemento | Sistema de personagem e inimigos; a descrição diz a verdade atual |
| HUD de buffs (inclui aviso de custo do Mana Burn) | Plano separado, comum às três linhagens |
| Controller novo para gelo/veneno/fogo | O padrão de paleta cobre; controller novo só se o Felipe reprovar a paleta |
| `purificar`, `ancora` | Ficam em reserva (Purificar é a alternativa para Death Stab, DM7) |

---

## 2. Arquitetura desta árvore

### 2.1 Mapa skill → VFX (fonte única: `TK_DEDICATED_VFX_BY_SKILL_ID`)

| Pos. | Skill | Base (etapa 1) | Melhoria (etapa 2, opcional) | Por que casa |
|---:|---|---|---|---|
| 1 | Lâmina de Energia | **`luz`** — `castLuz(origin, target)` | — | Feixe carregado da arma ao alvo com impacto (“Fio de alvorada”) |
| 2 | Campo de Gelo | genérico `aoe` (cor gelo) | `selo` com **paleta gelo**, centrado no jogador (M4) | Selo duplo girando no chão 2,1 s (“Geada radial”) |
| 3 | Mana Burn | **`aura`** — `castAura(center, duração)` | — | Aura corporal com motes em órbita e pulsos (“Mana em combustão”) |
| 4 | Moon Ray | **`julgamento`** — `castJulgamento(target)` | — | Três raios verticais do céu sobre o alvo, o último maior (“Fenda lunar”) |
| 5 | Poison Stab | genérico `melee` (cor veneno) | `corte` com **paleta veneno** | Lâminas cruzadas no alvo, curtas (“Agulha verde”) |
| 6 | Fire Slash | genérico `aoe` (cor fogo) | segunda instância de `golpe` com **paleta fogo** e `arcRadius` ≈ 3,5, direção por `directionFor` | Arco largo na origem (“Varredura de brasa”) |
| 7 | Death Stab (mag) | **`desafio`** — `castDesafio(origin, target)` | alternativa `purificar` (DM7) | Feixe de mira até o alvo e selo/marca no ponto (“Lança do veredito”) |
| 8 | Círculo da Morte | **`tribunal`** — `castTribunal(center)` (M4) | — | Pilares descem num círculo, fissuras e impacto final (“Tribunal de lâminas”) |

### 2.2 Peças novas ou ajustadas

| Peça | Onde | O que faz | Quem usa |
|---|---|---|---|
| Centro de área no despacho | `dispatchSkillVfx`, `case "tribunal"` e `case "selo"` | Quando `profile.family === "aoe"`, passar `input.center` (jogador) em vez de `target` | Círculo da Morte, Campo de Gelo |
| Duração no `case "aura"` | `dispatchSkillVfx` | Passar duração curta (provisório **2,5 s**, DM4) em vez do padrão de 8 s, pelo mesmo motivo do plano 1 (D7) | Mana Burn |
| `directionFor` | `EffectManager` (plano 2, FC1) | Direção para o arco de fogo em skill de área | Fire Slash (melhoria) |
| Paleta por instância | `FuriaVfxConfig.palette` já introduzido no plano 1; repetir o **mesmo desenho** em `SeloVfxConfig`, `CorteVfxConfig`, `GolpeVfxConfig` (cores quente/média/profunda consumidas por texturas, shader e luz; padrão = cores atuais) | `EffectManager` cria `tkSeloGelo`, `tkCorteVeneno`, `tkGolpeFogo`; três `case` novos na união `DedicatedSkillVfx` (`"selo-gelo"`, `"corte-veneno"`, `"golpe-fogo"`). (rev., A3) Pré-requisito: lista de ciclo de vida do `EffectManager` (plano 1, F7) — sem ela cada instância custa cinco linhas de ciclo a mais | Etapa 2 das três elementais |
| `desc` e `name` | `tk.ts` | Descrições pt-BR das 8; acento em “Círculo da Morte” (M3); desambiguar o `name` do Death Stab mágico (M2, DM1) — ids intactos | UI |

### 2.3 Restrições YAGNI desta árvore

1. **Etapa 1 não cria nada**: cinco entradas no mapa, dois `case` ajustados (centro/duração), descrições. As três elementais ficam no genérico por elemento — que já existe e já colore certo.
2. **Etapa 2 só depois de o Felipe validar a etapa 1** e só se pedir cor dedicada. Cada paleta é: um campo de config, uma instância no `EffectManager`, um `case`, uma entrada na união e no mapa. **Sem pasta nova.**
3. **Sem controller novo, sem shader novo.**
4. **Sem mexer em `SkillCasting`** (magia sem atributo próprio é decisão de sistema, não desta árvore).
5. **Sem HUD de buff**; a descrição do Mana Burn avisa o custo.
6. **Sem renomear ids.** `name` só muda por M2/M3 com o Felipe.
7. Não tocar em `fireBurst/` nem em `check-fire-*.mjs`.

---

## 3. Fundação específica (depois de F1–F7 e FC1)

### FM1 — Mapa VFX da árvore Magia (etapa 1)

**Objetivo:** ligar `luz`, `aura`, `julgamento`, `desafio`, `tribunal`; remover as chaves mortas `tk_mag_1..8`.

Arquitetura: só `SkillVfxCatalog.ts`. As três elementais **não** entram no mapa nesta etapa (caem no genérico por design). `check-skill-vfx.mjs` segue em 96.

Restrição de código: um arquivo.

Teste: `npm run vfx:runtime:qa`; as cinco no jogo somam `session.effects.getSkillVfxState().active > 0` no frame do cast; as três elementais mostram o genérico na cor do elemento.

### FM2 — Centro de área e duração no despacho

**Objetivo:** `tribunal` (e `selo`, na etapa 2) nascem no jogador quando a skill é de área; `aura` dura pouco.

Arquitetura: nos `case "tribunal"` e `case "selo"`, usar `input.center` quando `input.profile.family === "aoe"`; no `case "aura"`, passar a duração provisória. Nada muda no request.

Restrição de código: três linhas em `EffectManager.ts`.

Teste: Círculo da Morte com inimigo a 4 m → pilares ao redor do **jogador**; `check-tk-tribunal.mjs` e `check-tk-aura.mjs` inalterados.

### FM3 — Nomes e descrições

**Objetivo:** UI verdadeira e em pt-BR.

Arquitetura: `desc` das 8 (textos na seção 4); `name` “Círculo da Morte”; `name` do Death Stab mágico conforme DM1. Bridge e wire já mostram `desc` (plano 1, F5).

Restrição de código: `tk.ts`.

Teste: hover nas 8 no Mestre e no K; busca por “Death Stab” na UI encontra nomes distintos.

### FM4 — QA da linhagem

**Portão Node (feito):** `game/scripts/check-tk-dispatch.mjs magia` — as 5 dedicadas iniciam o controller certo e as 3 elementais confirmadas no `SkillVfxDirector`, em 5 direções, sem NaN, com `desc`.

**Portão navegador (pendente, `check-tk-magia.mjs`):** molde do `check-tk-fisica.mjs`. Roteiro: TK → níveis → ouro → compra as 8 → barra com 8 ativas → para cada uma: cast por tecla e clique, `getSkillVfxState().active`, efeito mecânico (seção 4) → Mana Burn ativo: dano das mágicas ×1,28 e MP cobrado ×1,4 → 8ª exclusiva bloqueia Fire Burst e Divine Armor → recarrega e confere.

Restrição de código: um script novo.

### FM5 — Paletas (etapa 2, opcional · DM3)

**Objetivo:** cor dedicada para gelo, veneno e fogo sem controller novo.

Pré-requisito (rev., A3): lista de ciclo de vida no `EffectManager` (plano 1, F7) já feita.

Arquitetura: replicar em `selo`, `corte` e `golpe` o campo `palette` do plano 1 (Fúria); instâncias `tkSeloGelo`, `tkCorteVeneno`, `tkGolpeFogo` no `EffectManager` com paleta e, no Golpe, `arcRadius` maior; `case` novos; união e mapa. Padrão de cada controller continua igual (Force Wave, Campo de… nenhum outro usuário muda).

Restrição de código: por controller, config + texturas + dois usos de cor; `EffectManager` (uma instância e um `case` por paleta, mais as linhas de ciclo); `SkillVfxTypes`; `SkillVfxCatalog`. Um controller por task, um de cada vez.

Teste: `check-tk-selo/corte/golpe.mjs` continuam verdes com a paleta padrão; no jogo, cada elemental mostra a cor certa; Felipe valida.

---

## 4. As 8 skills, uma a uma

Convenções iguais ao plano 1: `i` = posição (0–7); compra = 1 ponto + `(i + 1) × 28` ouro por nível; MP/CD de `tk.ts` ou `tierMp/tierCd[i]`; multiplicador padrão `tierMult[i]` quando não explícito; spec da árvore Magia reduz CD até 25 %; nível dá +5 %/nível em dano; todas as de dano têm `power: "magic"` (ataque da arma × `1 + magicPower`). **Tudo provisório.**

### S1 — Lâmina de Energia · `tk_mag_lamina_energia` · posição 1/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano · alvo único · sagrado · à distância (`shape single`, `element holy`, `range R = 8`) |
| Números | Mult **1,15** (`tierMult[0]`) · alcance **8** · MP **6** · CD **2,4 s** |
| Pré-requisito | Nenhum |
| Custo compra | 1 ponto + **28** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo vivo até 8 m |
| VFX | **`luz`** (`castLuz(origin, target)`; carga 0,15 s, feixe, impacto 0,5 s) |
| Descrição | “Fio de alvorada: um feixe de luz corta um inimigo a até 8 m. Dano mágico. Nível aumenta o dano.” |

Delta: entrada no mapa (FM1); `desc`.

Restrição de código: `SkillVfxCatalog.ts`, `tk.ts`.

Teste: inimigo a 7 m recebe dano; a 9 m não; `check-tk-luz.mjs` verde.

Riscos: nenhum.

### S2 — Campo de Gelo · `tk_mag_campo_gelo` · posição 2/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano em **área** de gelo com lentidão (`shape aoe`, `element ice`) |
| Efeito | Dano **×1,3** (`tierMult[1]`) num raio de **3,4 m** ao redor do jogador; velocidade do inimigo cai para **55 %** por **3,5 s** (`slow 0,55` é fator de velocidade, `slowSec 3,5`) |
| Números | MP **8** · CD **3,2 s** |
| Pré-requisito | Lâmina de Energia ≥ 1 |
| Custo compra | 1 ponto + **56** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo no raio |
| VFX | Etapa 1: genérico `aoe` (cor gelo). Etapa 2: **`selo` paleta gelo** centrado no jogador (FM2, FM5) |
| Descrição | “Geada radial: dano de gelo num raio de 3,4 m e os atingidos andam a 55 % da velocidade por 3,5 s. Nível aumenta o dano.” |

Delta etapa 1: `desc`. Etapa 2: paleta, instância, `case "selo-gelo"`, mapa.

Restrição de código: etapa 1 só `tk.ts`; etapa 2 conforme FM5.

Teste: `slowFactor = 0,55` e `slowTimer = 3,5` nos inimigos do raio; inimigo atrás também; `check-tk-selo.mjs` verde após a paleta.

Riscos: a palavra “lentidão de 55 %” seria falsa — a descrição usa “andam a 55 %”.

### S3 — Mana Burn · `tk_mag_mana_burn` · posição 3/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · buff próprio com contrapartida |
| Efeito | Poder mágico **+28 %** por **12 s** (`stat magicPower`) **e** custo de mana **+40 %** por **12 s** (`extraBuff mpCost 0,4` → `mpCostMul 1,4`, vale para todas as skills, inclusive de outras árvores) |
| Números | MP **8** · CD **4,0 s** |
| Pré-requisito | Campo de Gelo ≥ 1 |
| Custo compra | 1 ponto + **84** ouro |
| Barra | **Sim** |
| Auto | Só quando `tk_mana_burn` não está ativo |
| VFX | **`aura`** com duração curta (FM2, DM4) |
| Descrição | “Mana em combustão: dano mágico +28 % por 12 s, mas toda skill custa 40 % mais mana enquanto durar.” |

Delta: entrada no mapa; duração no `case`; `desc`.

Restrição de código: `SkillVfxCatalog.ts`, `EffectManager.ts` (um argumento), `tk.ts`.

Teste: com o buff, Moon Ray custa 14 MP em vez de 10 e o dano das mágicas sobe ×1,28; skills físicas não sobem de dano, mas também custam ×1,4; `check-tk-aura.mjs` verde.

Riscos: M5 — sem HUD, o jogador não vê o custo extra; a descrição é a única aviso até o plano de HUD.

### S4 — Moon Ray · `tk_mag_moon_ray` · posição 4/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano · alvo único · sagrado · à distância |
| Números | Mult **1,85** · alcance **8** · MP **10** · CD **4,6 s** |
| Pré-requisito | Mana Burn ≥ 1 |
| Custo compra | 1 ponto + **112** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo até 8 m; `autoScore` 1,85 × nível (prefere esta à Lâmina) |
| VFX | **`julgamento`** (`castJulgamento(target)`; três raios, o último 1,3×) |
| Descrição | “Fenda lunar: um raio vertical cai sobre um inimigo a até 8 m. Dano mágico alto. Nível aumenta o dano.” |

Delta: entrada no mapa; `desc`.

Restrição de código: `SkillVfxCatalog.ts`, `tk.ts`.

Teste: dano ≈ 1,85 / 1,15 vezes o da Lâmina no mesmo alvo; `check-tk-julgamento.mjs` verde.

Riscos: o VFX tem três raios e a mecânica um golpe — leitura aceitável; se incomodar, `boltCount` é uma constante de config (afeta o lab).

### S5 — Poison Stab · `tk_mag_poison_stab` · posição 5/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano · alvo único · veneno · curto alcance (`range 3,2`, `power magic` explícito) |
| Efeito | Dano **×1,8** (`tierMult[4]`) e veneno: **35 % do dano do golpe por segundo durante 4 s** (`dotRatio 0,35`, `dotSec 4` → 140 % adicional no total) |
| Números | MP **10** · CD **5,2 s** |
| Pré-requisito | Moon Ray ≥ 1 |
| Custo compra | 1 ponto + **140** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo até 3,2 m |
| VFX | Etapa 1: genérico `melee` (cor veneno). Etapa 2: **`corte` paleta veneno** (FM5) |
| Descrição | “Agulha verde: estocada curta que envenena o alvo por 4 s (35 % do dano do golpe por segundo). Nível aumenta o dano e o veneno.” |

Delta etapa 1: `desc`. Etapa 2: paleta, instância, `case "corte-veneno"`, mapa.

Restrição de código: etapa 1 só `tk.ts`; etapa 2 conforme FM5.

Teste: `dotDps ≈ dano × 0,35` e `dotTimer = 4` no alvo; HP do alvo cai ao longo de 4 s sem novos golpes; `check-tk-corte.mjs` verde após a paleta.

Riscos: 140 % extra é forte para a posição 5 — balance é do Felipe; o plano só registra.

### S6 — Fire Slash · `tk_mag_fire_slash` · posição 6/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano em **área** de fogo (`shape aoe`, `element fire`) |
| Efeito | Dano **×2,0** (`tierMult[5]`) num raio de **3,5 m** ao redor do jogador |
| Números | MP **12** · CD **6 s** |
| Pré-requisito | Poison Stab ≥ 1 |
| Custo compra | 1 ponto + **168** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo no raio |
| VFX | Etapa 1: genérico `aoe` (cor fogo). Etapa 2: **`golpe` paleta fogo**, `arcRadius` ≈ 3,5, direção por `directionFor` (FM5) |
| Descrição | “Varredura de brasa: corte largo de fogo que atinge todos num raio de 3,5 m. Nível aumenta o dano.” |

Delta etapa 1: `desc`. Etapa 2: paleta, instância com `arcRadius` próprio, `case "golpe-fogo"`, mapa.

Restrição de código: etapa 1 só `tk.ts`; etapa 2 conforme FM5.

Teste: todos no raio recebem dano, inclusive atrás (mecânica é círculo; o arco da etapa 2 é leitura visual — mesma observação do Earthquake, plano 1 D3); `check-tk-golpe.mjs` verde após a paleta.

Riscos: arco frontal sobre mecânica circular (DM6).

### S7 — Death Stab (mágico) · `tk_mag_death_stab` · posição 7/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano · alvo único · sagrado · curto alcance (`range 3,4`, `pierce 0,2`) |
| Números | Mult **2,15** · ignora **20 %** da defesa · MP **12** · CD **7 s** |
| Pré-requisito | Fire Slash ≥ 1 |
| Custo compra | 1 ponto + **196** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo até 3,4 m |
| VFX | **`desafio`** (`castDesafio(origin, target)`; mira 0,6 s + selo no alvo). Alternativa: `purificar` (DM7) |
| Nome exibido | Precisa distinguir do `tk_fis_death_stab` (M2, DM1) — sugestão provisória: “Estocada do Veredito” (do atelier “Lança do veredito”) |
| Descrição | “Lança do veredito: estocada sagrada que ignora 20 % da defesa. Dano mágico muito alto em um alvo. Nível aumenta o dano.” |

Delta: entrada no mapa; `name` (DM1); `desc`.

Restrição de código: `SkillVfxCatalog.ts`, `tk.ts`.

Teste: dano com defesa do alvo ×0,8; `check-tk-desafio.mjs` verde; a UI não mostra dois itens com o mesmo nome.

Riscos: Desafio leva 1,2 s até o selo — mais lento que uma estocada; se incomodar, trocar para `purificar` é um valor no mapa.

### S8 — Círculo da Morte · `tk_mag_circulo_morte` · posição 8/8 (8ª exclusiva)

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano em **área** sagrado |
| Efeito | Dano **×2,7** num raio de **4,2 m** ao redor do jogador |
| Números | MP **18** · CD **12 s** |
| Pré-requisito | Death Stab (mágico) ≥ 1 **e** nenhuma 8ª de outra árvore; ao comprar, `eighthTree = "magia"` |
| Custo compra | 1 ponto + **224** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo no raio; `autoScore` 2,7 × nível (a mais priorizada da árvore) |
| VFX | **`tribunal`** centrado no jogador (FM2); círculo do controller 2,3 m vs raio mecânico 4,2 m (registrar) |
| Nome exibido | “Círculo da Morte” (acento, M3) |
| Descrição | “Tribunal de lâminas: pilares de luz caem ao redor de você num raio de 4,2 m. Só uma 8ª skill por personagem: comprar esta bloqueia Fire Burst e Divine Armor.” |

Delta: entrada no mapa; centro (FM2); `name`; `desc`.

Restrição de código: `SkillVfxCatalog.ts`, `EffectManager.ts` (FM2), `tk.ts`.

Teste: `eighthTree = "magia"`; `canLearn("fisica", 7)` e `canLearn("controle", 7)` falsos; pilares nascem em volta do jogador; todos no raio recebem dano; `check-tk-tribunal.mjs` verde; `resetSkills` libera.

Riscos: nenhum de código; `circleRadius` é constante de config se o Felipe quiser aproximar do raio mecânico (afeta o lab).

---

## 5. Tabelas de referência

### 5.1 Resumo

| Pos. | Skill | Id | Tipo | Barra | Compra | MP / CD | VFX etapa 1 | VFX etapa 2 |
|---:|---|---|---|---|---|---|---|---|
| 1 | Lâmina de Energia | `tk_mag_lamina_energia` | Ativa · dano único 8 m | Sim | 1 + 28 | 6 / 2,4 s | `luz` | — |
| 2 | Campo de Gelo | `tk_mag_campo_gelo` | Ativa · área + lentidão | Sim | 1 + 56 | 8 / 3,2 s | genérico gelo | `selo` gelo |
| 3 | Mana Burn | `tk_mag_mana_burn` | Ativa · buff com custo | Sim | 1 + 84 | 8 / 4 s | `aura` | — |
| 4 | Moon Ray | `tk_mag_moon_ray` | Ativa · dano único 8 m | Sim | 1 + 112 | 10 / 4,6 s | `julgamento` | — |
| 5 | Poison Stab | `tk_mag_poison_stab` | Ativa · dano único + veneno | Sim | 1 + 140 | 10 / 5,2 s | genérico veneno | `corte` veneno |
| 6 | Fire Slash | `tk_mag_fire_slash` | Ativa · área | Sim | 1 + 168 | 12 / 6 s | genérico fogo | `golpe` fogo |
| 7 | Death Stab (mágico) | `tk_mag_death_stab` | Ativa · dano único + perfuração | Sim | 1 + 196 | 12 / 7 s | `desafio` | — |
| 8 | Círculo da Morte | `tk_mag_circulo_morte` | Ativa · área · 8ª | Sim | 1 + 224 | 18 / 12 s | `tribunal` | — |

Não há passiva nesta árvore: as **8 vão para a barra** (cabem, a barra tem 10). Custo total no nível 1: **8 pontos** e **1 008** de ouro.

### 5.2 Controllers após os três planos

| Controller | Skill dona | Linhagem |
|---|---|---|
| `golpe` (+ `quebra` no impacto) | Force Wave | 1 |
| `furia` / `furia` paleta descuidado | Fury / Atk Descuidado | 1 |
| `investida` | Death Stab (físico) | 1 |
| `avalanche` | Earthquake | 1 |
| `fireBurst` (`chain`) | Fire Burst | 1 |
| `muralha` · `postura` · `provocacao` · `escudo-sagrado` · `guarda` · `bencao` · `rugido` | Shield · Resistance · Taunt · Imunity · Parry · Sustain · Fear | 2 |
| `bastiao` | Divine Armor (aprendizado, opcional) | 2 |
| `luz` · `aura` · `julgamento` · `desafio` · `tribunal` | Lâmina de Energia · Mana Burn · Moon Ray · Death Stab (mágico) · Círculo da Morte | 3 |
| `selo` gelo · `corte` veneno · `golpe` fogo (paletas) | Campo de Gelo · Poison Stab · Fire Slash | 3 (etapa 2) |
| `machado` · `ancora` · `purificar` | — | **reserva** |

---

## 6. Ordem de execução e tasks

| Ordem | Task | Depende de | Fecha | Teste mínimo para `done` |
|---:|---|---|---|---|
| 1 | FM2 centro de área e duração | plano 1 F7, plano 2 FC1 | M4 | typecheck · check-tk-tribunal/aura |
| 2 | FM1 mapa VFX Magia (5 entradas) | FM2 | M1 | vfx:runtime:qa |
| 3 | FM3 nomes e descrições | plano 1 F5 | M2, M3 | hover · Felipe (acentos) |
| 4 | FM4 `check-tk-magia.mjs` | FM1, FM3 | — | script verde |
| 5 | S1 Lâmina de Energia | FM1 | — | script + Felipe |
| 6 | S3 Mana Burn | FM1 | M5 (doc) | script + Felipe |
| 7 | S4 Moon Ray | FM1 | — | script + Felipe |
| 8 | S7 Death Stab (mágico) | FM1, FM3 | — | script + Felipe (DM7) |
| 9 | S8 Círculo da Morte | FM1, FM2 | — | script + Felipe |
| 10 | S2, S5, S6 na etapa 1 (genérico por elemento) | FM3 | — | script (mecânica) |
| 11 | FM5 paleta gelo → S2 etapa 2 | Felipe aprovou etapa 1 · DM3 | M6 | check-tk-selo · Felipe |
| 12 | FM5 paleta veneno → S5 etapa 2 | idem | M6 | check-tk-corte · Felipe |
| 13 | FM5 paleta fogo → S6 etapa 2 | idem | M6 | check-tk-golpe · Felipe |
| 14 | Docs (seção 8) | tudo | M7 | leitura cruzada |

Uma skill por vez; paletas uma por task, só depois da etapa 1 inteira validada.

---

## 7. Validação global

1. `npm run typecheck` e `npm run build` verdes; zero comentário; sem `console.log`.
2. Portão Node: `node scripts/check-tk-dispatch.mjs magia` verde. Portão navegador: `node scripts/check-tk-magia.mjs` verde.
3. `node scripts/check-tk-controllers.mjs luz aura julgamento desafio tribunal` verde; após a etapa 2, também `selo corte golpe`.
4. `npm run vfx:runtime:qa`, `npm run smoke`, `npm run test:save` verdes.
5. `check-tk-fisica.mjs` e `check-tk-controle.mjs` continuam verdes (mapa, união e `EffectManager` são compartilhados; Force Wave continua usando o Golpe padrão).
6. Felipe: oito ativas na barra; Círculo e Campo nascem no jogador; nomes distintos para os dois Death Stab; “Círculo” com acento; descrição do Mana Burn avisa o custo.

---

## 8. Documentação a atualizar

| Arquivo | Mudança |
|---|---|
| `nongame/docs/inventarios/skills.md` | Linhas do TK magia: ids/nomes do código, efeito, custo, status; nota de que os aliases Bênção…Tribunal eram de suporte |
| `nongame/docs/inventarios/classes.md` | Linha `magia` do TK com os nomes do código |
| `nongame/docs/inventarios/vfx.md` | Tabela 5.2 (visão das três linhagens) |
| `nongame/docs/project/VFX-KIT-FIREBURST.md` | Alias id do código ao lado de Bênção…Tribunal; registro do padrão “paleta por instância” |
| `nongame/docs/project/DECISOES-DESIGN.md` | DM1–DM7 conforme o Felipe responder |

---

## 9. Decisões em aberto para o Felipe

| ID | Pergunta | Padrão assumido | Custo de mudar |
|---|---|---|---|
| DM1 | Nome exibido do `tk_mag_death_stab` | **“Estocada do Veredito”** (provisório) | `name` em `tk.ts` |
| DM2 | Corrigir “Circulo” → “Círculo” agora | **Sim** (regra pt-BR) | `name` em `tk.ts` |
| DM3 | Fazer a etapa 2 (paletas gelo/veneno/fogo) ou manter o genérico por elemento | **Fazer**, uma por vez, após validar a etapa 1 | nenhum se não fizer |
| DM4 | Duração da Aura no Mana Burn | **2,5 s** (provisório) | um número |
| DM5 | Descrição do Mana Burn avisa o custo de mana +40 % | **Sim** | texto |
| DM6 | Fire Slash etapa 2 como arco frontal (`golpe`) sobre mecânica circular | **Aceitar** (mesmo caso do Earthquake) | manter genérico `aoe` |
| DM7 | Death Stab mágico com `desafio` ou `purificar` | **`desafio`** | um valor no mapa |

---

## 10. Glossário (só o que este plano acrescenta)

| Termo | Caminho |
|---|---|
| Definição da árvore | `game/src/data/classes/skills/tk.ts` → `TK_MAGIA` (`R = 8`) |
| Poder mágico e perfuração | `game/src/domain/combat/SkillCasting.ts` (`resolveSkill`) |
| Custo de mana com buff | `game/src/domain/combat/SkillController.ts` (`mpCostMul`) |
| Lentidão e veneno | `game/src/domain/enemies/EnemyModel.ts` (`applySkillStatus`, `slowFactor`, `dotDps`) |
| Controllers desta árvore | `game/src/presentation/effects/tkSkills/{luz,aura,julgamento,desafio,tribunal}/` · paletas em `selo/`, `corte/`, `golpe/` |
| Genérico por elemento | `game/src/presentation/effects/skill/SkillVfxRuntime.ts` (`SkillVfxDirector`) · `elementColor` em `skill-types.ts` |
| Atelier (conceitos por id) | `game/vfx/skills-vfx-brief.md` |
| QA | `game/scripts/check-tk-dispatch.mjs magia` (feito no lugar do `check-tk-magia.mjs`, simulação em Node) · `check-tk-<controller>.mjs` |

---

## 11. Estado de execução (2026-09-26)

Etapa 1 executada; etapa 2 (FM5, paletas gelo/veneno/fogo) não iniciada, conforme DM3 (depende da validação visual da etapa 1).

| Item | Estado | Como foi feito | Teste executado |
|---|---|---|---|
| FM1 mapa VFX Magia | done | 5 entradas em `SkillVfxCatalog.ts` (`luz`, `aura`, `julgamento`, `desafio`, `tribunal`); `tk_mag_1..8` mortas removidas; S2, S5, S6 ficam no genérico por elemento | `check-tk-dispatch.mjs magia` (as 3 elementais confirmadas no `SkillVfxDirector`) |
| FM2 centro de área e duração | done | `areaCenter` em `dispatchSkillVfx` (`selo`, `tribunal` nascem no `center` quando família `aoe`); `aura` com `VFX_BALANCE.skillBuffAuraSeconds` = 2,5 s provisório | check-tk-tribunal/aura · dispatch |
| FM3 nomes e descrições | done | “Estocada do Veredito” (DM1), “Círculo da Morte” (DM2), 8 `desc` em `tk.ts`; manifesto, brief e catálogo do lab regenerados | `vfx:atelier:validate` (4 passos verdes) |
| FM4 QA | done (adaptado) | mesmo `check-tk-dispatch.mjs` do plano 2, com argumento `magia` | verde para as 8 skills |
| FM5 paletas (S2, S5, S6 etapa 2) | não iniciado | aguarda DM3 | — |
| Docs seção 8 · DM1–DM7 no `DECISOES-DESIGN.md` | pendente | aguarda respostas do Felipe | — |
| Validação visual do Felipe · `vfx:runtime:qa` · `smoke` · `test:save` | não executados | sem Chromium do Playwright neste ambiente | — |

