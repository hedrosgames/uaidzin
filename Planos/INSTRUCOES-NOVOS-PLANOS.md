# Instruções — criar planos em `Planos/`

Documento para humanos e agentes. Um plano é **só** o roteiro de implementação: **o quê**, **onde** e **ordem**. Quem executa decide **como** escrever o código.

## Nome do arquivo

- `Planos/<Nome curto>.md` — título claro do escopo (ex.: `Dungeon 1.md`, `Skill TK linhagem 2.md`).
- Um plano = um escopo fechado (feature ou fatia entregável).
- Continuações: referenciar outro plano em **Pré-requisitos** com **números de passo**, não prosa longa.

## Estrutura obrigatória

```markdown
# <Título> — implementação

Executar passos **1 → N** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos          ← omitir se não houver

## Comportamento

## Passos

### A — <grupo>

1. `caminho/completo/desde/raiz-do-repo` — entrega em uma frase.

## Testar
```

### Linha de abertura

- Informar intervalo de passos (**1 → N**).
- Repetir: cada passo = **arquivo + entrega**.
- Lembrar: código TS/JS/CSS/HTML do jogo **sem comentários** (exceção: `/// <reference types="vite/client" />`).

### Comportamento

- Regras **já decididas** que o código deve obedecer (ids, números, fluxos, o que **não** existe).
- Tabelas quando houver várias entidades (skills, zonas, itens, mapas id → VFX).
- Números de balance: copiar de `tk.ts`, JSON ou inventário; se provisório, marcar **(provisório)** e citar arquivo fonte.
- **Não** incluir: histórico de PR, “Felipe valida”, dono de camada, YAGNI essay, decisões em aberto, glossário de pastas, arquitetura organizacional.

### Pré-requisitos

- Só links para outros planos + passos concretos (ex.: `Planos/Skill TK linhagem 1.md` passos **1–20**).
- Indicar o que pode rodar em paralelo vs o que bloqueia QA.

### Passos

- Numeração **global** 1, 2, 3… até N (sem reiniciar em cada seção).
- Subtítulos `### A —`, `### B —`… agrupam por tema (Dados, World, UI, QA).
- Cada passo:
  - Caminho **completo** desde a raiz do repo (`game/src/...`, `visual/telas/...`, `game/scripts/...`, `nongame/docs/...` só se a task for auditoria de inventário).
  - Verbo + artefato (tipo, campo, função, script, remover X, ligar Y).
- Textos fixos (ex.: `desc` pt-BR) podem ir em lista sob o bloco de passos que altera `tk.ts` ou wire.
- QA: passos explícitos (`npm run typecheck`, scripts `game/scripts/check-*.mjs`, smoke).
- **Não** usar: “implementar conforme necessário”, “ajustar se precisar”, “validar com stakeholder”.

### Testar

- Checklist `- [ ]` com comportamento observável ou comando verde.
- Fechar com `cd game && npm run typecheck` (e smoke/build/scripts citados no plano).

## O que não entra no plano

- Código, pseudocódigo ou diff.
- Comentários sobre commit, PR ou painel de tarefas (isso está no `AGENTS.md` do repo).
- Recriar `nongame/backup/`, planos apagados ou revisão de arquitetura meta.
- Tutorial de controles na UI (proibido no jogo, exceto Sábio).
- Emoji.

## Alinhamento com o repo UAIDZIN

Antes de escrever passos, ler se o escopo tocar:

- `AGENTS.md` — idioma pt-BR, wire em `game/public/boot/` + `game/src/ui/`, save, paleta UI, sem emoji.
- `nongame/docs/project/README.md` — o que ainda vale.
- Inventário afetado em `nongame/docs/inventarios/` — **só** listar passo de doc se a task for auditoria/atualização de inventário.

## Checklist antes de considerar o plano pronto

- [ ] Título termina com `— implementação`.
- [ ] Passos numerados 1→N sem buracos.
- [ ] Todo passo de código cita path absoluto a partir da raiz do repo.
- [ ] Comportamento não repete o passo a passo; passos não repetem parágrafos de comportamento.
- [ ] Zero seção “decisões em aberto”, “donos”, “fora do escopo” (exceto pré-requisito explícito).
- [ ] Testar cobre cada entrega crítica + typecheck.

## Modelo mínimo

Ver `Planos/Dungeon 2.md` (escopo médio) ou `Planos/Skill TK linhagem 2.md` (dependência + QA).
