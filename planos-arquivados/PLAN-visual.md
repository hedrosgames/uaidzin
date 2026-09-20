# Plano — Camada visual do GDD UAIDZIN

## Identidade

Information Designer de documento de sistema de jogo — o leitor precisa comparar regras, ver ciclo e achar o que ainda está aberto. Não landing page.

## Premissa

Estilo existente do `GDD.html` (dark técnico, âmbar) é a fundação. Visuals herdam a paleta. Fonte de verdade continua sendo os `.md`; a camada visual **não edita prosa**.

## Fonte de verdade das imagens

```
UAIDZIN/visual/
  manifest.json     ← o que injetar em qual seção
  svg/              ← SVGs autocontidos (mesmo tema)
  README.md         ← como adicionar um diagrama
```

O `build.js` lê o `manifest.json`, injeta o SVG **depois** do heading da seção correspondente (slug `ch-NN--titulo`), e embute no `GDD.html`. Se o slug não existir, avisa no build e não quebra.

Os `.md` permanecem intocados. Diagramas precisam espelhar o texto; se o texto mudar, o diagrama é atualizado no `visual/`.

### Formato do manifest

```json
{
  "ch-03--loop-principal": {
    "kind": "flow",
    "title": "Loop principal",
    "file": "svg/loop-principal.svg",
    "source": "01-visao-geral.md e 03-core-gameplay.md"
  },
  "ch-05--o-que-o-reset-remove": {
    "kind": "cards",
    "title": "Reset remove vs. mantém",
    "file": "svg/reset-remove-mantem.svg"
  }
}
```

Tipos de peça (`kind`): `flow` | `cycle` | `diagram` | `cards` | `compare` | `timeline` | `matrix` | `hierarchy`.

---

## Inventário visual por capítulo

Prioridade: **Alta** = o texto sozinho obriga o leitor a reconstruir o sistema na cabeça. **Média** = ajuda mas o parágrafo já resolve. **Baixa** = enfeite ou conteúdo ainda vazio de números.

### 01 — Visão Geral · Alta

| Seção | Peça | O que comunica |
|---|---|---|
| Loop Principal | **fluxo em ciclo** | Cidade → Preparação → Dungeon → Farm → Retorno → Progressão → Nova Dungeon |
| Estrutura da Dungeon | **diagrama de arenas** | diorama linear de arenas conectadas, sem ramificação |
| Progressão | **timeline horizontal** | Mortal 1–400 · Arch 1–400 · Cele 1–200, com reset **dentro** de cada faixa |
| Modelo de Experiência | **cards de 3 colunas** | Single-player · Offline · Sem servidor |

### 02 — Pilares · Alta

| Seção | Peça |
|---|---|
| Abertura do capítulo | **5 cards de pilar** (Controle, Farm, Progressão, Build, Reset) com uma frase-guia cada |
| A Combinação | **diagrama de 3 referências → UAIDZIN** (Archero = interação; WYD = estrutura RPG; MU = reset) |
| O Que o Jogo Não É | **compare** negativo: não-MMORPG / não-hypercasual / não-roguelike |

### 03 — Core Gameplay · Alta (prioridade máxima)

| Seção | Peça |
|---|---|
| Loop Principal | reutiliza o ciclo do 01 (ou link visual) |
| Inimigos e Spawns | **diagrama de arena** com 3 zonas: spawn fixo, perseguidor (distância mínima), longo alcance |
| Ataque Básico + Posicionamento + Autofarm | **máquina de estados do personagem**: Movendo (sem ataque básico) → Parado (ataque auto) ; Autofarm = Parado sem input; skills auto/manual |
| Fluxo Completo (1–9) | **fluxograma vertical numerado** dos 9 passos |
| Princípio Fundamental | **ciclo fechado grande**: Entrar → Spawns → Farm → Recursos → Mais forte → Farmar melhor → Evoluir → Resetar → Recomeçar |

### 04 — Controles · Média

| Seção | Peça |
|---|---|
| Controle do Personagem | **cards WASD/mouse** + fato “sem botão de ataque básico” |
| Câmera | slot de diagrama **TBD** (decisão de câmera ainda pendente) — marcar como pendente, não inventar |

### 05 — Personagem e Progressão · Alta

| Seção | Peça |
|---|---|
| Classes | **4 cards** TK / BM / HT / FM com label “provisório” |
| Níveis e Evoluções | **barra de faixas** Mortal/Arch/Cele |
| Atributos | **cards** FOR / DES / CONS / INT + nota “5 pts por nível” |
| Pontos de Reset | **card numérico destaque** 1.000 pts (valor de design) |
| Equipamentos | **silhueta/paper-doll** com 7 slots |
| Builds | **fórmula visual** Classe + Atributos + Skills + Arma + Equipamentos |
| Reset Remove | **2 colunas** Remove (nível, atributos, skills) × Mantém (equip, refine, inventário, evolução) |
| Relação Mortal/Arch/Cele | **3 trilhas paralelas** de reset independentes (não empilham) |

