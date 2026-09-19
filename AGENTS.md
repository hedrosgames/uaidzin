# AGENTS.md — UAIDZIN

Jogo RPG de farm 3D no navegador (Three.js + Vite + TypeScript). Documentação do jogo em PT-BR neste diretório; código em `game/`.

**Mapa de código para agentes (local, não versionado):** `CODEGRAPH.md` — onde mexer para cada tipo de mudança.  
**Art style / handoff de telas:** `visual/ART-STYLE-HANDOFF.md` + `visual/DECISOES-ESTILO.md`.

## Idioma

- Prosa, GDD, commits e respostas ao Felipe em **português do Brasil**.
- Frases diretas, substantivo concreto. Sem “vamos agora”, sem bullet que repete o título.

## Código — sem comentários (regra dura)

**Nunca escrever comentário no código** deste projeto (TypeScript, JS, CSS, HTML inline).

- Sem `//`, sem `/* */`, sem `<!-- -->` de explicação.
- Nome de função/variável e estrutura carregam o significado. Se precisa de comentário para entender, refatora.
- Exceção única: **directives do compilador** (`/// <reference types="vite/client" />`) — não são comentário de humano.
- Antes de `done`, rodar limpeza se sobrar lixo: `game/scripts/_strip-comments.mjs` (ou remover à mão).
- `tsc --noEmit` precisa passar depois de limpar.

### Polimento

Ao fechar qualquer task de código:

1. Zero comentários no diff.
2. Sem `console.log` de debug esquecido.
3. Sem arquivo temporário (`_test-*`, `_*-debug*`, screenshot morto).
4. Sem CSS/JS morto (seletor ou função que ninguém chama).
5. Sem emoji em UI.

## Painel de tarefas (obrigatório)

Toda mudança com 2+ passos ou que o Felipe pedir vira **task no painel** do MiMo Desktop (`task` create / start / done).

1. Registrar a task **antes** de mexer no código.
2. `start` imediatamente antes de executar.
3. `done` só com o resultado **testado**. Se falhar, `block` — nunca `done`.
4. Pedido novo no meio do caminho: criar task nova; não enterrar no meio de outra.
5. Ao fechar o turno, o painel precisa bater com o que está em andamento. Não “entregar” texto sem task.

O `visual/TODO.md` é espelho humano do backlog. Painel é a fonte viva da sessão.

## Layout das telas (protótipos)

Arquivos em `visual/telas/`:

- HTML **standalone**: um arquivo, `lang="pt-BR"`, CSS inline, cores em `:root`, sem CDN nem bundler.
- Assets ao lado em `visual/telas/assets/`.
- **Palco 1600×900** com `scale` via JS (não `aspect-ratio` junto de width/height). Letterbox preto no `.viewport`.
- Login → `02-selecao-personagem.html` exige sessão (`UaidzinSave.requireSession()`).
- No reset CSS de **toda tela nova**, incluir o bloco anti-seleção: `user-select: none` em `html, body` (+ `-webkit-user-select` / `-webkit-touch-callout`) e exceção `user-select: text` em `input`, `textarea`, `[contenteditable="true"]`.

## Regras de UI (travadas)

Fonte: `visual/DECISOES-ESTILO.md`. Resumo executivo:

| Regra | Valor |
|---|---|
| Paleta | **C · Salão/Brasa** — `#100c08` / `#241c14` / `#d4a017` / `#a33b3b` / `#f0e6d0` |
| Moldura principal | A — ferro + cantos ouro |
| Escudo (clip-path) | **Só** CTA de Entrar no login e empty-state de “Criar Personagem” |
| Outros botões | Retângulo `border-radius: 2px` |
| Emoji | **Proibidos** — só PNG/SVG |
| Arte de personagem | PNG com alfa oficiais: `TKpng` / `FMpng` / `BMpng` / `HTpng` |
| HP world bar | Verde ≥ 40%, vermelho &lt; 40% (personagem e inimigos) |
| Texto de UI | Só conteúdo do jogo — zero legenda de mockup |
| Seleção de texto | Proibida (`user-select: none`); inputs editáveis OK |
| Nomes de classe | TK Thegn Knight · FM Frost Maiden · BM Beast Master · HT Huntress |

### Texto na UI — sem tutorial embutido

- **Proibido** texto de instrução de controle ou UX (“duplo clique”, “arraste para…”, “passe o mouse”, “clique aqui”, tooltips `title` de tutorial, legendas de mockup).
- UI mostra **só** o que o personagem/jogador lê no mundo do jogo (nome, status, custo, descrição diegética).
- Só inclui esse tipo de dica se o Felipe pedir explicitamente.

## Save local (protótipo)

- Boot: `game/public/boot/assets/save-store.js` (autoridade do hub no jogo)
- Conta **admin / admin** no `bootstrap()`
- Slots e profiles em envelope **AES-GCM** quando há `crypto.subtle` (HTTP); XOR só em `file://`
- Contrato completo: `22-saves-e-dados.md` + `SaveVault` em `game/src/persistence/`
- Criar/excluir personagem grava o save da conta; excluir também limpa o profile
- Lembrar login guarda só o userId
- Wipe: `http://127.0.0.1:5173/tools/save-wipe.html` e `__UAIDZIN__.save.wipe*`

## Jogo (Vite)

```text
cd game
npm run dev          # http://127.0.0.1:5173
npm run typecheck
```

- Porta fixa em `vite.config.ts` (`127.0.0.1:5173`). Se 5173 estiver ocupada, matar o node antigo ou usar a porta que o Vite indicar — não adivinhar URL.
- `dist/` é build gerado; não editar à mão.
- GDD em `*.md` na raiz de UAIDZIN é fonte da prosa; código não contradiz sem reportar.

## Validação

- Protótipo HTML: reler o trecho editado; testar com Playwright (`game/node_modules/playwright`) quando houver interação (login, zoom, save).
- Jogo: `typecheck` quando a mudança for em `game/src`. Playwright pontual quando houver interação visual.
- Não marcar task `done` sem o teste.

## O que não fazer

- Não commitar sem pedido explícito.
- Não inventar número de balanceamento — está no GDD ou é provisório.
- Não reintroduzir abas/modo “Criar Mortal” no topo da seleção (removidos de propósito).
- Não fechar task de HUD/UI porque “parece pronto” — o Felipe valida o visual.
