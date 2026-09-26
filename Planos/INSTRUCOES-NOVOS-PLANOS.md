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

## Pré-requisitos          ← fases de Planos/Refatoracao N.md que este plano espera prontas

## Comportamento

## Passos

### A — <grupo>

1. `caminho/completo/desde/raiz-do-repo` — entrega em uma frase.

## Testar

## Pendências               ← “Nenhuma.” ou uma linha do que só o dono fecha
```

### Linha de abertura

- Informar intervalo de passos (**1 → N**).
- Repetir: cada passo = **arquivo + entrega**.
- Lembrar: código TS/JS/CSS/HTML do jogo **sem comentários** (exceção: `/// <reference types="vite/client" />`).

### Comportamento

- Regras **já decididas** que o código deve obedecer (ids, números, fluxos, o que **não** existe).
- Tabelas quando houver várias entidades (skills, zonas, itens, mapas id → VFX).
- Números de balance: copiar de `tk.ts`, JSON ou inventário; se provisório, marcar **(provisório)** e citar arquivo fonte.
- **Não** incluir: histórico de PR, “Felipe valida”, dono de camada, YAGNI essay, glossário de pastas, arquitetura organizacional. O que só o dono fecha vai em **Pendências**, não no passo.

### Pré-requisitos

- Só links para outros planos + passos concretos (ex.: `Planos/Skill TK linhagem 1.md` passos **1–20**).
- Declarar quais `Planos/Refatoracao N.md` este plano **vem depois**. Não reimplementar o que a fase já entrega.
- Indicar o que pode rodar em paralelo vs o que bloqueia QA.
- Exceção já fixada no índice: `Skill TK linhagem 1.md` passos **23** e **28** rodam **antes** de `Refatoracao 9.md`.

### Passos

- Numeração **global** 1, 2, 3… até N (sem reiniciar em cada seção).
- Subtítulos `### A —`, `### B —`… agrupam por tema (Dados, World, UI, QA).
- Cada passo:
  - Caminho **completo** desde a raiz do repo (`game/src/...`, `game/scripts/...`, `nongame/docs/...` só se a task for auditoria de inventário).
  - UI de produção: `game/src/ui/wire/` + `game/src/ui/WireApi.ts`. `visual/telas/03-wire-paineis-cidade.html` e `GamePanels.ts` não são fonte depois da refatoração 8.
  - Verbo + artefato (tipo, campo, função, script, remover X, ligar Y).
- Textos fixos (ex.: `desc` pt-BR) podem ir em lista sob o bloco de passos que altera `tk.ts` ou wire.
- QA: passos explícitos (`npm run typecheck`, scripts `game/scripts/check-*.mjs`, smoke).
- **Não** usar: “implementar conforme necessário”, “ajustar se precisar”, “validar com stakeholder”.

### Testar

- Checklist `- [ ]` com comportamento observável ou comando verde.
- Fechar com `cd game && npm run typecheck` (e smoke/build/scripts citados no plano).

### Pendências

- Uma lista curta no fim do plano. “Nenhuma.” se o código e os planos de refatoração fecham o ponto.
- Cabe aqui o que só o dono decide (número de balance ausente, pasta que a refatoração não nomeia). Não inventar o valor no passo.

## O que não entra no plano

- Código, pseudocódigo ou diff.
- Comentários sobre commit, PR ou painel de tarefas (isso está no `AGENTS.md` do repo).
- Recriar `nongame/backup/`, planos apagados ou revisão de arquitetura meta.
- Tutorial de controles na UI (proibido no jogo, exceto Sábio).
- Emoji.

## Alinhamento com o repo UAIDZIN

Antes de escrever passos, ler se o escopo tocar:

- `AGENTS.md` — idioma pt-BR, paleta UI, sem emoji. Boot continua em `game/public/boot/`. Wire de jogo, depois da refatoração 8: `game/src/ui/wire/`.
- `Planos/Refatoracao.md` — decisões que o plano novo **não** contradiz:
  - Skill sem nível (compra única; sem “Melhorar”, `levelScale` ou “Nível x / 10”). Dano/cura base sem compensar o bônus antigo.
  - Debug só em `import.meta.env.DEV`. Sem `__UAIDZIN_DEBUG__`, sem `?debug=1`, sem F1–F9 em produção. **F5** não é atalho do jogo.
  - `GamePanels` fora. Aprender skill, vender, Reset/Evolução e refino na `WireApi`.
  - Atributos base **5/5/5/5**. Loja infinita (sem `qty`). `machado_leve` **0/0**. Venda no NPC e na bolsa com confirmação.
  - Drop recusado perdido, aviso “Bolsa cheia: <item> perdido.”. Stack **999**.
  - XP no nível máximo descartado; UI “MAX”.
  - DoT a cada **3 s** (`DOT_TICK_SEC`), fração na expiração; total = `dotDps × dotSec`.
  - Uma conta por aba (recusa no login). Jogo só depois do login e da seleção, com tela de carregamento.
  - Jogo não lançado: sem migração de save. `markDirty(section, kind)` com `critical` | `deferred` (`SaveCoordinator`). Sem `persistSave` solto.
  - Caminhos: `game/src/domain/inventory/`, `game/src/domain/economy/`, `game/src/data/balance/shops.json`, `game/src/app/session/` (`DungeonFlow`, `RewardService`, `CombatOrchestrator`, `InteractionController`, `VaultTransfer`), `InputService`, `TkVfxRegistry` (só depois do plano 9), `GraphicsQuality` / `SettingsPanel` se o plano mexer em opções de vídeo.
- `nongame/docs/project/README.md` — o que ainda vale.
- Inventário afetado em `nongame/docs/inventarios/` — **só** listar passo de doc se a task for auditoria/atualização de inventário.

## Checklist antes de considerar o plano pronto

- [ ] Título termina com `— implementação`.
- [ ] Passos numerados 1→N sem buracos.
- [ ] Todo passo de código cita path absoluto a partir da raiz do repo.
- [ ] Comportamento não repete o passo a passo; passos não repetem parágrafos de comportamento.
- [ ] Pré-requisitos citam as fases de `Refatoracao` que o plano espera prontas.
- [ ] Nenhum passo usa `persistSave`, `GamePanels`, loja com `qty`, nível de skill ou migração de save.
- [ ] Seção `Pendências` presente (“Nenhuma.” ou o que só o dono fecha).
- [ ] Testar cobre cada entrega crítica + typecheck.

## Modelo mínimo

Ver `Planos/Dungeon 2.md` (escopo médio) ou `Planos/Skill TK linhagem 2.md` (dependência + QA).

## Pendências

- Nenhuma neste documento. Pasta de ícones pós-plano 8 e efeito da caixa de sabedoria estão nas Pendências de `Dungeon 1.md` e `Dungeon 2.md`.
