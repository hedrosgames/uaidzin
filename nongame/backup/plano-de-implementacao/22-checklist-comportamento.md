# 22 — Checklist de comportamento (loop Mortal)

Fonte: GDD `01`–`30`, `19-decisoes-confirmadas.md`, `32-auditoria-e-cobertura.md`, e o grill de 2026-10 com o Felipe.

Este arquivo **não** é backlog de implementação. É a tabela de **como cada sistema deve se comportar** no jogo. Quando o código e esta tabela divergirem, a tabela (GDD/19 + respostas do grill) define o alvo; o código é quem precisa se ajustar.

## Barra de pronto desta etapa

**Loop Mortal completo, jogável, sem smoke.**

```
Login → criar/carregar personagem → cidade Aurelion → preparação
  → escolher dungeon → entrar (timer 10:00) → farm → loot/equipar
  → tempo esgota OU morre → resultado → cidade
  → progressão / skills / loja / refine / reset
  → save → recarregar → continuar de onde parou
```

Fora da barra agora: smoke automatizado, conteúdo Arch/Cele jogável, arte final, quests longas, monetização, push para origin.

Escopo de conteúdo de lançamento permanece o corte do 19 §15: 8 dungeons Mortal, 4 classes, reset Mortal, Ouro, refine +0–+10, quests mínimas, save, HUD funcional.

---

## Tabela de comportamento por sistema

### 1. Boot, conta e personagem

| Ponto | Comportamento esperado |
|---|---|
| Abertura | Tela de login local (conta admin/admin no protótipo) + opção Google simulada; lembrar login guarda só o userId. |
| Sessão | Entrar exige sessão válida; sem sessão não vai para seleção de personagem. |
| Seleção | Lista slots do usuário; criar personagem escolhe classe (TK/FM/BM/HT) e nome; excluir limpa save + profile do slot. |
| Classe | Nome de produção: Thegn Knight / Frost Maiden / Beast Master / Huntress. Primary: TK=FOR, HT=DES, FM=INT, BM=INT (consistente com `class-definitions.ts`). |
| Primeira entrada | Cria personagem → cidade → personagem nível 1 com base da classe. Tutorial longo **não** é obrigatório nesta etapa. |

**Aceite no navegador:** login → seleção → cidade 3D aparece; personagem escolhido está no mundo.

### 2. Cidade Aurelion

| Ponto | Comportamento esperado |
|---|---|
| Hub único | Uma cidade 3D. NPCs de serviço: Guarda do Portal, Mercador, Ferreiro, Mestre de Skills, Sábio, Intendente, Mestre de Quests. |
| Interação | Aproximar + tecla E (ou clique) abre painel do NPC. Texto diegético só — sem tutorial de controle na UI. |
| Atalhos anunciados | I inventário, C personagem, K skills, B baú (junto do inventário), M/portal seleção de dungeon. Todo atalho **anunciado** tem que abrir o painel correspondente. |
| Fora da cidade | Painéis de cidade não ficam “mortos” em dungeon; fechar volta ao HUD de farm. |

**Aceite:** cada NPC abre o serviço certo; nenhum atalho da help-bar/UI está mudo.

### 3. Entrada em dungeon (uma porta só)

| Ponto | Comportamento esperado |
|---|---|
| Regra única | **Todo** caminho de entrada (portal da cidade, painel do Guarda, lista da wire) valida o **mesmo** gate. |
| Gate | Personagem precisa existir, estar na evolução com conteúdo (Mortal) e dentro da faixa de nível da dungeon. |
| Item de entrada | **Decisão DEC-1:** dungeons D4–D8 **não** pedem item. Gate é só nível/evolução. Itens `entry_d*` não existem no jogo. |
| Escolha | O jogador **escolhe** a dungeon entre as elegíveis da faixa atual. Não é “sempre a mais fraca da lista”. |
| Ori/Lac na entrada | Ao entrar em `dungeon-N`, a economia da sessão passa a tratar N como índice da run: Ori em D1–D4, Lac em D5–D8 e bosses. |
| Recusa | Toda recusa mostra motivo (missing / evolution / level / entry). Nenhuma porta falha em silêncio. |
| Evolução sem conteúdo | Enquanto não houver dungeon Arch/Cele, evoluir fica **bloqueado com aviso explícito** (“Conteúdo de Arch ainda não disponível”). |