### 06 — Combate · Alta

| Seção | Peça |
|---|---|
| Comportamento dos Inimigos | **3 cards + mini-arena** Spawn fixo / Persegue / Longo alcance |
| Ataque Básico | **regra visual**: mover ⟂ atacar |
| Acerto e Esquiva | **nota diagramada**: fórmula, não i-frame manual |
| Autofarm | **camadas**: base autofarm (parado) + otimização manual |

### 07 — Inimigos · Média

| Seção | Peça |
|---|---|
| Função no Farm | cards de papel do inimigo no farm |
| Dados Pendentes | lista de pendências (já estilizada no HTML) — sem gráfico inventado |

### 08 — Mundo · Média

| Seção | Peça |
|---|---|
| Estrutura do Mundo | **diagrama 1 cidade → N dungeons** (sem mundo aberto) |
| Biomas | slots visuais TBD (sem inventar biomas) |

### 09 — Cidade · Alta

| Seção | Peça |
|---|---|
| Sistemas | **hub map**: cidade no centro, satélites = sistemas (atributos, skills, lojas, refine, reset, dungeon select…) |
| NPCs | cards de papéis previstos (sem nomes finais) |

### 10 — Dungeons · Alta

| Seção | Peça |
|---|---|
| Estrutura | **sequência de arenas** com tempo 10:00 único no topo |
| Dungeons Iniciais | **8 slots vazios** (D1–D8) cobrindo Mortal 1–400 — placeholder honesto |
| Limites de Nível + Itens de Entrada | **matriz** dungeon × min/max/item (valores TBD) |
| Duração | **gauge 10 min** |

### 11 — Itens · Média

| Seção | Peça |
|---|---|
| Slots | reuse paper-doll do 05 |
| Loot | **fluxo curto**: drop → inventário (ou perdido se cheio) |
| Raridade | escala visual **TBD** (sem inventar tiers) |

### 12 — Skills · Alta

| Seção | Peça |
|---|---|
| Árvores | **diagrama 3 árvores × 8 nós** + árvore comum (livros) |
| Regra da Oitava Skill | **decisão visual**: 3 ramos, só 1 topo liberado; os outros 2 bloqueados |
| Builds | reuse fórmula + especialização por árvore |

### 13 — Economia · Alta

| Seção | Peça |
|---|---|
| Economia | **Sankey simples**: Farm/Venda → Ouro → Refinamento / Reset / Compras |
| Materiais | cards Poeira de Ori / Poeira de Lac |
| Reset como sumidouro | destaque no fluxo Sankey |

### 14–15 — NPCs / Missões · Baixa

Conteúdo raso e cheio de pendência. Só **cards de escopo** se valer o espaço; nada de fluxo inventado.

### 16 — Interface · Média

| Seção | Peça |
|---|---|
| Dungeon HUD | **wireframe esquemático** (barras, tempo, skills) — não arte final |
| Cidade | lista de telas em **grid de chips** |

### 17–19 — Narrativa / Arte / Áudio · Baixa

Sem sistemas quantificáveis. Manter texto; eventualmente 1 card de direção. Não forçar diagrama.

### 20 — Fluxos e Telas · Alta

| Seção | Peça |
|---|---|
| Fluxo Principal | **fluxo** Cidade → Seleção → Dungeon → Resultado → Cidade |
| Cidade | reuse chips de telas |
| Pendências | mapa de fluxos ainda não desenhados (morte, loot, reset…) |

### 21 — Balanceamento · Alta

| Seção | Peça |
|---|---|
| Níveis | reuse barras Mortal/Arch/Cele |
| Farm/Autofarm | **compare**: eficiência autofarm < controle manual (sem inventar %) |
| Unidade de Farm | **10 min** como unidade de medida (card) |
| Pendências | lista numérica de curvas ainda abertas — sem gráfico fake de XP |

### 22–27 — Saves / Técnico / Perf / A11y / Monetização / Telemetria · Baixa

| Seção | Peça |
|---|---|
| 22 Dados Persistentes | **checklist** o que persiste vs. o que reseta (espelha 05) |
| 23 Arquitetura | **bloco simples** Navegador (HTML/JS/Web 3D) · Offline |
| 24 Performance | cards de direção de otimização |
| 27 Métricas | chips de métricas de interesse |
| 26 Monetização | sem gráfico — status em aberto |

### 28 — Roadmap · Alta

| Seção | Peça |
|---|---|
| Estratégia + 3 etapas | **timeline 3 fases**: Protótipo (14 itens) → Sistemas → Conteúdo/Polimento |
| Primeiro Protótipo | **checklist de 14 itens** do greybox |

