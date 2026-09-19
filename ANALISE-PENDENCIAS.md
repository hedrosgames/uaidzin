# Análise de pendências do GDD — leitura de Game Designer sênior

Data da análise: 2026-09-10. Base: capítulos 01–30 do GDD UAIDZIN.

Este documento **não decide** nada por você. Agrupa as ~120 pendências em decisões reais, diz o que bloqueia o greybox e o que pode esperar. Onde o texto do GDD já fixa uma regra, a sugestão respeita essa regra.

---

## 1. O que já está fechado (não reabrir sem motivo)

- Loop: Cidade → Preparação → Dungeon (10 min) → Farm → Retorno → Progressão/Reset.
- Combate: ataque básico automático, sem ataque em movimento, skills auto/manual, autofarm **não anda**.
- Progressão: Mortal 1–400, Arch 1–400, Cele 1–200; resets **independentes** por etapa.
- Reset: remove nível/atributos/skills do ciclo; mantém equip, refine, inventário, evolução; +1.000 pts de atributo (design inicial).
- Skills: 3 árvores × 8 + comum por livros; 8ª skill só em **uma** árvore.
- Loot: direto ao inventário; se cheio, perde o item e avisa.
- 8 dungeons no lançamento, sustentando Mortal 1–400, repetíveis, sem procedural.
- Single-player, offline, web 3D desktop.

---

## 2. Mapa de dependências (o que trava o quê)

```
Greybox (protótipo)
 ├─ Controles + câmera          ← TRAVA tudo de feel
 ├─ 1 dungeon + arenas + spawns ← TRAVA farm
 ├─ Ataque auto + 1 skill       ← TRAVA combate
 └─ Morte/retorno + XP/loot básico ← TRAVA loop

Balanceamento (só depois do loop divertido)
 ├─ Curva de XP / poder por nível
 ├─ Drop / Ouro por dungeon
 ├─ Custo e frequência de reset
 └─ Refinamento + materiais

Conteúdo / identidade (paralelo, não trava greybox)
 ├─ Nomes de classes/dungeons/biomas
 ├─ Skills de cada árvore
 ├─ NPCs / quests / narrativa
 └─ Arte, áudio, UI final
```

**Regra de produção:** não fechar tabela de XP antes de o loop de 10 minutos ser divertido em greybox. O GDD já diz isso no 28; vale repetir como critério de decisão.

---

## 3. Decisões que travam o greybox — resolver em 1–2 semanas

### 3.1 Controles (04)

| Pendência | Sugestão de decisão | Por quê |
|---|---|---|
| Teclas de movimento | WASD | padrão desktop web |
| Mouse | Clique = mover até o ponto (opcional); sem botão de ataque | ataque é auto; mouse não deve competir com posicionamento |
| Câmera fixa ou rotativa | **Começar fixa** (isométrica/superior ¾), sem rotação do jogador no protótipo | legibilidade de farm > liberdade; rotação vira otimização depois |
| Ortográfica vs perspectiva | **Perspectiva 3D leve** com FOV apertado (quase ortográfica) | o jogo é “3D no navegador”; orto puro muda a fantasia |
| Câmera em arenas diferentes | Mesma câmera em todas; só distância/offset por arena se a arena for grande | menos variável no protótipo |

**Pergunta para você (1 escolha):** câmera fixa ¾ ou o jogador rotaciona a câmera no protótipo?

### 3.2 Combate mínimo (06 + 07)

| Pendência | Sugestão mínima no protótipo |
|---|---|
| Arquétipos | 3: **Parado no spawn**, **Perseguidor**, **Longo alcance** (já descritos no texto) |
| IA | Parado: fica no raio do spawn. Perseguidor: aproxima até distância mínima e para. Ranged: mantém range e atira |
| Respawn | Timer simples por spawn (ex. 3–8s) ou onda a cada N segundos — **um** sistema só no protótipo |
| Dano/defesa/acerto/esquiva | Fórmula flat de protótipo (ex. dano = ataque − defesa/2; 5% esquiva base). Trocar depois |
| Boss | 1 boss opcional na dungeon 1 do protótipo, só para validar “encontro difícil” |

