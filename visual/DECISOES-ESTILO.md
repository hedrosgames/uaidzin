# Decisões de Estilo UI

Fonte: revisão de `visual/ui-style-gallery.html` (2026-10).  
Este arquivo tranca o visual da interface. Implementação segue aqui; não inventar variação sem atualizar esta página.

**Handoff completo para criar qualquer tela nova (IA):** `visual/ART-STYLE-HANDOFF.md` — inventário de UIs, tokens, componentes, assets 2D/3D e checklist.

## Identidade visual

**Nórdico medieval de salão** — ferro trabalhado, bronze quente, runas de gelo em dungeon, vermelho de forja só em perigo/boss.  
Não é fantasy cartoon. Não é sci-fi clean.

## Decisões aprovadas

### Molduras

| Uso | Estilo | Classe |
|---|---|---|
| **Principal** (painéis, modais, telas) | **A** — ferro com cantos dourados | `.f-iron` |
| **Secundário** (tooltips, cards de NPC, flavortext) | **D** — couro, com parcimônia | `.f-leather` |

Couro **não** entra em HUD de combate nem em slots de inventário.

### Botões

- **Padrão do jogo: retângulo** (`border-radius: 2px`). É o formato default de toda ação.
- **Escudo** (`btn-shield`) tem uso restrito: **somente** o CTA de Entrar no login. Não entra em hub, modais, toolbars, HUD nem outras telas.
- Cores aprovadas do lab:
  - **Ouro** — ação primária (Entrar, Confirmar, Evoluir).
  - **Ferro** — ação neutra (Continuar, Fechar, Cancelar).
  - **Perigo reto** — reset/excluir (retângulo vermelho, sem escudo).
  - **Frost** — skills / magia.
  - **Ghost** — cancelar/secundário.
- Em toolbars e listas, sempre retângulo iron/gold/perigo.

### Login com Google

- Botão secundário: corpo **ferro sólido**, retângulo simples (`border-radius: 2px`). **Não** repetir a silhueta de escudo do Entrar.
- Ícone: G original do Google em **fill gold** (`#d4a017`), monocromático. Sem cores de marca, sem selo decorativo.
- Label em caixa alta, igual aos outros botões do jogo.

### Botões secundários (Fechar, Cancelar)

- Mesmo corpo do primário small (ferro sólido, retângulo `border-radius: 2px`), texto `--ink-dim`.
- **Não** usar `clip-path` de escudo em botão ghost/transparente — fica frágil e torto.
- **Não** repetir escudo fora do login. Hub de personagem, modais e opções usam retângulo.

### Inventário e skills

- Grid de slots aprovado (quadrado, moldura iron, glow por raridade).
- Skill HUD com **anel de cooldown** aprovado.
- **Nunca emojis.** Ícone sempre **PNG ou SVG**. Placeholder em desenvolvimento usa SVG inline, não caractere emoji.
- Rodapé da bolsa (`#p-inv`): **Lixeira** + **Organizar** + **Armar** lado a lado; ícone dentro do botão 40×40; **legenda fora, abaixo** do quadro; espaçamento largo entre os botões.
- Organizar: compacta slots vazios e ordena por raridade (Lendário→Comum), depois nome, depois refine.
- Armar: veste o melhor item por slot (comparando bolsa + doll), critério raridade → refine → soma de stats; anéis pegam os dois melhores.
- Corpo dos painéis (`.win-b`): padding topo `14px` — texto não cola nos cantos ouro.

### Raridades

| Nomenclatura | Cor de borda/texto |
|---|---|
| Comum | `#8b9aab` |
| Incomum | `#3d8b4a` |
| Raro | `#3b7dd4` |
| Épico | `#8b4ac9` |
| Lendário | `#c9a227` (+ glow) |
| Mítico | `#d45555` (+ glow) |

### HUD da dungeon

Layout aprovado: HP · timer 10:00 · skills centrais · ouro · mini-log.

**Correção travada:** barra de vida da HUD **não é a única**.

- Barra de vida **em world space** sobre o personagem **e** sobre inimigos.
- HP do jogador e inimigos: **verde** enquanto vida ≥ 40%; **vermelho** abaixo de 40%.
- A barra de canto da HUD (se mantiver) espelha o HP do jogador com a mesma regra de cor.

### Toasts

Aprovados: loot (ouro), aviso (perigo), info (level up). Esquerda colorida + ícone SVG.

### Tipografia

| Papel | Fonte |
|---|---|
| Display (títulos, nomes de item lendário) | Georgia / Palatino, serif |
| UI (botões, labels) | Segoe UI / system-ui, sans |
| Números (HP, ouro, timer) | ui-monospace / Consolas |
| Runas (ornamento, skills flavor) | Elder Futhark (ᚠᚢᚦᚨᚱᚲ…) |

### Paleta — **C · Salão / Brasa** (aprovada)

| Token | Hex | Uso |
|---|---|---|
| `--bg0` | `#100c08` | fundo profundo |
| `--bg1` / madeira | `#241c14` | superfícies de painel |
| `--gold` | `#d4a017` | acento primário, ação, raridade lendária |
| `--blood` | `#a33b3b` | perigo, reset, HP crítico |
| `--ink` | `#f0e6d0` | texto principal (creme quente) |

Frost (`#5b9fd4`) e verdigris ficam **como acento de sistema** (skills mágicas, runas, dungeon fria), não como base.

### Materiais

| Material | Status |
|---|---|
| Ferro | **Aprovado** — molduras, botões, HUD |
| Bronze / ouro | **Aprovado** — acentos, raridade, CTA |
| Couro | **Opcional** — só em contextos de salão/NPC; não em HUD de combate |

