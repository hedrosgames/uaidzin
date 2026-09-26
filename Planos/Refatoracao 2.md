# Refatoração 2 — save coordenador e seções — implementação

Executar passos **1 → 34** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 1.md` passos **1 → 22**.
- Planos 2 e 3 vão juntos para a `main` (boot e runtime não podem ficar em versões de IDB diferentes entre eles).

## Comportamento

- `SaveCoordinator` (novo em `game/src/persistence/`): único ponto de `markDirty(target, kind)` e `checkpoint()` / `flush()`. `target` = seção do perfil ou `vault` (conta). `kind` = `critical` | `deferred` (tabela em `Planos/Refatoracao.md`).
- Crítico: `checkpoint()` no fim do frame (junta eventos do mesmo frame) e aguarda gravação. Crítico que chega durante um flush grava logo depois dele, na mesma fila. Adiável: debounce **2 s** (provisório) ou próximo crítico/saída.
- Todas as escritas (perfil, cofre, resumo de slot, criar/excluir slot, wipe, import) passam pela **mesma fila** (`flushChain`); nenhuma leitura-modifica-grava fora dela.
- Seções IDB do perfil (chaves estáveis `profile:<id>:<section>`): `meta`, `character`, `skills`, `skillLoadout`, `equipment`, `inventory`, `bags`, `buffs`, `progress`, `options`.
- Level up suja `character` **e** `skills` (`skillPoints` muda).
- `SAVE_VERSION` **3 → 4**; perfil com `saveVersion < 4` é `absent` (sem migração — jogo não lançado), inclusive no `SaveVault.loadCharacter` (não vira `unreadable`).
- Custo por save: `CryptoKey` importada uma vez por sessão e passada ao `CryptoCodec`; conexão IDB cacheada; conta decriptada mantida em memória; só seções sujas são criptografadas; criptografia termina **antes** de abrir a transação `readwrite`.
- Sem sessão ativa: nenhuma gravação (nunca texto puro). `run()` usa a sessão capturada no enfileiramento.
- `SaveVault.flush`: backoff finito (provisório 1 s, 3 s, 10 s); crítico que falhou continua pendente e aparece no HUD (`GameApp.renderSaveStatus`) até gravar; adiável pode ser abandonado após 3 tentativas; `logout`/`wipe` cancelam timers/retry e aguardam `flushChain`.
- `GameApp.dispose()` **não** remove listeners de `pagehide`/`visibilitychange`; `beforeunload` deixa de chamar `dispose()`.
- Espelho `localStorage` (chave `uaidzin.mirror.<profileId>`): no `pagehide`, gravar o último payload **já criptografado** (perfil + cofre, sem criptografia async na saída); na carga, vence o mais novo por `meta.updatedAt` entre IDB e espelho.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #16 | total | passos 1–9, 13–20, 27, 34; critérios do Complemento de #16 (tabela crítico × adiável) |
| #23 | total | passos 21–22, 26, 28 |
| #24 | total | passos 23–25, 30 |
| #22 | parcial (fila única e alvo `vault`); conta dividida no IDB em `Refatoracao 3.md` | passos 1, 14, 27 |
| #28 | parcial (mesma versão de IDB e excluir slot); boot gerado em `Refatoracao 3.md` | passos 10–12 |

## Passos

### A — Coordenador

1. `game/src/persistence/SaveCoordinator.ts` (novo) — dirty por alvo (`ProfileSection` | `vault`) com `kind`; junta críticos do frame; fila única; monta payload; delega `SaveVault`.
2. `game/src/persistence/crypto/CryptoCodec.ts` — `encryptJson`/`decryptJson` aceitam `CryptoKey` pronta; importação da chave exposta à parte.
3. `game/src/persistence/SaveVault.ts` — API interna chamada só pelo coordenador; `CryptoKey` cacheada por sessão; conta decriptada em memória; sem sessão → não grava.

### B — Store por seção

4. `game/src/persistence/SaveStore.ts` — `readAll(profileId)`, `writeMany(profileId, Partial<Record<ProfileSection, string>>)` numa transação `readwrite` que recebe blobs já criptografados.
5. `game/src/persistence/SaveStore.ts` — reutilizar conexão IDB; reabrir em `versionchange`/`close`.
6. `game/src/persistence/SaveStore.ts` — `DB_VERSION` **2 → 3** com store de seções.
7. `game/src/persistence/SaveTypes.ts` — `SAVE_VERSION = 4`; tipos `ProfileSection`, `SaveTarget` e `SaveEventKind`.

### C — Formato v4

8. `game/src/persistence/migrations.ts` — `saveVersion < 4` retorna `absent`; remover laço de migração v1→v3.
9. `game/src/persistence/SaveVault.ts` — `loadCharacter` trata `saveVersion < 4` como `absent`; remover `migrateLegacyEncryption`; apagar `profile:<id>`, `:prev`, `uaidzin.save.<id>` e `uaidzin.save.<id>:prev` ao primeiro checkpoint v4 do perfil.

### D — Boot e ferramentas na mesma versão

10. `game/public/boot/assets/save-store.js` — `indexedDB.open("uaidzin", 3)` (igual ao runtime); `onerror`/`onblocked` com mensagem em vez de `resolve()` silencioso; remover `migrateLegacy`.
11. `game/public/boot/assets/save-store.js` — excluir slot apaga todas as chaves `profile:<id>:*` e o espelho; falha mostra aviso na seleção.
12. `game/public/tools/save-wipe.html` — abrir IDB versão 3 e apagar seções e espelho.

### E — Migrar chamadores

13. `game/src/app/CityGameSession.ts` — substituir `persistSave(...)` por `markDirty(target, kind)` segundo a tabela do índice (abate → `character`+`inventory`+`progress` crítico; level up → +`skills`; entrada de dungeon, consumível, descarte, loja, venda, Reset/Evolução → crítico; atributos, skill, equip, barra → adiável).
14. `game/src/app/CityGameSession.ts` — cofre: trocar `enqueueVaultPersist`/`vaultPersistChain`/`persistAccountVault` por `markDirty("vault", "critical")` + seções do jogador tocadas.
15. `game/src/app/GameApp.ts` — idem; autosave por timer só grava alvos sujos.
16. `game/src/ui/WireGameBridge.ts` — idem.
17. `game/src/persistence/SaveService.ts` — `save()` imediato passa a delegar ao coordenador (ou sai, se sem uso).
18. `game/src/debug/DebugApi.ts` — idem.
19. `game/src/ui/GamePanels.ts` — idem (até plano 8 remover arquivo).
20. `game/src/app/CityGameSession.ts` — `applyBootCharacter`: gravação inicial via coordenador (crítico).

### F — Ciclo de vida flush

21. `game/src/persistence/SaveVault.ts` — `flush` com backoff finito e sem recursão imediata; crítico pendente não é descartado; remover ramo que grava perfil em texto puro.
22. `game/src/persistence/SaveVault.ts` — `logout`/`wipe*`: cancelar `debounceTimer`, `retryTimer`, `pendingPayload`; aguardar `flushChain`.
23. `game/src/app/GameApp.ts` — `dispose()` não desregistra `pagehide`/`visibilitychange`; `game/src/main.ts` — `beforeunload` não chama `app.dispose()`.
24. `game/src/app/GameApp.ts` — `pagehide` grava espelho síncrono já criptografado (perfil + cofre); `leaveToBoot` com timeout (provisório 3 s) e aviso se crítico não gravou.
25. `game/src/persistence/SaveVault.ts` — carga reconcilia IDB × espelho por `meta.updatedAt`.
26. `game/src/app/GameApp.ts` — `renderSaveStatus` mostra crítico pendente até gravar.

### G — Testes

27. `game/src/persistence/save-coordinator.test.ts` (novo) — store falso: AoE com 5 abates no mesmo frame = 1 transação; crítico durante flush grava logo depois; adiável não grava antes do debounce; skill learn inclui `skillLoadout`; `syncSlotSummary` × cofre intercalados não perdem atualização.
28. `game/src/persistence/save-vault.test.ts` (novo) — `flush` termina em tempo finito com store que sempre falha; logout com retry armado não grava depois; sem sessão não grava.
29. `game/src/persistence/crypto/crypto-codec.test.ts` (novo) — ida e volta AES-GCM (com `crypto.subtle`) e XOR (modo `file://`).
30. `game/scripts/save-harness.mjs` — cenários v4: gravar/ler seções; save v3 vira `absent`; falha persistente; wipe com flush pendente; espelho mais novo vence.
31. `game/scripts/smoke.mjs` — leitura do save direto no IDB passa para versão 3 e chaves `profile:<id>:*`.
32. `cd game && npm run test && npm run test:save`.
33. `cd game && npm run typecheck && npm run smoke`.

### H — Verificação

34. `rg "persistSave\(" game/src` — zero fora de `SaveCoordinator` e testes; registrar no PR tempo por save antes/depois (medição de #16).

## Testar

- [ ] Passos 32–33 verdes.
- [ ] Abate grava só alvos tocados, imediatamente (teste 27).
- [ ] Fechar aba logo após kill preserva XP e drop (manual).
- [ ] Storage sempre falhando: `leaveToBoot` volta em ≤ 3 s com aviso.
- [ ] Boot e `save-wipe.html` abrem o IDB sem `VersionError`; excluir slot remove todas as seções.

## Pendências

- Nenhuma.
