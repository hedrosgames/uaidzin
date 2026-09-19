# UAIDZIN

## Saves e Dados

Contrato vivo da persistência offline. Código: `game/src/persistence/` (`SaveVault`).

## Modelo

Conta → até 4 slots (`SlotSummary`) → um blob de personagem por `profileId` (`{user}:slot:{n}`).

Baú da conta (`AccountSave.vault`): ouro + itens **compartilhados** entre slots da mesma conta.

- **IndexedDB** `uaidzin` / store `save` — autoridade dos profiles.
- **LocalStorage** — mirror dos profiles + envelope da conta cifrado (`uaidzin_save_v1_{user}`) + preferências (`uaidzin_settings`).
- Backup rotativo `:prev` (última versão boa) por profile.
- Sem servidor.

## Isolamento

| Escopo | Conteúdo |
|---|---|
| Personagem | inventário, ouro no bolso, skills aprendidas, barra/loadout, attrs, XP, equipment, bolsas trancadas, buffs, arte/UI |
| Conta | baú (itens + ouro) |
| Global | opções do jogo (`uaidzin_settings`) — grava ao alterar |

## Sessão / cidade

- Posição ao carregar ou voltar à cidade: spawn do centro (`CityWorld`).
- HP e MP: sempre cheios ao entrar/voltar à cidade e ao carregar o save (não persiste vida parcial entre sessões).
- XP, inventário, skills, loadout, equipment, bags, buffs: persistem entre sessões.
- Nada de inventário/skills/ouro do bolso vaza entre slots.

## Schema (`saveVersion: 3`)

```text
SavePayload
  meta: profileId, userId, slotIndex, updatedAt
  character: name, classId, level, evolution, xp, attrs, hp, mp?, pontos/resets
  skills: classId, levels, eighthTree, specialization, skillPoints, specPoints
  skillLoadout: { slots: [{ skillId, tree, auto }] }
  equipment: equipped
  inventory: gold, items[]
  bags: { unlocked: boolean[4] }   // bolsa 0 sempre aberta
  buffs: [{ id, remainingSec, stacks, magnitude? }]
  progress: dungeonsUnlocked[], dungeonClears{}, quests{}
  options: {}

AccountSave (version 2)
  user, slots[4], vault: { gold, items[] }, updatedAt
```

`SlotSummary` (hub): profileId, classId, name, level, evolution, gold, resets, attrs.

Migrações `1→2→3` em `migrations.ts`. Schema desconhecido mais novo: tentar abrir e avisar.

## Fluxo conta → personagem

1. Sem sessão → login.
2. Com sessão → seleção; `active_char` só vale se o slot ainda existe.
3. Entrar grava `active_char` completo e carrega o blob; autoridade = `SavePayload`.
4. Todo `saveCharacter` synca o `SlotSummary`.
5. Excluir slot = wipe profile (atual + `:prev`) + zerar summary (baú da conta permanece).
6. Trocar personagem = flush + limpa `active_char` + seleção.
7. Logout = flush + limpa sessão + login.
8. Lembrar login = só `userId` (nunca senha).

## UI ← Save

Seleção, HUD e WireUi leem do save / summary / vault da conta. Arte via mapa `classId` → PNG. Trocar de slot troca arte, textos, inventário e loadout; baú permanece o da conta.

## Pontos de save

### Nunca

Meio de dungeon/arena; digitação parcial. Reload em dungeon → cidade com último save bom + HP/MP cheios + spawn.

### Hub

Login (migração XOR→AES), createSlot, deleteSlot, sync summary.

### Profile

1. Entrada na cidade  
2. Autosave 30s em CITY (pula se gravou há &lt; 5s)  
3. Mutação de painel (attr/skill/equip/refine/loja/reset/baú)  
4. Personagem novo (primeiro save)  
5. `pagehide` / `visibilitychange` em CITY  
6. Logout / trocar personagem  
7. `__UAIDZIN__.save.persist()`

### Conta (baú)

Depositar/sacar ouro ou mover item bag↔baú → `saveAccountVault` imediato + persist do personagem.

### Opções

Qualquer `input`/`change` em opções grava `uaidzin_settings` na hora.

### Coalesce

Fila por profile; `dirty` se save em voo; debounce 300ms; flush imediato no leave.

### Escrita

Serializar → cifrar → copiar atual para `:prev` → IDB → mirror LS → sync summary → status `saved`.

### Falha na gravação

Não apaga o bom; status `error`; retry 1s→3s→10s (3×); sessão em memória segue.

### Falha no load

IDB → LS → IDB `:prev` → LS `:prev` → seed do summary + download do corrompido quando disponível.

## Criptografia

- PBKDF2-SHA256, 100_000 iterações, salt 16B.
- AES-GCM-256 no HTTP do jogo; XOR só sem `crypto.subtle` (`file://`).
- Envelope `{ v, mode, iv?, data, at }`.
- Chave de sessão em `sessionStorage` — ofuscação offline, não DRM.

## Wipe / export

- `__UAIDZIN__.save.wipeProfile|wipeAccount|wipeAll`
- Tool: `http://127.0.0.1:5173/tools/save-wipe.html` (limpar conta remove slots + baú)
- Export/import JSON via `__UAIDZIN__.save.exportProfile` / `importProfile`

## Como estender

1. Campo novo no tipo → bump `saveVersion` → migration  
2. `persistSave` / `applySavePayload`  
3. Se visível no hub → `SlotSummary` + binder  
4. Caso no `npm run test:save`

Novo gatilho: só via `SaveVault.saveCharacter` / `saveAccountVault` (nunca IDB direto).

## Validação

`npm run test:save` — harness Playwright: conta→slots→enter→persist→isolamento→baú compartilhado→UI.  
Manual: trocar slots, grind e voltar à seleção, badge Salvando/Salvo, wipe, typecheck.
