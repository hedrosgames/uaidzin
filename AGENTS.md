# AGENTS.md — UAIDZIN

Jogo RPG de farm 3D no navegador (Three.js + Vite + TypeScript). Código em `game/`. Documentação ativa indexada em `nongame/docs/project/INDEX.md`; material antigo em `nongame/backup/`.

**Mapa de código (se existir, local):** `CODEGRAPH.md`.  
**Estilo/UI:** `nongame/docs/visual/DECISOES-ESTILO.md` + `nongame/docs/visual/ART-STYLE-HANDOFF.md`.  
**Design do jogo:** `nongame/docs/project/DECISOES-DESIGN.md` (grill — prevalece sobre o GDD em conflito).  
**Navegação da doc:** `nongame/docs/project/INDEX.md`. Não copiar planos para cá.  
**Fluxo de trabalho:** usar a task list da sessão; a documentação operacional está em `nongame/`.

## Idioma

- Prosa, GDD, commits e respostas ao Felipe em **português do Brasil**.
- Frases diretas, substantivo concreto. Sem “vamos agora”, sem bullet que repete o título.

## Ordem de leitura antes de mexer

1. `nongame/docs/project/INDEX.md` — onde está o que.
2. `nongame/docs/project/DECISOES-DESIGN.md` — o que o jogo faz.
3. `nongame/docs/project/TAREFAS-ABERTAS.md` + `nongame/docs/project/CHECKLIST-CENAS.md` — o que falta e o aceite do item.
4. Código/protótipo que a task toca.
5. `nongame/docs/visual/DECISOES-ESTILO.md` se a entrega tiver UI.

Não implementar a partir de `nongame/backup/` sem cruzar com design + checklist atuais.

## Código — sem comentários (regra dura)

**Nunca escrever comentário no código** deste projeto (TypeScript, JS, CSS, HTML inline).

- Sem `//`, sem `/* */`, sem `<!-- -->` de explicação.
- Nome de função/variável e estrutura carregam o significado. Se precisa de comentário para entender, refatora.
- Exceção única: **directives do compilador** (`/// <reference types="vite/client" />`).
- Antes de `done`, limpar lixo: `game/scripts/_strip-comments.mjs` (ou à mão).
- `tsc --noEmit` (`npm run typecheck` em `game/`) precisa passar depois de limpar.

### Polimento ao fechar task de código

1. Zero comentários no diff.
2. Sem `console.log` de debug esquecido.
3. Sem arquivo temporário (`_test-*`, `_*-debug*`, screenshot morto).
4. Sem CSS/JS morto.
5. Sem emoji em UI.

## Painel de tarefas (obrigatório)

Mudança com 2+ passos ou pedido do Felipe vira **task no painel** (`task` create / start / done).

1. Registrar **antes** de mexer no código.
2. `start` imediatamente antes de executar.
3. `done` só com resultado **testado**. Falhou → `block`, nunca `done`.
4. Pedido novo no meio: task nova; não enterrar em outra.
5. Ao fechar o turno, o painel bate com o que está em andamento.

## Como preencher a doc **durante** a execução (sem virar plano novo)

Os arquivos de planejamento já existem. **Não** recriar planos nem colar o plano no AGENTS. Enquanto executa:

| Quando | O que atualizar |
|---|---|
| Task criada / em curso | Painel MiMo; opcionalmente nota curta na linha da tarefa em `nongame/docs/project/TAREFAS-ABERTAS.md` (Estado / bloqueio) |
| Código entregue e testado | Mover o ID em `nongame/docs/project/TAREFAS-ABERTAS.md` de **Aberto** → **Aguardando validação do Felipe** (ou **Feito** só depois que ele validar, se for UI/comportamento visível) |
| Item do aceite passou | Marcar `[x]` na linha certa de `nongame/docs/project/CHECKLIST-CENAS.md` (ID espelha a tarefa: L/S/C/D/E/I/X) |
| Felipe muda regra de jogo | Atualizar `nongame/docs/project/DECISOES-DESIGN.md` e a linha afetada do checklist/tarefa — não deixar só no chat |
| Felipe pede tarefa nova | Linha nova em `nongame/docs/project/TAREFAS-ABERTAS.md` + seção/item em `nongame/docs/project/CHECKLIST-CENAS.md` se tiver aceite de jogador |
| Fase do grill fechou (DoD) | Marcar na grill da fase em `nongame/docs/project/PLAN-DEV-GRILL.md` (`[x]`) — sem reescrever o plano |
| Doc saiu/entrou na raiz | `nongame/docs/project/INDEX.md` |
| UI aberta / espelho humano | `nongame/docs/visual/TODO.md` |

Regras de escrita nesses arquivos:

- IDs estáveis (`L3`, `C21`, `D5`…). Não renomear ID sem avisar.
- Checklist = **comportamento observável** (“aparece X”, “não trava Y”). Tarefa = **trabalho**. Design = **regra**.
- Não inventar número de balance. Se o grill/GDD não tiver, marcar **provisório** e a fonte.
- Conflito GDD × `nongame/docs/project/DECISOES-DESIGN.md` → **design do grill vence**; anotar no checklist se o código ainda segue o GDD antigo.
- Não commitar nem “fechar” doc como se o Felipe tivesse validado sem ele ter validado.

## Como fazer UI

Fonte visual: `nongame/docs/visual/DECISOES-ESTILO.md` + `nongame/docs/visual/ART-STYLE-HANDOFF.md`. Fonte de comportamento: `nongame/docs/project/DECISOES-DESIGN.md`.

### Travas de UI