**Aceite:** escolher D5 na lista com personagem nível 200+ entra em D5; o drop de material da run é Lac; personagem nível 10 não consegue entrar em D8 (mensagem, sem teleport).

### 4. Run de dungeon (10 minutos)

| Ponto | Comportamento esperado |
|---|---|
| Timer | **Exatamente 10:00** por entrada. Não pausa entre arenas. Timer zera → conclusão por tempo. |
| Arenas | Sequência pré-definida de arenas conectadas. Sem procedural, sem escolha de caminho. |
| Layouts | As 8 dungeons Mortal **não** são clones idênticos: arenas/spawns variam por faixa (D1 preservada como referência). |
| Faixas (provisórias de conteúdo) | D1 1–40 · D2 35–90 · D3 80–150 · D4 140–220 · D5 200–280 · D6 260–330 · D7 310–370 · D8 350–400. Sobreposição é intencional. |
| Morte | Volta à cidade. **Recursos já obtidos não são perdidos.** |
| Fechar aba / recarregar | Regra do protótipo: personagem volta à **cidade** com o que a sessão já creditou. Autosave vale em CITY **e** DUNGEON. |
| Boss | **1 boss por dungeon** (entrada). Não é fazenda infinita. Drop **raro** (não garantido). Boss fica na arena (leash), não persegue a dungeon inteira. Respawn de boss **não** deve reabrir farm contínuo na mesma run. |
| Inimigos comuns | Três arquétipos: spawn fixo, perseguidor, longo alcance. Respawn comum 3–8s (provisório). Sem escalonamento automático com o nível do jogador. |

**Aceite:** 10 minutos de farm sem crash; ao morrer ou ao timer zerar, volta à cidade com gold/XP/itens da run; um boss por entrada; D5+ na run dropa Lac quando dropa material.

### 5. Combate

| Ponto | Comportamento esperado |
|---|---|
| Ataque básico | Sempre automático, definido pela **arma** equipada (alcance e intervalo). |
| Movimento | **Não ataca enquanto se move.** Movimento efetivo (não a intenção de tecla) bloqueia ataque/skill. Encostar na parede **não** desliga o combate. |
| Controles | WASD move; clique esquerdo move até o ponto; sem botão de ataque básico; skills nas teclas 1–4 ou HUD. |
| Câmera | Fixa em ¾, segue o personagem. Sem rotação de câmera no combate. |
| Acerto/erro | Fórmula de chance (base 95% acerto / 5% esquiva, provisório). **Errar é visível** (feedback MISS), não silêncio. |
| Dano | `max(1, ataque − defesa)` enquanto fórmula provisória. |
| Autofarm | Combate no lugar. **Personagem não anda sozinho.** |
| Input | Digitar em campo de texto/chat não move o personagem nem dispara skill. |
| Skills manuais | Apertar o slot só lança **aquela** skill se estiver pronta. Slot em cooldown **não** troca por outra auto. |
| Skills auto | Por padrão skills são auto; cada skill pode ser marcada manual. |
| Morte no combate | Uma morte por frame — o loop não reexecuta morte múltipla. HUD não congela sem explicação no resultado. |

**Aceite:** parado ataca, andando não; W contra parede continua atacando se não houver deslocamento; errar mostra MISS; skill 3 em CD não lança skill 1.

### 6. Progressão e atributos

