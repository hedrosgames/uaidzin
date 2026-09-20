# Tarefas em aberto — Finalização de sistemas

Espelho operacional do que falta **implementar**. Felipe acrescenta item a item; eu marco e movo para Feito quando testar.

Checklist de aceite (o “está pronto quando…”) fica em `CHECKLIST-CENAS.md`.  
Plano/ciclo: `PLAN-finalizacao-sistemas.md`.

**Regra:** item só sai daqui com teste e validação (visual, quando for o caso).

---

## Aberto

### Cena 1 — Login

| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| L1 | Botão **Criar conta** abaixo do Google; modo criar troca CTA **Entrar → Criar** | Felipe | UI do protótipo `01-login.html` |
| L2 | Registro manual: login + senha, **sem e-mail**; save zerado | Felipe | |
| L3 | Login duplicado **recusado** (não sobrescrever) | Felipe | `ensureAccount` hoje devolve conta existente — precisa de registro que falha |
| L4 | Google **cria conta nova** (não preencher `admin`) | Felipe | Hoje preenche admin/admin |
| L5 | Confirmar boot com **conta única** `admin` e admin → seleção | Felipe | Provável já ok; validar |

### Cena 2 — Seleção de personagem

| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| S1 | **Bug status vazio** após excluir 2º personagem e clicar no 1º | Felipe | `renderInfo` quebra: `normalizeSlots` do `save-store` descarta `trees`/`spec`; attrs podem virar 5 genérico |
| S2 | Painel direito com **status da classe** no create (padrão) e do **personagem salvo** depois | Felipe | Create já monta `base` da classe; persist/load corrompe |
| S3 | Nome: **mín. 3 / máx. 12** para habilitar Criar | Felipe | Hoje `maxlength=16` e `length >= 2` |
| S4 | Modal criar: caixa com PNG das classes → **3D idle** por classe | Felipe | `mountCharPreview` já existe no roster; não está no modal |
| S5 | Criar/excluir **salva na hora** no status da conta, sem falha | Felipe | `persist()` + `saveData`/`normalizeSlots` precisam preservar o slot completo |
| S6 | **Fade in/out** tela preta ao trocar de cenas | Felipe | Login tem fade do painel; seleção/BootFlow trocam sem preto |
| S7 | Idle do **TK** = mesma animação do **BM** na tela de seleção | Felipe | Manter modelo/textura TK; clip de idle vindo do BM (`char-preview.mjs` usa `animations[0]` do GLB da classe) |
| S8 | Botão **Deslogar** no Settings da seleção | Felipe | `logout()` do save-store + volta ao login; moldura retângulo |

### Transversal

| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| X1 | Checklist cenas seguintes | Felipe | Aguardando ditar |

---

## Em implementação

_(vazio)_

---

## Aguardando validação do Felipe

_(vazio)_

---

## Feito

_(vazio nesta fase)_

---

## Template ao informar tarefa nova

```markdown
| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| <C><n> | descrever o comportamento esperado | Cena N | onde no código / dependência |
```
