# Refatoração 2 — save coordenador e seções — implementação

Executar passos **1 → 26** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 1.md` passos **1 → 17**.
- Planos 2 e 3 vão juntos para a `main` (boot e runtime não podem ficar em versões de IDB diferentes entre eles).

## Comportamento

- `SaveCoordinator` (novo em `game/src/persistence/`): único ponto de `markDirty(section, kind)` e `checkpoint()` / `flush()`. `kind` = `critical` | `deferred` (tabela em `Planos/Refatoracao.md`).
- Crítico: `checkpoint()` no fim do frame (junta eventos do mesmo frame) e aguarda gravação. Adiável: debounce **2 s** (provisório) ou próximo crítico/saída.
- Seções IDB do perfil (chaves estáveis `profile:<id>:<section>`): `meta`, `character`, `skills`, `skillLoadout`, `equipment`, `inventory`, `bags`, `buffs`, `progress`, `options`.
- `SAVE_VERSION` **3 → 4**; perfil com `saveVersion < 4` é `absent` (sem migração — jogo não lançado).
- Custo por save: `CryptoKey` e conexão IDB cacheadas; conta decriptada mantida em memória; só seções sujas são criptografadas; criptografia termina **antes** de abrir a transação `readwrite`.
- `SaveVault.flush`: backoff finito (provisório 1 s, 3 s, 10 s); crítico que falhou continua pendente e aparece no HUD até gravar; adiável pode ser abandonado após 3 tentativas; `logout`/`wipe` cancelam timers/retry e aguardam `flushChain`.
- `dispose()` **não** remove listeners de `pagehide`/`visibilitychange`.
- Espelho `localStorage`: no `pagehide`, gravar o último payload **já criptografado** (sem criptografia async na saída); boot reconcilia por `meta.updatedAt`.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #16 | total | passos 1–8, 11–16, 21; critérios do Complemento de #16 (tabela crítico × adiável) |
| #23 | total | passos 17–19, 23 |
| #24 | total | passos 19–20 |
| #22 | parcial (perfil + cofre na mesma transação); conta dividida em `Refatoracao 3.md` | passos 3, 21 |
| #28 | parcial (mesma versão de IDB); boot gerado em `Refatoracao 3.md` | passo 10 |

## Passos

### A — Coordenador

1. `game/src/persistence/SaveCoordinator.ts` (novo) — dirty por seção com `kind`; junta críticos do frame; monta payload; delega `SaveVault`.
2. `game/src/persistence/SaveVault.ts` — API interna chamada só pelo coordenador para flush de perfil; `CryptoKey` cacheada por sessão; conta decriptada em memória.

### B — Store por seção

3. `game/src/persistence/SaveStore.ts` — `readAll(profileId)`, `writeMany(profileId, Partial<Record<ProfileSection, string>>, account?)` numa transação `readwrite` que recebe blobs já criptografados.
4. `game/src/persistence/SaveStore.ts` — reutilizar conexão IDB; reabrir em `versionchange`/`close`.
5. `game/src/persistence/SaveStore.ts` — `DB_VERSION` **3** com store de seções.
6. `game/src/persistence/SaveTypes.ts` — `SAVE_VERSION = 4`; tipo `ProfileSection`; tipo `SaveEventKind`.

### C — Formato v4

7. `game/src/persistence/migrations.ts` — `saveVersion < 4` retorna `absent`; remover laço de migração v1→v3.
8. `game/src/persistence/SaveVault.ts` — apagar chaves monolíticas `profile:<id>` e `:prev` ao primeiro checkpoint v4 do perfil.

### D — Boot na mesma versão

9. `game/public/boot/assets/save-store.js` — `indexedDB.open("uaidzin", 3)` (igual ao runtime); tratar `onerror`/`onblocked` com mensagem em vez de `resolve()` silencioso.
10. `game/public/boot/assets/save-store.js` — excluir slot apaga todas as chaves `profile:<id>:*`.

### E — Migrar chamadores

11. `game/src/app/CityGameSession.ts` — substituir `persistSave(...)` por `markDirty(section, kind)` segundo a tabela (abate → `character`+`inventory`+`progress` crítico; entrada de dungeon, consumível, descarte, loja → crítico; atributos, skill, equip, barra → adiável).
12. `game/src/app/GameApp.ts` — idem (autosave por timer só grava seções sujas).
13. `game/src/ui/WireGameBridge.ts` — idem.
14. `game/src/debug/DebugApi.ts` — idem.
15. `game/src/ui/GamePanels.ts` — idem (até plano 8 remover arquivo).
16. `game/src/app/CityGameSession.ts` — `applyBootCharacter`: gravação inicial via coordenador (crítico).

### F — Ciclo de vida flush

17. `game/src/persistence/SaveVault.ts` — `flush` com backoff finito e sem recursão imediata; crítico pendente não é descartado.
18. `game/src/persistence/SaveVault.ts` — `logout`/`wipe*`: cancelar `debounceTimer`, `retryTimer`, `pendingPayload`; aguardar `flushChain`.
19. `game/src/persistence/SaveVault.ts` — `dispose()` não desregistra listeners de persistência.
20. `game/src/app/GameApp.ts` — `pagehide` grava espelho síncrono já criptografado; `leaveToBoot` com timeout (provisório 3 s) e aviso se crítico não gravou.

### G — Testes

21. `game/src/persistence/save-coordinator.test.ts` (novo) — store falso: AoE com 5 abates no mesmo frame = 1 transação; cofre + inventário = 1 transação; adiável não grava antes do debounce; skill learn inclui `skillLoadout`.
22. `game/scripts/save-harness.mjs` — cenários v4: gravar/ler seções; save v3 vira `absent`; falha persistente; wipe com flush pendente; logout com retry armado.
23. `game/src/persistence/save-vault.test.ts` (novo) — `flush` termina em tempo finito com store que sempre falha.
24. `cd game && npm run test && npm run test:save`.
25. `cd game && npm run typecheck && npm run smoke`.

### H — Verificação

26. `rg "persistSave\(" game/src` — zero fora de `SaveCoordinator` e testes.

## Testar

- [ ] Passos 24–25 verdes.
- [ ] Abate grava só seções tocadas, imediatamente (teste 21).
- [ ] Fechar aba logo após kill preserva XP e drop (manual).
- [ ] Storage sempre falhando: `leaveToBoot` volta em ≤ 3 s com aviso.
- [ ] Boot abre o IDB sem `VersionError` e excluir slot remove todas as seções.