**Não** inventar 10 arquétipos agora. Validar 3 comportamentos vs posicionamento.

### 3.3 Dungeon de referência (10)

| Pendência | Decisão de protótipo |
|---|---|
| Nome/bioma | **Um** placeholder (“Dungeon de Teste” / greybox cinza) |
| Níveis | Faixa 1–20 na primeira |
| Arenas | 2–3 arenas conectadas, sem ramificação |
| Tamanho | O suficiente para 3–5 pontos de spawn visíveis |
| Transição | Portal/área de contato simples, sem cutscene |
| Item de entrada | **Nenhum** no protótipo (só a partir da 2ª dungeon de conteúdo) |
| Timer | 10:00 fixo |

### 3.4 Inventário mínimo (11)

| Pendência | Decisão de protótipo |
|---|---|
| Slots | 20–30 (chute controlado; ajustar com telemetria depois) |
| Empilhamento | Materiais empilham (99); equipamentos não |
| Loot cheio | Já definido no GDD: perde + avisa |

---

## 4. Decisões de sistema — fechar antes do 2º marco (após loop validado)

### 4.1 Progressão e economia (13 + 21)

Ordem de fechamento recomendada:

1. **Unidade de farm** (já fixa: 10 min). Definir alvo: quanto XP/Ouro um personagem “no ponto” da dungeon deve produzir em 10 min.
2. **Curva de XP** Mortal 1–400 em 8 dungeons (ex.: degraus por faixa de dungeon, não exponencial cega).
3. **Ouro**: fonte principal = farm + venda. Sumidouros = refinamento, reset, itens de entrada, loja.
4. **Reset**: manter +1.000 pts como baseline; definir **custo em Ouro** que faça reset acontecer a cada N horas de farm, não a cada login.
5. **Refinamento**: +1 a +10 no primeiro ciclo; materiais (Poeira de Ori/Lac) só a partir de +N.

**Fórmula de reset sugerida (hipótese para validar, não regra do GDD):**  
custo_reset ≈ 10 × (poder médio esperado do ciclo) em Ouro + 1 material raro.  
Frequência-alvo: 1 reset a cada 8–12h de farm eficiente no fim de cada etapa.

### 4.2 Skills e builds (12)

| Pendência | Sugestão |
|---|---|
| Nomes das 4 classes | Fechar **antes** de arte de UI; provisório TK/BM/HT/FM trava identidade |
| Identidade Controle/Magia/Física | Uma frase-teste por classe: o que o jogador faz de diferente |
| Skills das árvores | Protótipo: **1 skill por árvore** só. Conteúdo completo depois |
| Especialização | Limite fixo (ex. 40 pts) redistribuível com custo em Ouro |
| Livros | Item de drop raríssimo + compra cara na cidade |
| Requisitos entre skills | Linear 1→8 na árvore no v1 (mais simples que grafo) |

### 4.3 Itens e raridade (11)

Sugestão de escala (encaixa no texto, não contradiz):

| Tier | Nome provisório | Papel |
|---|---|---|
| 1 | Comum | base do farm |
| 2 | Incomum | atributo simples |
| 3 | Raro | 1 afixo |
| 4 | Épico | 2 afixos |
| 5 | Lendário | drop de boss / marco |

Ajustar nomes ao estilo visual quando arte fechar.

### 4.4 Cidade e NPCs (09 + 14)

Mínimo de NPCs do protótipo (não a lista final):

1. Entrada de dungeon  
2. Loja/venda  
3. Refinamento  
4. Atributos/skills (pode ser menu da cidade, sem NPC)  
5. Reset  

Quests e narrativa **não** entram no greybox.

---

## 5. Decisões que podem esperar (não bloqueiam protótipo)

