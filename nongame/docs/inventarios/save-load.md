# Save / Load — inventário D11 / D11b

Documento de discovery **versionado no repo** (`docs/inventarios/save-load.md`). Depois de ler isto, dá para responder o que grava, o que carrega e o que se perde no F5 **por cena**, sem abrir o código.

**IDs:** D11 (conteúdo) · **D11b** (path visível fora da conversa — este arquivo + entradas em `INDEX.md`).  
**Fontes:** `DECISOES-DESIGN.md` (SAVE + F5 dungeon) · `22-saves-e-dados.md` · `AGENTS.md` · runtime `SaveVault` / `GameApp` / `CityGameSession` / `save-store.js` (cruzamento design × código).  
**Conflito GDD × grill:** o grill vence.  
**D10:** regra de produto F5 fechada abaixo — aguarda validação do Felipe.

---

## D10 — Decisão F5 (produto)

**Status:** regra fechada no doc (grill vence). Aguarda validação do Felipe antes de marcar DoD/grill `[x]`.

**Definição de “F5” neste doc:** reload do **navegador** (botão reload / Ctrl+R / fechar e reabrir a aba). Não é a tecla F5 do teclado no runtime (ver nota abaixo).

### Regra única por cena

| Cena | Após reload do navegador |
|---|---|
| **Login** | Continua no login (sem sessão) ou na mesma tela de login |
| **Seleção** | Com sessão na aba → volta à seleção. Sem sessão → login |
| **Cidade** | Reentra o mesmo personagem (`active_char`) na cidade com o **último save** válido; spawn fixo (posição não salva) |
| **Dungeon** | **Não** retoma a run. Sai para a **cidade** com o **último save** válido (grill SAVE / F5 dungeon) |

Persistência na run (XP / ouro / item a cada ganho) é regra de SAVE do grill; **D12** fecha no código com `persistSave(true)` ao fim de cada `grantKillXp` (kill com XP/ouro/item). O destino pós-reload na dungeon **não** depende disso: sempre cidade + o que já estiver no disco.

Posição: **nunca** grava (cidade nem dungeon).

### Alternativa descartada

| Alternativa | Status | Motivo |
|---|---|---|
| F5 na cidade/dungeon = **logout** (limpa sessão e manda ao login) | **Fora** — não é produto padrão | Contradiz o grill (reentrada com último save / `active_char`). Logout continua só pelo fluxo explícito do hub |

### Nota — tecla F5 no runtime ≠ produto

Com o jogo focado, a tecla **F5** do teclado hoje dispara **debug de reset** (`preventDefault`), não o reload do browser.  
Produto e testes de D10 falam de **reload do navegador**. Atalho de teclado F5 = ferramenta de debug; não redefine a política de persistência.

---

## O que o jogo sempre lembra (design)

| Escopo | Conteúdo |
|---|---|
| Conta | Login, senha (hash), baú compartilhado (ouro + itens), slots (até 4) |
| Personagem | Nome, classe, nível, evolução, XP, atributos, skills, loadout, equip, inventário (bolso), ouro do bolso, bolsas, buffs, dungeons liberadas, clears, quests |
| Preferências | Áudio, toggle de confirmação de dungeon, FPS e afins (`uaidzin_settings`) |
| Posição | **Não** grava. Cidade = spawn fixo. Grill (SAVE): dungeon ao “recarregar” = **início** da run; F5 na dungeon = **cidade** com último save. Boot atual pós-reload: **sempre cidade** (não retoma dungeon) |

HP/MP: design e `22-saves-e-dados.md` pedem **cheios** ao entrar/voltar à cidade (e “não persiste vida parcial entre sessões”). O blob ainda pode guardar HP/MP; ao entrar na cidade o runtime cura full.

Apagar personagem: só o blob + summary daquele slot. Baú e outros chars intactos.

---

## Onde mora o dado

| Camada | O quê |
|---|---|
| Hub (login/seleção) | `public/boot/assets/save-store.js` — **gerado** pelo Vite (IIFE, API `UaidzinSave`) a partir de `src/persistence/bootEntry.ts`; mesmo `SaveVault` do runtime. Não versionado |
| Runtime (cidade/dungeon) | `SaveVault` → IndexedDB `uaidzin` (versão **3**, store `sections`) + espelho em LS |
| Conta (v3) | IndexedDB `account:{user}:slots` e `account:{user}:vault` (cifrados) |
| Registro de login | LocalStorage `uaidzin_accounts_v1` (salt + hash) |
| Sessão (aba) | `sessionStorage`: `uaidzin_session_v1` (chave), `uaidzin_active_char` (quem entrou) |
| Preferências | LocalStorage `uaidzin_settings` |
| Lembrar login | Só `userId` (nunca senha) |

Autoridade do personagem em jogo = `SavePayload` (perfil v4). O resumo do slot só regrava quando algum campo do resumo muda.

### Formato e chaves