| Ponto | Comportamento esperado |
|---|---|
| XP | Kill concede XP. Level sobe enquanto houver XP e o teto da etapa permitir. |
| Pontos | **5 pontos de atributo** por nível. |
| Atributos | FOR, DES, CONS, INT. Primary da classe soma ataque (e HP no caso de CONS) conforme `data/balance/combat.ts`. |
| Teto | Mortal 1–400. Arch 1–400 e Cele 1–200 existem na estrutura, **fora do conteúdo de lançamento**. |
| Equip vs base | Bônus de equipamento **não é apagado** por subir de nível nem por reload. Total = base(atributos) + equipamento. Desequipar volta exatamente ao base. |
| Evolução | Só com nível máximo da etapa **e** conteúdo de destino. Sem conteúdo → bloqueio com motivo. Ao evoluir (quando houver): nível 1 da etapa nova, reset de ciclo. |
| Feedback | Level up visível na HUD; pontos pendentes até o jogador distribuir. |

**Aceite:** equipar espada + dano sobe; subir de nível não zera o bônus; recarregar com item equipado mantém o bônus.

### 7. Reset

| Ponto | Comportamento esperado |
|---|---|
| Quando | Só no **nível máximo** da etapa atual (Mortal 400 nesta etapa). |
| Remove | Nível, atributos distribuídos, **skills e pontos de skill do ciclo**. |
| Mantém | Equipamentos, refinamentos, inventário, evolução atual, livros. |
| Recompensa | **+1.000 pontos de atributo** (baseline todas as etapas). |
| Contagem | Reset **não** carrega contagem para a etapa seguinte. `resetsInEvolution` zera ao evoluir. |
| Custo (estrutura) | Ouro proporcional à faixa + material raro a partir do 2º reset. Valores exatos são provisórios em `data/balance/`. |
| Frequência-alvo | ~1 reset a cada 8–12h de farm Mortal eficiente (provisório de design). |

**Aceite:** reset em 400 → nível 1 Mortal, 0 skill aprendida no loadout, +1000 pts não gastos, equip/refine/inventário intactos.

### 8. Skills e builds

| Ponto | Comportamento esperado |
|---|---|
| Árvores | 3 árvores por classe (controle / magia / física) × 8 skills + árvore comum por livros. |
| Aprendizado | 1 ponto de skill por nível; teto inicial 10 por skill; pré-requisito linear (skill anterior ≥ 1). |
| 8ª skill | Só em **uma** das três árvores (especialização de conteúdo). |
| Especialização | 60 pts total, máx 40 na mesma árvore; redistribuível com custo em Ouro. |
| Loadout | Até 4 skills na hotbar; auto/manual por slot; preferências persistem no save. |
| Livros | Drop raríssimo ou compra cara. **Livros não se perdem no reset.** |
| Conteúdo | Nomes/multiplicadores atuais das skills são placeholder de estrutura. Comportamento “funciona” = aprender, lançar, gastar MP, cooldown, reset limpar. Identidade de efeito por classe é backlog de conteúdo. |

**Aceite:** gastar ponto aprende; 8ª skill trava a segunda árvore; reset zera árvore; hotbar dispara a skill pedida.

### 9. Loot, inventário e equipamento

| Ponto | Comportamento esperado |
|---|---|
| Destino | Loot vai **direto ao inventário**. Sem item no chão. |
| Capacidade | **40 slots**. Materiais empilham até **999**. Equipamentos não empilham. Ouro não ocupa slot. |
| Inventário cheio | **Perde o item** e informa o jogador. Aviso a 80% de ocupação (UX; a regra de perda não muda). |
| Raridades | Comum → Incomum → Raro → Épico → Lendário (5 tiers). |
| Slots de equip | Cabeça, Armadura, Arma, Anel 1, Anel 2, Colar, Brinco (7). |
| Equipar | Move do inventário para o slot; troca devolve o anterior; bônus recalculado pelo total equipado. |
| Venda | Vende por `sellValueByRarity` em Ouro. |
| Drop de material | Ori em runs D1–D4; Lac em D5–D8 e boss. Chance de material provisória (`data/balance/economy.ts`). |
| Drop de equip | Chance comum por kill; boss com chance **baixa/rara** — nunca garantido (expectativa do grill). |
| Cofre da conta | Ouro/itens podem ir ao vault da conta; escritas de personagem e cofre não podem se sobrescrever em corrida. |

**Aceite:** farm cheio avisa e perde; equipar/vender/refinar mexe nos números certos; D5 dropa Lac, D2 dropa Ori.

