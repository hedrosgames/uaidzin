# Refatoração 3 — conta, boot e uma conta por aba — implementação

Executar passos **1 → 25** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 2.md` passos **1 → 34** (mesma entrega na `main`).

## Comportamento

- Conta v3 sai do `localStorage` (`uaidzin_save_v1_<user>`) e vai para o IDB: chaves `account:<userId>:slots` e `account:<userId>:vault`. Conta `version < 3` é `absent` (sem migração — jogo não lançado): a seleção aparece vazia e o jogador cria o personagem de novo; lab **admin/admin** é recriado pelo `bootstrap()`.
- `vault` entra na **mesma** transação IDB do perfil quando ouro/item cruza fronteira.
- `loadAccount`: falha de leitura/decrypt **lança** e nunca grava; conta ausente não é gravada durante a leitura.
- Resumo de slot só regrava quando campos do resumo mudam. A seleção grava só o slot alterado (sem `saveData(session, { slots })` a partir de snapshot).
- Boot usa o **mesmo** módulo de storage do runtime (IIFE gerada pelo Vite a partir de `game/src/persistence/`), com a API global `UaidzinSave` completa. O arquivo gerado não é versionado.
- Lock **por conta** (`uaidzin:account:<userId>`) adquirido no **documento pai** (`BootFlow.ts`), antes de devolver o personagem ao jogo, mantido pela vida da aba; liberado em logout/troca de conta/fechar aba. Vale para os três caminhos: login pelo iframe, personagem guardado no `sessionStorage` e `__UAIDZIN_SKIP_BOOT__`.
- `__UAIDZIN_SKIP_BOOT__` só existe com `import.meta.env.DEV`.
- Segunda aba ou aba duplicada na mesma conta: login **recusado** com a mensagem “Esta conta já está aberta em outra aba.”; não carrega o jogo nem grava. Aba duplicada com `sessionStorage` copiado cai na mesma recusa. Contas diferentes em abas diferentes continuam permitidas.
- Fallback sem `navigator.locks`: `BroadcastChannel` + heartbeat em `localStorage`; lock expira sem renovação em **5 s** (provisório).
- `BootFlow` só aceita `postMessage` do iframe do boot na mesma origem; mensagem fora do contrato (tipos de `character` e `session`) é ignorada.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #22 | total (com `Refatoracao 2.md`) | passos 1–5, 22; critérios do Complemento de #22 |
| #28 | total (com `Refatoracao 2.md`) | passos 6–10, 20, 22 |
| #29 | total | passos 11–15, 21; critérios do Complemento de #29 (lock por conta, recusa no login) |
| #49 | total (com `Refatoracao 1.md` passo 10) | passos 16–17 |

## Passos

### A — Conta dividida no IDB

1. `game/src/persistence/SaveTypes.ts` — `ACCOUNT_SAVE_VERSION = 3`.
2. `game/src/persistence/SaveStore.ts` — ler/gravar `account:<u>:slots` e `account:<u>:vault` no IDB (sai `readAccountBlob` do `localStorage`); `writeMany` aceita `vault` na mesma transação do perfil.
3. `game/src/persistence/SaveVault.ts` — `loadAccount` lança em falha e não grava na leitura; `syncSlotSummary` só grava se diff vs último resumo; `createSlot`, `deleteSlot`, `wipeProfile` e `importProfile` pela fila do coordenador.
4. `game/src/persistence/migrations.ts` — conta `version < 3` retorna `absent`.
5. `game/src/persistence/SaveCoordinator.ts` — alvo `vault` grava junto com as seções do perfil numa transação.

### B — Boot gerado do runtime

6. `game/src/persistence/bootEntry.ts` (novo) — exporta a API global `UaidzinSave`: `bootstrap`, `resetAdminAccount`, `ensureAccount`, `registerAccount`, `loginGoogleSimulated`, `login`, `logout`, `getSession`, `requireSession`, `loadSave`, `saveData`, `deleteSlot`, `clearProfileStorage`, `rememberUser`, `readRememberedUser`, `_debug.hasSubtle`.
7. `game/vite.config.ts` — plugin gera `game/public/boot/assets/save-store.js` como IIFE a partir de `bootEntry.ts` no `dev` (antes de servir) e no `build`.
8. `game/.gitignore` — ignorar `public/boot/assets/save-store.js`; remover o arquivo manual do versionamento.
9. `game/public/boot/02-selecao-personagem.html` — criar/excluir/editar grava só o slot alterado; remover objetos `base` por classe sem uso e literais de atributo (lê o default do `UaidzinSave`).
10. `game/scripts/check-c3-c4.mjs` e `game/scripts/check-s8-c9-c2-c5.mjs` — `UaidzinSave.loadSave` no formato v3/v4.

### C — Lock de conta

11. `game/src/persistence/AccountLock.ts` (novo) — `navigator.locks.request("uaidzin:account:" + userId, { ifAvailable: true })` segurado por uma promise viva; fallback `BroadcastChannel` + heartbeat.
12. `game/src/app/BootFlow.ts` — adquirir o lock no documento pai nos três caminhos (mensagem de login do iframe, personagem do `sessionStorage`, skip); negado → limpar o personagem guardado, voltar ao login com a mensagem de recusa.
13. `game/public/boot/01-login.html` — exibir a mensagem de recusa recebida do pai; login automático com sessão salva também passa pela checagem.
14. `game/src/app/GameApp.ts` — `start` confere lock ativo antes de carregar; `leaveToBoot`/logout soltam o lock.
15. `game/src/persistence/AccountAuth.ts` — cadastro/login serializados (lista de contas não some com duas abas).

### D — BootFlow

16. `game/src/app/BootFlow.ts` — aceitar só `event.source` = iframe do boot na mesma origem; validar tipos de `session` em `uaidzin-boot-login-ok`; `postMessage` de saída com `targetOrigin = window.location.origin`.
17. `game/src/app/BootFlow.ts` — `__UAIDZIN_SKIP_BOOT__` só com `import.meta.env.DEV`; personagem guardado e skip passam por `normalizeBootCharacter`.

### E — Contrato e QA

18. `nongame/docs/inventarios/save-load.md` — seções v4, conta v3 no IDB, chaves, espelho, política crítico × adiável, lock de conta (task de auditoria).
19. `game/scripts/smoke.mjs` e `game/scripts/bot-play.mjs` — usar skip em dev com lock adquirido pelo caminho do skip.
20. `game/scripts/save-harness.mjs` — cofre + inventário numa transação; conta v2 vira `absent`; excluir slot no boot apaga perfil; criar B no slot recém-excluído entra com B.
21. `game/scripts/check-account-lock.mjs` (novo) — Playwright, dois `page` no mesmo contexto: segunda aba recusada; aba duplicada (`sessionStorage` copiado) recusada; após fechar a primeira, segunda loga.
22. `game/src/persistence/account.test.ts` (novo) — `loadAccount` com store que lança não grava; slot e cofre intercalados não perdem atualização.
23. `cd game && npm run test && npm run test:save`.
24. `cd game && node scripts/check-account-lock.mjs`.
25. `cd game && npm run typecheck && npm run smoke && npm run build`.

## Testar

- [ ] Passos 23–25 verdes.
- [ ] Boot e jogo listam os mesmos slots.
- [ ] Duplicar aba com a conta logada: aba nova recusada.
- [ ] `postMessage` fora do contrato não altera personagem.

## Pendências

- Nenhuma.