| Registro | Chave | Conteúdo |
|---|---|---|
| Perfil v4 (10 seções) | `profile:{user}:slot:{n}:{seção}` | `meta` (inclui `saveVersion`), `character`, `skills`, `skillLoadout`, `equipment`, `inventory`, `bags`, `buffs`, `progress`, `options` |
| Slots da conta | `account:{user}:slots` | `{ version: 3, user, slots[4], updatedAt }` — `SlotSummary` com `saveVersion` |
| Cofre da conta | `account:{user}:vault` | `{ version: 3, user, vault: { gold, items }, updatedAt }` |
| Espelho do perfil | LS `uaidzin.mirror.{user}:slot:{n}` | Seções cifradas da última escrita tentada |
| Espelho do cofre | LS `uaidzin.mirror.vault.{user}` | Envelope do cofre da última escrita tentada |

- Tudo cifrado (AES-GCM; XOR só em `file://`) **antes** de abrir a transação. Sem sessão, nada grava.
- Perfil `saveVersion < 4` ou conta `version < 3` = **ausente** (sem migração): seleção vazia; lab **admin/admin** recriado pelo `bootstrap()`. A chave antiga `uaidzin_save_v1_{user}` não é mais lida.
- `loadAccount`: falha de leitura ou de decifrar **lança** e nunca grava; conta ausente não é gravada na leitura.
- Cofre + inventário (ouro/item cruzando a fronteira) vão na **mesma** transação IDB, junto do resumo do slot quando ele muda.
- Espelho: gravado no `pagehide` (perfil + cofre). Na carga, vence o IDB só se for mais novo (`updatedAt`, carimbo monotônico semeado pelo que foi carregado); perfil vindo do espelho é regravado nas seções. O espelho do cofre sai do LS assim que o cofre grava no IDB. O espelho nunca guarda a lista de slots (não ressuscita slot excluído).
- Durante a sessão a conta decifrada fica em memória (fonte de verdade; o lock garante um escritor por conta) e só é atualizada por escrita própria. Releitura do IDB só na carga do personagem e no boot.

### Política crítico × adiável (`SaveCoordinator`)

| Classe | Eventos | Regra |
|---|---|---|
| Crítico | abate com XP, drop, level up, cofre, comprar, vender, consumir entrada, consumível, descartar, Reset, Evolução, criar personagem | Grava na hora; eventos do mesmo frame viram uma escrita; falha fica pendente e visível até gravar |
| Adiável | atributos, aprender skill, equipar, barra, bolsa, `options` | Debounce **2 s (provisório)** ou próximo crítico/saída |

Fila única (`SaveVault`) para perfil, cofre e slots: criar, excluir, wipe e import passam por ela.

### Uma conta por aba

- Lock `uaidzin:account:{user}` (`navigator.locks`, segurado pela vida da aba) adquirido pelo **documento pai** (`BootFlow`) em todo caminho: login pelo iframe, personagem guardado no `sessionStorage` e `__UAIDZIN_SKIP_BOOT__` (só DEV).
- Segunda aba ou aba duplicada na mesma conta: login recusado com “Esta conta já está aberta em outra aba.”; não carrega o jogo nem grava. Contas diferentes em abas diferentes entram.
- Liberado em logout, troca de personagem/conta e ao fechar a aba.
- Sem `navigator.locks`: `BroadcastChannel` + heartbeat em LS `uaidzin.lock.{user}`; expira sem renovação em **5 s (provisório)**. Quem pede o lock anuncia no canal e espera **300 ms (provisório)**; quem segura responde por um worker dedicado (não depende do thread principal ocupado com o render); aba recusada não deixa heartbeat. Volta do bfcache readquire o lock ou recarrega.
- Páginas do boot abertas fora do iframe do jogo redirecionam para `/`.
- Cadastro/login serializados pelo lock `uaidzin:accounts` (a lista de contas não perde registro com duas abas).

---

## Quando grava

### Hub (login / seleção) — `save-store.js`

| Momento | O que grava |
|---|---|
| Login ok | Sessão na aba (depois do lock de conta no documento pai) |
| Criar slot | Só o resumo daquele slot, na mesma transação que limpa o perfil do slot |
| Excluir slot | Resumo nulo + perfil apagado na mesma transação |
| Entrar no jogo | `uaidzin_active_char` na sessão (não é o blob completo) |
| Lembrar usuário | Só userId persistente |
| Logout | Limpa sessão (e active char no fluxo do hub) |

### Runtime — personagem (`persistSave` → `SaveVault.saveCharacter`)

| Momento | Gatilho |
|---|---|
| Entrada na cidade | `enterWorld("city")` e transição de modo para `CITY` |
| Volta à cidade pós-run | Após hold de resultado / morte / saída (flush ao reentrar) |
| Level up / loot / XP / ouro em **run** | `grantKillXp` → `persistSave(true)` a cada kill (XP/ouro/item); level up também flusha no mesmo caminho |
| Autosave | A cada **30 s** se `modeAllowsSave` e não gravou há &lt; 5 s |
| Aba escondida / pagehide | Se `modeAllowsSave` |
| Mutação de painel | Attr / skill / equip / loja / refine / reset (painéis) |
| Baú | Depositar/sacar ouro ou mover item → vault da conta **+** personagem |
| Personagem novo (primeiro blob) | `applyBootCharacter` |
| Sair para boot | Trocar personagem / deslogar (flush) |
| Manual / debug | `__UAIDZIN__.save.persist()` |