| Regra | Valor |
|---|---|
| Paleta | **C · Salão/Brasa** — `#100c08` / `#241c14` / `#d4a017` / `#a33b3b` / `#f0e6d0` |
| Moldura principal | A — ferro + cantos ouro |
| Escudo (`clip-path`) | **Só** CTA Entrar no login e empty-state “Criar Personagem” |
| Demais botões | Retângulo `border-radius: 2px` |
| Emoji | **Proibidos** — só PNG/SVG |
| Arte de classe | PNG alfa oficiais `TKpng` / `FMpng` / `BMpng` / `HTpng` |
| HP (inimigo e world bar) | Verde ≥ 40%, vermelho &lt; 40% |
| HP no hub | Preferir **frame da UI** (world bar não é obrigatória na cidade) |
| Texto de UI | Só conteúdo do jogo |
| Tutorial na UI | **Proibido**, exceto **Sábio** (única exceção: tutorial + codex) |
| Seleção de texto | `user-select: none`; exceção em `input` / `textarea` / `[contenteditable=true]` |
| Nomes de classe | TK Thegn Knight · FM Frost Maiden · BM Beast Master · HT Huntress |
| pt-BR | Acentos e símbolos corretos; sem acento reprova |
| Painéis C/K/I | Mesmos atalhos na cidade **e** na dungeon |

### Comportamento de UI (design)

- UI **não mente**: classe, nome, atributos, skills, ouro vêm do **save** — nunca de mock.
- Personagem novo: **5/5/5/5**, **0 ouro**, sem equip, skills zeradas; nome **3–12** letras sem número/símbolo; nome **não repete** entre contas.
- Sábio **não** abre skill/equip — só tutorial/codex. Build/skills por atalho **K** (e NPC próprio se o design pedir).
- Item sem ícone **não** entra em lista de jogo.
- Log de drop na dungeon: canto **inferior esquerdo**, lista tipo log. Sem tela de resultado cheia.
- Click longe em NPC: anda e abre a UI ao chegar. Click-to-move **nunca** fica “andando no lugar”.
- Toggle “não perguntar mais”: visual no jogo + Settings para restaurar.

### Protótipos em `visual/telas/`

- HTML **standalone**: `lang="pt-BR"`, CSS inline, cores em `:root`, sem CDN/bundler.
- Assets em `visual/telas/assets/`.
- Palco **1600×900** com `scale` via JS; letterbox preto no `.viewport`.
- Login → seleção exige sessão (`UaidzinSave.requireSession()`).
- Reset CSS com anti-seleção (regra da tabela acima).
- Fluxo pós-Entrar no runtime usa os boot em `game/public/boot/`.

### Handoff UI → jogo

Wire aprovado em `visual/telas/` vira runtime em `game/public/boot/` ou `game/src/ui/` (ex.: `WireUi.ts`). Não criar UI paralela “de mentira” no jogo se o protótipo já é a fonte — portar e ligar aos dados reais.

## Save e sessão

- Hub protótipo: `game/public/boot/assets/save-store.js`. Runtime: `SaveVault` em `game/src/persistence/`.
- Contrato de dados: `nongame/gdd/22-saves-e-dados.md` **cruzado** com `nongame/docs/project/DECISOES-DESIGN.md` (bolsa por personagem + baú da conta; excluir char não toca o baú).
- Conta de lab: **admin / admin** no `bootstrap()`.
- Lembrar login: **só o userId**.
- Envelope AES-GCM quando há `crypto.subtle`; XOR só em `file://`.
- Wipe: `http://127.0.0.1:5173/tools/save-wipe.html` e `__UAIDZIN__.save.wipe*`.
- Em run de dungeon, o design pede gravar o que o jogador ganhou (XP/ouro/item) quando fizer sentido — alinhar com o doc de save/load quando existir.

## Jogo (Vite)

```text
cd game
npm run dev          # http://127.0.0.1:5173
npm run typecheck
```

- Lab de modelos (**dev only, fora da build**): `http://127.0.0.1:5173/model-lab.html` — aba **Personagens** (4 classes, troca de arma entre os 9 conjuntos, troca de animação em conjunto, card que abre em tela cheia para ajustar o encaixe da arma por slider/arraste) e aba **Monstros** (cards por monstro do `monsters.json`, animações quando existir GLB de malha).
- Ajuste de arma grava em `game/src/data/weapons/weapon-mounts.json` pela rota dev `POST /api/dev/weapon-mounts` (`configureServer` do `vite.config.ts`; sem build). O runtime ainda **não** consome esse arquivo — `WeaponRig` segue com o encaixe calculado.

- Porta fixa em `vite.config.ts`. Se 5173 ocupar, matar node antigo ou usar a porta do Vite — não adivinhar URL.
- `game/dist/` é gerado; não editar à mão.
- GDD `nongame/gdd/*.md` = prosa histórica; em conflito com `nongame/docs/project/DECISOES-DESIGN.md`, o grill vence.

## Validação

- Protótipo HTML: reler o trecho; Playwright (`game/node_modules/playwright`) se houver interação (login, save, zoom).
- `game/src`: `npm run typecheck`; Playwright pontual se houver interação visual.
- UI/HUD/comportamento visível: **Felipe valida** antes de fechar a task.
- Não marcar `done` sem teste.

## O que não fazer

- Não commitar sem pedido explícito.
- Não inventar número de balance — usar grill/GDD ou marcar provisório.
- Não reintroduzir abas “Criar Mortal” no topo da seleção.
- Não fechar task de UI porque “parece pronto”.
- Não tratar `nongame/backup/` como plano ativo.
- Não escrever tutorial de controle na UI (exceção: Sábio).
- Não usar emoji nem escudo fora dos usos travados.
- Não misturar “achismo” de stack no meio do checklist de cena — cena é aceite de jogador; arquitetura é decisão do dev.