### Ornamentos

Divisórias, knotwork central e cantos SVG aprovados. Alguns SVGs do lab ainda precisam de limpeza de path — ideia travada, desenho a refinar.

### Símbolos / runas

**100% aprovados.** Elder Futhark é o alfabeto de ícones de skill, escolas e tabs. Glifos a 22px com glow frost ou gold.

## Em aberto (precisa de novo lab)

- Cards de item e de classe — opções atuais reprovadas.
- Lista de dungeons e tela de resultado — refinar hierarquia e loot.
- Ícones finais de skill (wire ainda usa placeholders SVG).

## Próximos passos de UI no jogo

1. Aprovar/reprovar o wire `03-wire-paineis-cidade.html` rodando overlay no Vite.
2. Ligar painéis aos dados reais da sessão (progressão, inventário, hotbar, baú).
3. Remover `GamePanels` legado após o layout aprovado estar wired.
4. HUD dungeon + HP world bar no runtime.

## Classes (nomes paralelos WYD)

| Código | EN (sigla) | PT-BR | WYD original |
|---|---|---|---|
| TK | **Thegn Knight** | Cavaleiro Thegn | TransKnight |
| FM | **Frost Maiden** | Donzela Glacial | Foema |
| BM | **Beast Master** | Mestre das Feras | BeastMaster |
| HT | **Huntress** | Caçadora | Huntress |

Sigla precisa significar algo. UI em PT-BR usa o nome PT; código/EN usa o nome que forma a sigla.

## Save local (protótipo)

- Conta padrão: **admin / admin** (criada no primeiro boot).
- Senha com PBKDF2-SHA256 (100k) + salt por conta.
- Slots e profiles em envelope **AES-GCM-256** quando há `crypto.subtle` (HTTP do Vite); XOR só em `file://`.
- Hub: `game/public/boot/assets/save-store.js`. Gameplay: `SaveVault` (`game/src/persistence/`).
- Chave derivada da senha; material só no `sessionStorage` da sessão.
- Criar/excluir personagem regrava o save da conta; excluir limpa o profile (IDB+LS).
- Lembrar login: só `userId` (nunca senha).
- Contrato: `22-saves-e-dados.md`. Wipe: `/tools/save-wipe.html`.
- Sem backend. Em produção, mover hash/servidor e não exportar a chave no cliente.

## Telas prototipadas

| Tela | Arquivo | Nota |
|---|---|---|
| Login | `visual/telas/01-login.html` | Aprovado: G gold, engrenagem, sem flavor, → seleção |
| Seleção de personagem | `visual/telas/02-selecao-personagem.html` | Fogueira, 16:9, criar/excluir, stats completos, sem botão Criar na barra |
| Painéis cidade C/K/I + Baú + shells NPC | `visual/telas/03-wire-paineis-cidade.html` | Wire no gameplay via `WireUi`; Baú/Loja abrem com inventário; Mercador=Ferreiro (`#p-shop`); shells portal/skills/sábio/quests |

## Auditoria de pedidos (2026-10)

| Pedido | Status |
|---|---|
| Lab 50+ estilos | Feito |
| Doc de decisões + GDD | Feito |
| Login (salvar, Google, erros, opções) | Feito |
| Botão Google gold / retângulo | Feito |
| Sem flavor de mockup | Feito |
| Hub fogueira estilo WYD | Feito |
| Banner animado / nichos (sem janela) | Feito |
| Zoom centralizado | Feito |
| Opções = login | Feito |
| Criar / Excluir | Feito |
| Stats completos + skills | Feito |
| Criar/Excluir só com seleção | Feito |
| 16:9 sem quebrar o frame | Feito |
| Escudo só no login + empty state | Feito |
| Nomes classes (Thegn/Frost/Beast/Huntress) | Feito |
| Cards de item e classe | **Aberto** |
| Telas compostas (personagem, dungeons) | Wire C/K/I + Baú NPC no jogo (**em validação**); dungeons ainda aberto |
| Resultado de dungeon | **Aberto** |
| HUD dungeon + HP world bar no jogo | **Aberto** (regra travada, sem tela final) |
| Ouro máximo | **2.000.000.000** (`ECONOMY_BALANCE.goldCap`) |

## Regras duras

1. Zero emoji na UI do jogo (labels, slots, toasts, HUD).
2. Paleta base é a C; não misturar paletas na mesma tela sem motivo de bioma.
3. Moldura A é o default de qualquer painel novo.
4. Ícone de skill legível a 32px.
5. HP world bar: verde ≥ 40%, vermelho &lt; 40%.
6. **Só conteúdo do jogo.** Sem flavor de protótipo ("aguarda no portal", "persiste no dispositivo", "tela de demonstração"). Texto de UI fala o que o sistema faz ou o que existe no mundo — nada de legenda de mockup.
7. Ícone de settings/engrenagem: path sólido legível a 18px, não o wireframe fino de “raios de relógio”.
8. **Sem comentário no código** (ver `AGENTS.md`). Directive de compilador é a única exceção.
9. Polimento antes de `done`: sem debug log, sem arquivo temporário, sem CSS/JS morto.
10. **Texto da UI não selecionável.** No reset de `html, body`: `user-select: none` (+ `-webkit-user-select` / `-webkit-touch-callout`). Exceção só `input` / `textarea` / `[contenteditable]`. No jogo Vite a regra global em `game/src/style.css` herda para qualquer UI futura sob `#app`.
