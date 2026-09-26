# Refatoração 3 — conta, boot e uma conta por aba — implementação

Executar passos **1 → 18** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 2.md` passos **1 → 26** (mesma entrega na `main`).

## Comportamento

- Conta v3: chaves `account:<userId>:slots` e `account:<userId>:vault` (substituem blob monolítico v2). Conta `version < 3` é `absent` (sem migração — jogo não lançado).
- Resumo de slot só regrava quando campos do resumo mudam.
- Boot usa o **mesmo** módulo de storage do runtime (IIFE gerada pelo Vite a partir de `game/src/persistence/`).
- Lock **por conta** (`uaidzin:account:<userId>`) adquirido no login, antes de `createGameApp`, mantido pela vida da aba; liberado em logout/troca de conta/fechar aba.
- Segunda aba ou aba duplicada na mesma conta: login **recusado** com a mensagem “Esta conta já está aberta em outra aba.”; não carrega o jogo nem grava. Contas diferentes em abas diferentes continuam permitidas.
- Fallback sem `navigator.locks`: `BroadcastChannel` + heartbeat em `localStorage`; lock expira sem renovação em **5 s** (provisório).
- `BootFlow` só aceita `postMessage` com `event.origin === window.location.origin` e `event.source` = iframe do boot; `targetOrigin` = `window.location.origin`.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #22 | total (com `Refatoracao 2.md`) | passos 1–4, 16; critérios do Complemento de #22 |
| #28 | total (com `Refatoracao 2.md`) | passos 5–7, 14 |
| #29 | total | passos 8–11, 15; critérios do Complemento de #29 (lock por conta, recusa no login) |
| #49 | total (com `Refatoracao 1.md` passo 10) | passos 12–13 |

## Passos

### A — Conta dividida

1. `game/src/persistence/SaveTypes.ts` — `ACCOUNT_SAVE_VERSION = 3`.
2. `game/src/persistence/SaveStore.ts` — ler/gravar `slots` e `vault` separados; `vault` entra na mesma transação do perfil quando ouro/item cruza fronteira.
3. `game/src/persistence/SaveVault.ts` — `syncSlotSummary` só grava se diff vs último resumo.
4. `game/src/persistence/migrations.ts` — conta `version < 3` retorna `absent`.

### B — Boot gerado do runtime

5. `game/src/persistence/bootEntry.ts` (novo) — exporta só as operações usadas pelo boot (listar/criar/excluir slot, login, `profile:<id>:*`).
6. `game/vite.config.ts` — build gera `game/public/boot/assets/save-store.js` como IIFE a partir de `bootEntry.ts` (dev e build).
7. `game/public/boot/assets/save-store.js` — substituído pelo arquivo gerado; mesma API global consumida pelas páginas do boot.

### C — Lock de conta

8. `game/src/persistence/AccountLock.ts` (novo) — `navigator.locks.request("uaidzin:account:" + userId, { ifAvailable: true })`; fallback `BroadcastChannel` + heartbeat.
9. `game/public/boot/` — login pede o lock via `save-store.js`; lock negado → mensagem de recusa, sem entrar.
10. `game/src/app/GameApp.ts` — `start` confere lock ativo antes de carregar; `leaveToBoot`/logout soltam o lock.
11. `game/src/persistence/AccountAuth.ts` — cadastro/login serializados (lista de contas não some com duas abas).

### D — BootFlow

12. `game/src/app/BootFlow.ts` — validar `event.origin` e `event.source`; ignorar mensagem fora do contrato.
13. `game/src/app/BootFlow.ts` — `postMessage` de saída com `targetOrigin = window.location.origin`.

### E — Contrato e QA

14. `nongame/docs/inventarios/save-load.md` — seções v4, conta v3, chaves IDB, política crítico × adiável, lock de conta (task de auditoria).
15. `game/scripts/check-account-lock.mjs` (novo) — Playwright, dois `page` no mesmo contexto: segunda aba recusada; após fechar a primeira, segunda loga.
16. `game/scripts/save-harness.mjs` — cofre + inventário numa transação; conta v2 vira `absent`; excluir slot no boot apaga perfil.
17. `cd game && npm run test && npm run test:save`.
18. `cd game && npm run typecheck && npm run smoke && npm run build`.

## Testar

- [ ] Passos 15–18 verdes.
- [ ] Boot e jogo listam os mesmos slots.
- [ ] Duplicar aba com a conta logada: aba nova recusada no login.
- [ ] `postMessage` de outra origem não altera personagem.