### 10. Refinamento e economia

| Ponto | Comportamento esperado |
|---|---|
| Faixa | **+0 a +10**. |
| Falha | **Não destrói** o item (decisão travada). |
| Custo | Ouro + Poeira de Ori até +5; Poeira de Lac de +6 a +10. |
| Fonte de Ouro | Drop, venda, quests mínimas. |
| Sumidouros | Refine, reset, livros, redistribuição. |
| Moeda | **Só Ouro.** Sem premium, sem ads, sem IAP no lançamento. |
| Loja | Catálogo e preços em `data/balance/economy.ts`. Mudar preço no dado muda o jogo; HTML não é dono de preço. |
| Troca entre jogadores | Não existe. |

**Aceite:** +1 com Ori+Ouro; +6 exige Lac; falha perde material/Ouro mas o item segue +N anterior; sem outra moeda na UI.

### 11. HUD e feedback

| Ponto | Comportamento esperado |
|---|---|
| Barras | HP/MP/XP do personagem sempre visíveis em jogo. |
| HP world bar | Personagem e inimigos: **verde ≥ 40%**, **vermelho &lt; 40%**. |
| Timer | Contagem regressiva da dungeon; urgência visual abaixo de 30s. |
| Farm stats | Kills / XP da run / dica de arena (conteúdo diegético). |
| Toasts | Loot, level, recusa de dungeon, refine, erros relevantes. Level up **não** apaga o que dropou sem o jogador ver. |
| Skills | Hotbar com cooldown legível; 4 slots. |
| UI style | Paleta C Salão/Brasa; moldura A; zero emoji; zero texto de mockup/tutorial; escudo só em CTA de Entrar / empty-state de Criar Personagem. |

**Aceite:** em dungeon dá para ler HP, tempo, skills e o último loot sem abrir menu.

### 12. Save e persistência

| Ponto | Comportamento esperado |
|---|---|
| Backend | Sem servidor. IndexedDB principal; LocalStorage só preferências/espelho. |
| Formato | JSON versionado (`saveVersion`) + migrações. |
| O que grava | Personagem (nível, attrs, evolution, hp/mp), ouro, inventário, equipamento, skills/loadout, bags, buffs, progresso de dungeons/quests. |
| Save ilegível | **Avisa e não sobrescreve** o blob. Não vira personagem novo em silêncio. |
| Reload na dungeon | Cidade + recursos creditados da sessão (regra simplificada do protótipo). |
| Cofre vs save | Operações que tocam cofre e personagem não podem clobberar o outro. |
| UIDs | Itens estáveis após reload (seq adotada do maior uid do save). |
| Export/import | `.json` com confirmação (quando exposto na UI). |
| Criptografia | Envelope AES-GCM quando `crypto.subtle` existe; XOR só em `file://`. |

**Aceite:** jogar → fechar aba → reabrir → mesmo gold/nível/itens; save corrompido avisa e mantém cópia; drop após reload não duplica uid.

### 13. UI de painéis (wire) vs gameplay

| Ponto | Comportamento esperado |
|---|---|
| Papel da wire | Layout aprovado do lab de estilo. Deve falar com os **dados reais** da sessão/save — não mock permanente. |
| Dados do domínio | Preço, custo de skill, catálogo, faixas de dungeon e regras de gate vêm do jogo (`data/` + `domain/`), não de fallback embutido no HTML. |
| Dual UI | Não devem existir duas UIs vivas para o mesmo painel em produção do loop Mortal. O que o jogador abre tem que bater com o save. |
| Conteúdo diegético | Painéis mostram o que o personagem/jogador lê no mundo (nome, status, custo, descrição). Sem legenda de mockup. |

**Aceite:** mudar ouro no save muda a loja/mestre de skills na wire; lista de dungeon da wire reflete as faixas reais do jogo (sem `entry_d*` fantasma).

### 14. Build, stack e higiene mínima

