# Plano — Finalização de sistemas

Plano ativo da sessão. Substitui o ciclo visual/builder do GDD e a leitura de `backup/plano-de-implementacao/` como guia de execução.

## Objetivo

Fechar sistemas cena a cena até o jogo estar jogável do login ao save, com validação explícita do Felipe.

## Contrato de trabalho

1. Felipe descreve o status + expectativa de uma cena.
2. Eu registro/atualizo a cena em `CHECKLIST-CENAS.md` (funcionalidades, aceite, lacunas).
3. Só então implemento o que estiver aberto nessa cena.
4. Validação: Playwright quando houver interação; `npm run typecheck` se mexer em `game/src`. Task painel `done` só com teste passando e Felipe validando o visual.
5. Próxima cena só depois de fechar (ou marcar pendência explícita) a atual.

## Fontes de verdade

| Documento | Papel |
|---|---|
| `CHECKLIST-CENAS.md` | Portão de aceite por cena |
| `TAREFAS-ABERTAS.md` | Lista viva do que falta implementar (Felipe acrescenta) |
| `PLAN-DEV-GRILL.md` | **Plano de execução + grill** discovery→delivery por prioridade e valor de jogador |
| `DECISOES-DESIGN.md` | **Regras de design do jogo** (grill 20/09) — prevalece sobre GDD em conflito |
| `GRILL-FORM.html` | Formulário de design (fonte das decisões) |
| `visual/DECISOES-ESTILO.md` | UI travada (paleta, escudo, emoji, HP bar…) |
| `AGENTS.md` / `22-saves-e-dados.md` | Save, sessão, conta |
| `backup/plano-de-implementacao/` | Referência de arquitetura — não roadmap ativo |
| `visual/TODO.md` | Espelho humano de UI aberta |
| `INDEX.md` | Navegação da doc ativa |
| `backup/README.md` | O que foi arquivado (antigo/concluído) |

## Ciclo documental

```text
Felipe dita status + expectativa da cena
  → CHECKLIST-CENAS.md (aceite)
  → TAREFAS-ABERTAS.md (trabalho aberto)
  → implementar
  → testar
  → validação Felipe
  → marcar feito nos três
```

## Cena em andamento

| Cena | Status | IDs tarefas |
|---|---|---|
| 1 — Login | Em spec | L1–L5 |
| 2 — Seleção | Em spec | S1–S8 |
| 3 — Cidade | Em spec | C1–C26 |
| 4 — Dungeon | Em spec | D1–D13 + X4 |
| 5 — Editor + métricas + fluxo 1–400 | Planos E1/E3/E4b em validação; E2/E3b bloqueados | E1 E3 E4b · E2a/b E3b bloqueados |
| Inventários de conteúdo | Em spec — listagens/auditorias | I1–I14 |

Implementação de código: **ainda não iniciada** nesta fase do plano (só spec/checklist/tarefas).  
**Ordem de execução e prioridades:** ver `PLAN-DEV-GRILL.md` (G0 discovery → G1 conta/save → G2 cidade → G3 dungeon jogável → G4 serviços → G5 arte/LD → G6 editor). Gate de jogável = fim do G3.

## Lacunas conhecidas (resumo)

Detalhe no checklist. Destaques:

**Cena 1 — Login** (`01-login.html` + `save-store.js`): sem Criar conta / Google cria conta / recusa de duplicado.

**Cena 2 — Seleção** (`02-selecao-personagem.html` + `save-store.js`): PNG em vez de 3D idle no modal; nome 2–16 em vez de 3–12; **bug do painel direito vazio** após excluir (raiz: `normalizeSlots` descarta `trees`/`spec`); persistência do slot incompleta; sem fade preto entre cenas; idle TK deve usar clip do BM; sem botão Deslogar nas Opções.

Código hoje (`game/public/boot/01-login.html` + `assets/save-store.js`):

| Expectativa | Estado atual |
|---|---|
| Visual aprovado | Feito (protótipo) |
| Settings abre | Feito (overlay Opções) |
| Conta única no boot | `bootstrap()` cria só `admin`/`admin` |
| Google cria conta nova | **Não** — hoje preenche `admin`/`admin` e pede Entrar |
| admin/admin → seleção | Feito (postMessage / redirect `02`) |
| Botão “Criar conta” abaixo do Google | **Não existe** |
| Modo criar troca CTA Entrar → Criar | **Não existe** |
| Conta nova sem e-mail | UI de registro ausente; `ensureAccount(login, senha)` já existe |
| Conta nova com save zerado | `ensureAccount` não grava personagem; precisa validar slots/vault vazios |
| Login duplicado bloqueado | `ensureAccount` **retorna conta existente** se o id já existir — o fluxo de registro precisa **recusar**, não sobrescrever |

## Fora de escopo (agora)

- Backend real / OAuth Google (simulado local).
- Redesign de UI do login (visual já aprovado).
- Contas com e-mail.
- Reimplementar fases antigas de `backup/plano-de-implementacao/` sem pedido.

## Regras que permanecem

- Zero comentário no código do jogo.
- Zero emoji na UI; escudo só no CTA Entrar / empty-state Criar Personagem.
- Painel de tarefas obrigatório em mudança com 2+ passos.
- Não commitar sem pedido.
- Não marcar `done` sem teste.

## Ciclo por cena (template)

```text
Receber status do Felipe
  → atualizar CHECKLIST-CENAS (aceite + lacuna)
  → atualizar TAREFAS-ABERTAS (IDs L*/S*/X*)
  → implementar só o aberto
  → testar
  → pedir validação visual do Felipe
  → fechar task painel + marcar feito nos mds
  → próxima cena
```
