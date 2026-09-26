# Refatoração 3 — conta, boot e segunda aba — implementação

Executar passos **1 → 14** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 2.md` passos **1 → 22**.

## Comportamento

- Conta v3: chaves `account:<userId>:slots` e `account:<userId>:vault` (substituem blob monolítico v2).
- `ACCOUNT_SAVE_VERSION` **2 → 3** na carga; resumo de slot só regrava quando campos do resumo mudam.
- Boot lê/escreve slots com **mesma** versão IDB que `SaveStore.ts`; excluir slot no boot apaga perfil criptografado.
- Segunda aba mesmo `profileId`: modo leitura + banner (lock ou `BroadcastChannel`).

## Passos

### A — Conta dividida

1. `game/src/persistence/SaveTypes.ts` — `ACCOUNT_SAVE_VERSION = 3`.
2. `game/src/persistence/SaveStore.ts` — ler/gravar `slots` e `vault` separados.
3. `game/src/persistence/SaveVault.ts` — `syncSlotSummary` só grava se diff vs último resumo.
4. `game/src/persistence/migrations.ts` — migrar conta v2 → v3 preservando cofre e slots.

### B — Boot unificado

5. `game/src/persistence/SaveStore.ts` — exportar funções usadas pelo boot (ou entry mínima compilada para IIFE).
6. `game/public/boot/assets/save-store.js` — passar a usar **DB_VERSION** igual ao runtime; mesmas operações de delete slot/perfil.
7. `game/vite.config.ts` — pipeline que gera `save-store.js` a partir do TS do runtime (ou import explícito documentado no passo 6).

### C — Lock de aba

8. `game/src/persistence/ProfileLock.ts` (novo) — `navigator.locks.request(`profile:${id}`)`; fallback aviso via `BroadcastChannel`.
9. `game/src/app/GameApp.ts` — adquirir lock ao entrar no jogo; soltar no logout; UI somente leitura se lock negado.

### D — Contrato e QA

10. `nongame/docs/inventarios/save-load.md` — seções v4, conta v3, chaves IDB, boot↔runtime (task de auditoria).
11. `cd game && npm run test:save` — incluir conta v2 → v3.
12. Manual: boot excluir slot remove perfil no IDB.
13. Manual: duas abas mesmo personagem — segunda avisa/leitura.
14. `cd game && npm run typecheck && npm run smoke`.

## Testar

- [ ] Passos 11 e 14 verdes.
- [ ] Cofre e inventário cruzam fronteira numa transação (teste do plano 2 ainda verde).
- [ ] Boot e jogo listam os mesmos slots.