| Ponto | Comportamento esperado |
|---|---|
| Stack | HTML/CSS, TypeScript, Vite, Three.js, glTF/GLB, IndexedDB. Sem backend, sem multiplayer, sem ECS obrigatório. |
| Comando de dev | `cd game && npm run dev` → `http://127.0.0.1:5173`. |
| Typecheck | `npm run typecheck` limpo ao fechar mudança de código. |
| Build | `npm run build` publica estático; build **falha alto** se `visual/telas` faltar (a UI do wire é fonte, não opcional). |
| Produção numérica | Números provisórios vivem em `game/src/data/balance/*`, nunca hardcoded em service/UI. |
| Debug API | Só em DEV ou com `__UAIDZIN_DEBUG__`. |
| Código | Sem comentário de humano; sem emoji em UI; sem `console.log` de debug; sem CSS/JS morto. |
| Docs | Nenhum comando/feature documentada que não exista no repositório. |
| Git | Trabalho local pode acumular; push para `origin/main` é passo separado e consciente. |

**Aceite desta etapa (sem smoke):** typecheck limpo + jogo sobe + loop Mortal completo jogado à mão na régua acima.

---

## Loop de regressão manual (obrigatório ao fechar etapa)

Rode isto à mão, sem atalho de debug obrigatório:

1. Login admin → selecionar/criar personagem TK.
2. Cidade: abrir C, K, I, B e o Guarda do Portal.
3. Entrar na dungeon elegível mais alta da faixa.
4. Farmar: matar, ver MISS/hit, loot, gold, XP subindo.
5. Equipar um item com bônus; confirmar dano/defesa.
6. Gastar ponto de skill; lançar manual e auto.
7. Matar o boss da run uma vez; não esperar boss infinito.
8. Esperar timer ou morrer → cidade com recursos.
9. Subir de nível até onde der nesta sessão; distribuir atributos.
10. Se houver personagem 400: reset → skills zeradas + 1000 pts + patrimônio intacto.
11. Fechar a aba; reabrir; confirir gold/nível/itens/skills.
12. Entrar em D5+ com faixa ok e confirmar Lac no drop de material (quando dropar).

---

## Decisões travadas que o checklist assume

| # | Decisão |
|---|---|
| DEC-1 | D4–D8 sem item de entrada; gate por nível/evolução. |
| DEC-2 | Evolução sem conteúdo bloqueia com aviso honesto. |
| DEC-3 | UI de fallback `GamePanels` não é o alvo — a wire com dados reais é. |
| DEC-4 | `game-config.json` / editor de config morto fora do jogo. |
| Grill | Boss = **1 por dungeon**, drop **raro**, Lac **só D5+**. |
| Grill | Pronto desta etapa = **loop Mortal completo, sem smoke**. |

## O que esta tabela não decide

- Valores finais de XP/Ouro/drop/HP/dano/cooldown/custo de reset (ficam provisórios em `data/balance/`).
- Nomes finais de skills, inimigos, biomas, dungeons.
- Estética final de VFX, áudio e narrativa.
- Quando dar push em `origin/main`.
- Conteúdo jogável Arch/Cele.

---

## Mapa rápido: sistema → onde olhar no código

| Sistema | Principal caminho |
|---|---|
| Orquestração | `game/src/app/GameApp.ts`, `CityGameSession.ts` |
| Loop dungeon | `CityGameSession.tryEnterDungeon` / `enterWorld` / `DungeonRun` |
| Combate | `domain/combat/*`, `gameplay/PlayerRuntime.ts` |
| Progressão/reset | `domain/progression/ProgressionService.ts`, `domain/skills/SkillTreeService.ts` |
| Equipamento | `domain/items/EquipmentService.ts`, `CharacterModel` |
| Economia/loot | `domain/economy/EconomyService.ts`, `data/balance/economy.ts` |
| Refine | `domain/items/RefinementService.ts` |
| Dungeons | `data/dungeons/dungeons-mortal.ts` |
| Save | `persistence/SaveVault.ts`, `SaveStore.ts`, `CityGameSession.persistSave` |
| UI wire | `visual/telas/03-wire-paineis-cidade.html`, `ui/WireUi.ts` |
| Decisões | `plano de implementação/19-decisoes-confirmadas.md` |