`modeAllowsSave` no código atual: só **`CITY`** e **`DUNGEON`**. Autosave e pagehide usam esse predicado; em `DEAD` / `RESULT` / `BOOT` etc. **não** autosavam.

### Design (grill) vs código — run de dungeon

| Regra do grill | Código hoje |
|---|---|
| Persistir XP / ouro / item **a cada ganho relevante** na run | **D12:** `grantKillXp` chama `persistSave(true)` após XP + loot do kill |
| F5 / sair na dungeon → cidade com **último save válido** | Reload do app: boot com `active_char` → `loadSave` → **sempre cidade** (`start` → `enterWorld("city")`). O “último save” inclui ganhos da run flushed no kill |

---

## Quando carrega

| Momento | O que carrega |
|---|---|
| Boot do app | Bootstrap da conta lab se storage limpo; sessão se existir na aba |
| Login | Conta + slots do envelope |
| Seleção | Slots; empty-state se nenhum |
| Entrar no jogo | `loadCharacter` do profile; se faltar blob, seed a partir do summary do boot e grava |
| Cidade | Spawn centro; HP/MP full ao entrar na cidade |
| Preferências | Ao abrir Settings / boot das telas que leem `uaidzin_settings` |
| Falha de load | Três estados: `found`, `absent`, `error`. `error` (inclui conta ilegível) não cria personagem nem grava por cima; oferece Tentar de novo |

---

## Tabela F5 por cena (produto D10 + efeito no save)

Alinhada à seção **D10**. “F5” = reload do navegador.

| Cena | Destino pós-reload (produto) | O que **não** se perde (já no disco / sessão) | O que se perde / reseta |
|---|---|---|---|
| **Login** | Login (mesma tela / sem sessão) | Contas e saves no LocalStorage/IDB; “lembrar usuário” (userId) | Texto digitado e não enviado; senha na tela |
| **Seleção** | Seleção se sessão ok; senão login | Sessão da aba; slots/baú no envelope; blobs de profile | Seleção visual / formulário de create não confirmado; `active_char` só existe depois de Entrar |
| **Cidade** | Mesmo char na cidade + último save; spawn fixo | Blob do personagem (último save: painéis, autosave 30 s, pagehide). Conta/baú/preferências | Posição no mapa; estado de UI; digitação parcial; HP/MP parcial (cidade cura full). Mutações sem flush se pagehide falhar |
| **Dungeon** | **Cidade** + último save; **não** retoma run | Ganhos flushed no kill (D12) + autosave / pagehide / save anterior. Conta intacta | Run em curso (timer, inimigos, fase, posição). Sem retomar dungeon |

---

## Fluxo resumido (jogador)

```text
Login → Seleção (create/delete grava conta)
  → Entrar (active_char + load blob)
  → Cidade (spawn fixo; saves frequentes)
  → Dungeon (estado de run efêmero; design: flush de XP/ouro/item na hora)
  → Volta cidade (save) | Morte → cidade (save)
  → Reload na dungeon (produto D10): cidade + último save
```

Wipe: `tools/save-wipe.html` e `__UAIDZIN__.save.wipe*`.

---

## Lacunas / contradições (só documentar — sem corrigir neste ID)

1. **`22-saves-e-dados.md`:** “Nunca meio de dungeon”. **`GameApp.modeAllowsSave`:** inclui `DUNGEON` (autosave + pagehide + flush no kill D12). Contrato desatualizado em relação ao código.
2. **Grill F5 dungeon = cidade + último save:** boot já força cidade; com D12 o “último save” acompanha cada kill.
3. **HP/MP no blob:** gravados e reaplicados no load; cidade chama `healFull`. Contrato diz “não persiste vida parcial entre sessões” — na prática o valor no disco pode existir, mas a cidade zera o efeito.
4. **Ouro default `?? 100`:** `applyBootCharacter` e create de slot no vault usam `gold ?? 100` se faltar valor — design de char novo é **0 ouro** (grill / AGENTS). Risco se summary/boot vier incompleto.
5. **Tecla F5 = debug reset** com jogo focado — distinta do reload de produto. Distinção documentada em **D10**; não muda a política de cena.
6. **Design “recarregar dungeon = início”** vs **F5 = cidade:** o grill tem as duas frases; consequência prática F5 (SAVE) = cidade. Boot e **D10** seguem a frase F5, não “retomar dungeon no início”.

---

## Como manter este doc

- Mudou gatilho de save → atualizar tabelas “Quando grava” e F5.
- Felipe mudou a regra D10 → editar a seção **D10 — Decisão F5 (produto)** e a tabela F5; não reabrir “logout como padrão” sem decisão explícita.
- Contrato longo continua em `22-saves-e-dados.md`; este arquivo é a visão **por cena / F5**.
- Path canônico para “o que se perde no F5”: [`docs/inventarios/save-load.md`](save-load.md) (também em `INDEX.md` §2 e mapa “quero…”).