### 29 — Qualidade · Média

| Seção | Peça |
|---|---|
| Critérios | cards de critério |
| Greybox | nota de ordem de validação |

### 30 — Glossário · Baixa

Melhor como **índice em cards A–Z** ou manter definições em prosa (já está claro). Não gerar diagrama por termo.

---

## Inventário consolidado (o que produzir)

### Fluxos / ciclos (SVG estruturado)

1. Loop principal (ciclo)
2. Fluxo completo 1–9 (vertical)
3. Fluxo de telas Cidade→Resultado→Cidade
4. Economia Ouro (Sankey simplificado)
5. Loot drop → inventário / perda

### Diagramas de sistema

6. Arena + 3 comportamentos de inimigo
7. Máquina de estados movendo/parado/autofarm
8. 3 árvores × 8 skills + 8ª exclusiva
9. Hub da cidade com sistemas
10. Sequência de arenas + timer 10 min
11. 8 dungeons placeholder D1–D8 na faixa 1–400
12. Reset remove × mantém
13. Trilhas independentes Mortal/Arch/Cele
14. Fórmula de build
15. Paper-doll 7 slots
16. 5 pilares
17. 3 referências → UAIDZIN
18. Roadmap 3 fases
19. HUD dungeon (wireframe)
20. Barras de faixa de nível

~20 SVGs. Conteúdo curto (14–19, 22–27, 30) fica com cards leves ou só prosa.

---

## Regras de fidelidade

1. **Nada inventado.** Se o GDD diz “a definir”, o visual mostra slot/TBD, não valor fake.
2. Números que podem aparecer: 10 min, 8 dungeons, 3 árvores × 8 skills, 7 slots de equip, 5 pts/nível, 1.000 pts/reset, Mortal 400 / Arch 400 / Cele 200, 4 classes, 9 passos do fluxo, 14 itens do protótipo, 5 pilares.
3. Evoluções: GDD atual usa **Mortal 1–400**, **Arch 1–400**, **Cele 1–200** (não o 0–400/401–800/801–1000 antigo). Diagramas seguem o texto atual.
4. Reset é independente por etapa — nunca desenhar reset de Mortal “subindo” para Arch.
5. Autofarm **não anda**; só ataca no lugar.
6. Ataque básico **não acontece em movimento**.

---

## Técnica

1. Estender `build/build.js`:
   - carregar `visual/manifest.json` se existir
   - para cada seção, injetar `<figure class="viz" data-kind="…">` + SVG inline + `<figcaption>` com título (e fonte se houver)
2. CSS: `.viz` com borda do tema, fundo `panel`, max-width 100%, acessível (SVG `role="img"` + `<title>`).
3. SVGs hand-authored em `visual/svg/` — sem CDN, sem fontes externas, textos em pt-BR, mesmas cores do GDD (`#0f1218`, `#d4a017`, `#e8ecf2`, `#c45c26` para risco/pendência).
4. Build log: N visuals aplicados, avisos de slug ausente.

---

## Fases de implementação

### Fase 1 — Infra + sistemas centrais
- manifest + injetor no build
- Loop, fluxo 1–9, reset remove/mantém, barras de evolução, estados de combate, árvore de skills + 8ª skill
- Rebuild + review visual

### Fase 2 — Cidade, dungeons, economia
- Hub cidade, arenas/enemy AI, 8 dungeons TBD, Sankey Ouro, paper-doll, fórmula de build, 5 pilares

### Fase 3 — Fluxos, roadmap, polish
- Fluxo de telas, roadmap 3 fases, HUD wireframe, compare autofarm/manual, cards de 22/24/27
- Revisão de fidelidade frase a frase contra os `.md`

### Fora de escopo (v1)
- Animações/interatividade nos diagramas
- Alterar qualquer `.md`
- Ilustração de personagem/ambiente
- Gráficos quantitativos (curva XP, DPS) — números ainda não definidos

---

## Verificação

- Diff zero nos `*.md`
- Cada figura citada no manifest aparece na seção certa do `GDD.html`
- Nenhum número fora da lista permitida
- `node build/build.js` limpo
- Telas estreitas: SVG escala sem cortar rótulo

## Decisões

| Decisão | Por quê | Alternativa | Custo |
|---|---|---|---|
| Sidecar `visual/` + manifest | `.md` intocados | anotar HTML nos `.md` | dois lugares para manter |
| SVG manual no tema | consistente, offline, editável | mermaid + lib embutida | HTML maior |
| Placeholder honesto (D1–D8, TBD) | GDD marca pendências | inventar biomas/curvas | visual “incompleto” de propósito |
| Fase 1 no core loop | maior ganho de clareza | fazer tudo de uma vez | demora até ver valor |
