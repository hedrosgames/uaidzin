# Refatoração 2 — save coordenador e seções — implementação

Executar passos **1 → 22** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 1.md` passos **1 → 16**.

## Comportamento

- `SaveCoordinator` (novo em `game/src/persistence/`): único ponto de `markDirty(section)` e `checkpoint()` / `flush()`.
- Seções IDB do perfil (chaves estáveis): `meta`, `character`, `skills`, `skillLoadout`, `equipment`, `inventory`, `bags`, `buffs`, `progress`, `options`.
- `SAVE_VERSION` **3 → 4** na primeira carga; blob v3 mantido até primeiro checkpoint v4 bem-sucedido.
- `SaveVault.flush`: cancelar fila/retry em `logout`/`wipe`; `dispose()` **não** remove listeners de `pagehide`/`visibilitychange`.
- Espelho `localStorage`: gravar snapshot **já serializado** no `pagehide` (sem nova criptografia async na saída).

## Passos

### A — Coordenador

1. `game/src/persistence/SaveCoordinator.ts` (novo) — dirty por seção; monta payload; delega `SaveVault`.
2. `game/src/persistence/SaveVault.ts` — API interna chamada só pelo coordenador para flush de perfil.

### B — Store por seção

3. `game/src/persistence/SaveStore.ts` — `readAll(profileId)`, `writeMany(profileId, Partial<Record<Section, unknown>>)` numa transação `readwrite`.
4. `game/src/persistence/SaveStore.ts` — reutilizar conexão IDB; reabrir em `versionchange`.
5. `game/src/persistence/SaveTypes.ts` — constante `SAVE_VERSION = 4`; tipo `ProfileSection`.

### C — Migração v3 → v4

6. `game/src/persistence/migrations.ts` — na carga, se blob monolítico v3: decompor nas 10 seções; gravar v4; manter backup v3 até checkpoint.
7. `game/src/persistence/SaveCoordinator.ts` — após checkpoint v4 ok, apagar blob legado v3.

### D — Migrar chamadores

8. `game/src/app/CityGameSession.ts` — substituir `persistSave(...)` por `markDirty` + `checkpoint` com seções tocadas (mapear: abate → `character`+`inventory`+`meta`; skill → `skills`+`skillLoadout`+…).
9. `game/src/app/GameApp.ts` — idem.
10. `game/src/ui/WireGameBridge.ts` — idem.
11. `game/src/debug/DebugApi.ts` — idem.
12. `game/src/ui/GamePanels.ts` — idem (até plano 8 remover arquivo).
13. `game/src/app/BootFlow.ts` — idem.

### E — Ciclo de vida flush

14. `game/src/persistence/SaveVault.ts` — `logout`/`wipe`: cancelar `flushChain`, timers, retry.
15. `game/src/app/GameApp.ts` — listener `pagehide` grava espelho síncrono; reconciliar no boot por `meta.updatedAt`.
16. `game/src/persistence/SaveVault.ts` — `dispose()` não desregistrar listeners de persistência.

### F — Testes

17. `game/src/persistence/save-coordinator.test.ts` (novo) — store falso: abate = 1 transação com seções esperadas; skill learn inclui `skillLoadout`.
18. `game/scripts/test-save.mjs` — estender cenário v3 existente → migra v4 (se script já existir; senão passo dentro de vitest).
19. `cd game && npm run test && npm run test:save`.
20. `cd game && npm run typecheck`.

### G — Verificação

21. Grep no repo: zero `persistSave(` fora de `SaveCoordinator` e testes.
22. HUD debug (se existir): expor contagem de seções gravadas por flush (dev only).

## Testar

- [ ] Passos 19–20 verdes.
- [ ] Abate grava só seções tocadas (teste 17).
- [ ] Fechar aba após kill preserva progresso (manual).
- [ ] Save v3 lab migra sem perder barra/bolsas.
