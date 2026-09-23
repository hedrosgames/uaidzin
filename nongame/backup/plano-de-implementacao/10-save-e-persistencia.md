# 10. Save e Persistência

## Fase 9 — contrato implementado

Offline. Autoridade: `SaveVault` (`game/src/persistence/`). Ver `22-saves-e-dados.md`.

## Payload (`saveVersion: 3`)

Classe, evolução, nível, atributos, skills, especialização, 8ª, loadout da barra, equipamentos, inventário, ouro, bolsas, buffs, resets, progress (dungeons/quests stubs), opções, `meta.profileId`.

Conta: `vault` compartilhado (ouro + itens) em `AccountSave` v2.

## Serviço

- `SaveVault` único ponto de entrada (auth, slots, character, wipe, status).
- `SaveService` é fachada fina para compatibilidade.
- Domínio não fala com IndexedDB.
- LocalStorage: preferências + mirror + envelope da conta.

## Versionamento

Migrações `1→2→…` em `migrations.ts`.

## Export/import

`__UAIDZIN__.save.exportProfile` / `importProfile`. Modal de produto ainda pendente.

## Corrupção

IDB → mirror LS → `:prev` → seed do SlotSummary.

## Reload na dungeon

Personagem em **cidade** com recursos da última escrita válida.

## Validação

`npm run test:save`. Fechar aba, reabrir, continuar. Wipe em `/tools/save-wipe.html`.

## Gaps restantes

- UI de quests/dungeon unlock preenchendo `progress.*`
- Modal polido de export/import
- Contas além de admin na UI de registro (`ensureAccount` já existe)

## Saída

Persistência criptografada local sem servidor.