| Bloco | Pendências | Quando resolver |
|---|---|---|
| Narrativa (17) | premissa, lore, motivação | depois do loop; 1 página basta |
| Arte (18) | estilo final, proporção, VFX | greybox primeiro; moodboard em paralelo |
| Áudio (19) | direção musical | 2–3 faixas placeholder |
| UI final (16) | HUD “bonito” | wireframe no protótipo; polimento na 3ª etapa |
| Quests/eventos (15) | estrutura, tipos, recompensas | 2ª etapa |
| Monetização (26) | free/paid, ads, IAP | **antes** de publicar em Poki; não trava dev |
| Acessibilidade (25) | escala UI, redução de efeitos | checklist mínimo no lançamento |
| Save (22) | IndexedDB + versionamento | 1 formato JSON versionado desde o dia 1 do protótipo |
| Técnico (23–24) | three.js vs Babylon, FPS, browsers | decidir na semana 0 do protótipo (uma escolha, não pesquisa eterna) |

**Recomendação técnica rápida:** three.js + vite + save JSON em IndexedDB. Não é dogma — é o caminho mais curto para web 3D desktop offline.

---

## 6. Perguntas que precisam da SUA palavra (uma resposta cada)

1. **Câmera:** fixa ¾ ou rotativa no protótipo?  
2. **Classes:** manter siglas WYD-like (TK/BM/HT/FM) ou renomear já?  
3. **Reset 1.000 pts:** confirmar como baseline de todas as etapas ou só Mortal?  
4. **Monetização:** free-to-play web (Poki-style) ou premium? Isso muda save e offline.  
5. **Escopo de lançamento:** 8 dungeons Mortal-only, ou já com entrada de Arch? (GDD diz 8 no lançamento — confirmar se Arch entra em patch.)  
6. **Estilo visual:** greybox cinza “bonito” ou gray + cores de gameplay (inimigo vermelho, drop dourado)? Afeta legibilidade no protótipo.

---

## 7. Plano de 2 sprints de design (sugestão)

**Sprint A — Fechar o greybox**  
Câmera/controles · 3 arquétipos de inimigo · 1 dungeon 3 arenas · inventário 24 slots · XP/Ouro flat de teste · 1 skill por árvore · save JSON.

**Sprint B — Loop sustentável**  
8 dungeons com faixas · curva de XP Mortal · Ouro + custo de reset · refinamento +1–+10 · raridades 5 tiers · loja/venda · HUD funcional · 4 classes jogáveis (skills stub).

Depois disso as pendências de arte/narrativa/quests param de ser “lista infinita” e viram backlog de conteúdo.

---

## 8. Crítica de design (o que eu mudaria no documento, se você autorizar)

1. **“Independente” vs evolução:** o texto de reset está claro, mas o capítulo de progressão ainda mistura “etapa” e “evolução” em alguns parágrafos. Vale um glossário canônico no 30 (já quase lá).
2. **Autofarm vs engajamento:** o GDD assume que parar e ver atacar é ok. Risco: sessão de 10 min sem input. Mitigação: posicionamento e escolha de spawn precisam ser frequentes o suficiente (validar no protótipo com telemetria de “tempo parado”).
3. **Inventário cheio = perder item:** regra honesta, mas hostil se o farm de 10 min encher sem o jogador perceber. Sugestão de UX: aviso a 80% + destaque no HUD — sem mudar a regra de perder.
4. **8 dungeons × 400 níveis:** ~50 níveis por dungeon se linear. Provavelmente degraus com repetição (ok), mas o documento deve ditar que a dungeon N continua relevante após o N+1 (já insinua “repetíveis” — tornar explícito).

---

## 9. Propostas aplicadas no GDD

Em 2026-09-10 os capítulos 04, 06, 07, 10 e 21 receberam a seção **Proposta de Design** com defaults de protótipo:

- **04** WASD + clique para mover; câmera fixa em três quartos; sem rotação no combate.
- **06** Dano mínimo 1; acerto 95% e esquiva 5%; boss do protótipo com a mesma fórmula e mais vida.
- **07** Três arquétipos (spawn fixo, perseguidor, longo alcance); respawn 3 a 8s; um boss opcional.
- **10** Dungeon de Teste 1–20 com 3 arenas; tabela proposta D1–D8 até o nível 400; itens de entrada só a partir de D4.
- **21** XP por degraus de dungeon; 1.000 pontos de reset em todas as etapas; reset a cada 8 a 12h de farm eficiente em Mortal.

As pendências restantes nesses capítulos cobrem confirmação, telemetria e conteúdo final. Arte, narrativa, quests e monetização seguem abertos de propósito.
