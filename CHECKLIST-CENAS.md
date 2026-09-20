# Checklist de cenas — Finalização de sistemas

Validação funcional cena a cena. Marcar `[x]` só quando o **comportamento** passar no navegador (e o visual, quando for o critério). Pendência fica em `[ ]` com nota.

Legenda de status da cena: `Em spec` · `Em implementação` · `Validando` · `Fechada` · `Bloqueada`.

---

## Cena 1 — Login

**Status:** Em spec  
**Tela:** `visual/telas/01-login.html` · runtime `game/public/boot/01-login.html`  
**Visual:** aprovado pelo Felipe (sem redesenho)

### Funcionalidades (aceite)

| # | Item | Como validar | Estado |
|---|---|---|---|
| 1.1 | Visual aprovado | Revisão do Felipe; nada muda na estética sem pedido | `[x]` aprovado |
| 1.2 | Settings abre como esperado | Engrenagem → modal Opções (áudio, vídeo, controles) por cima do login; Fechar/Salvar funcionam | `[ ]` |
| 1.3 | Conta única criada no boot | Boot limpo (`save-wipe` + reload) → só a conta `admin` existe (sem contas extras fantasma) | `[ ]` |
| 1.4 | Google cria conta nova | Clicar Google → **nova** conta é criada (não reutiliza admin); save dessa conta zerado | `[ ]` |
| 1.5 | admin/admin → seleção | Login `admin` / `admin` → abre `02-selecao-personagem.html` (ou o fluxo de seleção no runtime) | `[ ]` |
| 1.6 | Botão “Criar conta” | Abaixo do Google há CTA **Criar conta** (retângulo, não escudo) | `[ ]` |
| 1.7 | Modo criar muda o CTA | Ativar “Criar conta” → botão principal passa de **Entrar** para **Criar**; voltar ao modo login restaura **Entrar** | `[ ]` |
| 1.8 | Criação sem e-mail | No modo Criar: só login + senha (confirmação de senha se fizer sentido no protótipo); **sem** campo de e-mail por agora | `[ ]` |
| 1.9 | Conta nova = save zerado | Após criar e entrar: seleção sem personagem / empty-state “Criar Personagem”; vault/ouro zerados; nenhum slot herdado de outra conta | `[ ]` |
| 1.10 | Login duplicado proibido | Criar conta com login que já existe → **erro claro**, conta existente não é alterada, senha antiga continua valendo | `[ ]` |
| 1.11 | Credenciais | Login errado → erro; login certo de conta nova criada → entra; “Salvar credenciais” guarda só o usuário (nunca senha) | `[ ]` |

### Comportamento detalhado esperado

1. **Boot** — `bootstrap()` garante a conta padrão `admin`/`admin`. Com storage limpo, **existe uma única conta**.
2. **Entrar** — só login de conta existente. `admin`/`admin` vai para seleção de personagem.
3. **Google (simulado)** — não preenche admin. Cria/loga em uma **conta Google nova** local (id estável, ex. `google:<id>` ou um login simulado próprio), save zerado. Repetir Google na mesma máquina reutiliza **essa** conta Google, não admin.
4. **Criar conta (manual)** — botão abaixo do Google alterna modo. Em modo criar, o submit grava conta nova com login+senha (PBKDF2 ou o que o `save-store` já usa). Sem e-mail. Sem sobrescrever contas.
5. **Duplicado** — se `userId` já existir, o modo criar **não** chama caminho que “devolve a conta antiga”; recusa e mostra erro. `ensureAccount` sozinho **não** serve como API de registro (hoje ele é idempotente por design).
6. **Save zerado** — conta nova não tem envelope de personagem; seleção mostra empty-state.

### Lacunas no código (hoje)

| Lacuna | Onde | O que falta |
|---|---|---|
| Google não cria conta | `01-login.html` handler `#btnGoogle` | Criar/logar conta Google nova em vez de preencher `admin` |
| Sem UI de registro | `01-login.html` | Botão Criar conta + alternância de modo + submit de registro |
| Sem recusa de duplicado | `save-store.js` `ensureAccount` | API de registro que falha se `acc[userId]` existir (ex.: `registerAccount`) |
| Empty-state da conta nova | seleção / save | Garantir que login de conta recém-criada abre seleção vazia |
| 1.2 settings | protótipo | Validar abertura/fechamento e persistência de `uaidzin_settings` no fluxo real |

### Fora do aceite da Cena 1

- E-mail, recuperar senha real, OAuth de verdade.
- Múltiplas contas de jogador no produto (protótipo local basta).
- Mudar o visual aprovado.

### Validação (quando implementar)

- [ ] Playwright no boot/login: wipe → bootstrap → só admin; criar conta nova; login admin; login conta nova; duplicado recusa; Google cria conta ≠ admin.
- [ ] Releitura do HTML editado (sem emoji, escudo só no Entrar/empty-state).
- [ ] Felipe valida o visual do modo Criar (botão abaixo do Google + rótulo do CTA).

---

## Cena 2 — Seleção de personagem

**Status:** Em spec  
**Tela:** `visual/telas/02-selecao-personagem.html` · runtime `game/public/boot/02-selecao-personagem.html`  
**Tarefas abertas:** `TAREFAS-ABERTAS.md` → S1–S8

### Funcionalidades (aceite)

| # | Item | Como validar | Estado |
|---|---|---|---|
| 2.1 | Conta sem personagens → empty-state **Criar Personagem** | Login em conta nova / wipe → botão escudo aparece | `[x]` check Felipe |
| 2.2 | Slot vazio / lista → criar | Clicar empty-state ou slot “+” abre modal Criar Mortal | `[x]` esperado OK |
| 2.3 | Trocar personagem | Clicar no char 3D ou card da lista → painel direito com status | `[ ]` quebrado após delete (bug 2.8) |
| 2.4 | Deletar personagem | Excluir → slot limpa na hora; conta persiste sem o char | `[ ]` validar persistência |
| 2.5 | Modal criar: PNG → **3D idle** por classe | Abrir criar → caixa das classes mostra modelo 3D em idle (não `char-*.png`) | `[ ]` |
| 2.6 | Nome 3–12 letras | `Criar` só habilita com nome `trim` no intervalo; fora disso bloqueio | `[ ]` hoje aceita ≥2 e maxlength 16 |
| 2.7 | Status à direita por personagem | Novo char: status do **padrão da classe**; char salvo: dados da conta | `[ ]` |
| 2.8 | **Bug:** delete 2º + clicar 1º → painel direito vazio | Depois do delete, selecionar o sobrevivente preenche nome/atributos/status | `[ ]` |
| 2.9 | Criar/excluir grava na conta **na hora** | create/delete → reload da página mantém o estado; sem “salvar depois” | `[ ]` |
| 2.10 | Fade in/out preto entre cenas | Login→seleção e seleção→cidade (e retorno, se houver) com overlay preto fade-in/fade-out | `[ ]` |
| 2.11 | Idle do **TK** = idle do **BM** | No roster/modal 3D, TK toca a mesma animação de idle do BM (não o clip embutido atual do TK) | `[ ]` |
| 2.12 | **Deslogar** no Settings da seleção | Opções → botão Deslogar → limpa sessão e volta ao login | `[ ]` hoje só Fechar/Salvar |

### Comportamento detalhado esperado

1. **Empty-state** — sem slots → “Criar Personagem” (escudo). Com slots → lista + cena 3D.
2. **Criar** — modal com nome + 4 classes. A **caixa de arte da classe** (hoje PNG em `.class-opt .art`) usa **3D idle** via `mountCharPreview` (mesmo motor do roster: GLB por classe + primeira animação).
3. **Nome** — `min=3`, `max=12` (contagem em letras úteis após `trim`; validar no botão e no submit).
4. **Status à direita** — `renderInfo` sempre com objeto slot íntegro: atributos da classe no create (`CLASSES[id].base`), depois o que está salvo na conta (`attrs`, `trees`, `spec`, `gold`, `level`…). Painel nunca fica em branco com um slot válido selecionado.
5. **Bug do painel vazio** — raiz provável: `save-store.js` `normalizeSlots` **descarta** `trees`/`spec` (e pode achatá-los no `saveData` → `loadSave` → `deleteSlot`). `renderInfo` lê `slot.trees.controle` e quebra → painel “—” / vazio. Corrigir na **origem** (persistir slot completo + default de classe no load), não só no sintoma do template.
6. **Persistência imediata** — create e delete chamam o mesmo caminho de conta (envelope da conta / slots). Reload não pode perder personagem recém-criado nem “ressuscitar” o excluído. `trees`/`spec`/attrs da classe precisam sobreviver ao round-trip.
7. **Fade de cena** — overlay preto: fade-in antes de trocar a tela (login↔seleção↔cidade via `BootFlow` / postMessage), fade-out ao entrar na cena nova. Não confundir com o fade do painel do login (`.stage.leaving`).
8. **Idle TK = BM** — preview 3D do TK usa o **mesmo clip de idle** do BM. `char-preview.mjs` hoje toca `gltf.animations[0]` do GLB da classe; TK precisa apontar para a animação do `BM.glb` (ou clip equivalente carregado do BM) mantendo o **modelo/textura do TK**.
9. **Deslogar** — no modal Opções da seleção, além de Fechar/Salvar, botão **Deslogar**: `UaidzinSave.logout()` / limpa `uaidzin_session_v1` + sessão ativa, fecha o overlay e leva ao login (`01-login.html` ou `uaidzin-boot-need-login` no `BootFlow`). Sem texto de tutorial; retângulo, não escudo.

### Lacunas no código (hoje)

| Lacuna | Onde | O que falta |
|---|---|---|
| PNG no modal criar | `02-selecao-personagem.html` `renderClassPick` | Montar `mountCharPreview` nas `.class-opt` (ou trocar por um preview 3D só da classe selecionada — Felipe disse “cada classe”) |
| Nome 2–16 | `#newName` `refreshCreateBtn` / submit | minlength 3 / maxlength 12 + validação 3–12 no submit |
| Status vazio pós-delete | `save-store.js` `normalizeSlots` + `renderInfo` | Preservar `trees`/`spec`; completar com `CLASSES[classId].base` no load se faltar |
| Persist incompleta | `saveData` / `normalizeSlots` do save-store | Slot completo no envelope da conta |
| Sem fade preto | `BootFlow.ts` + `02-selecao-personagem.html` (+ login) | Overlay de transição nas trocas de cena |
| Idle TK ≠ BM | `char-preview.mjs` `MODEL` / `animations[0]` | TK preview deve tocar idle do BM (modelo TK permanece) |
| Sem Deslogar | `02-selecao-personagem.html` `#overlaySettings` | Botão + `UaidzinSave.logout()` → login |

### Fora do aceite da Cena 2

- Redesenhar a moldura da seleção.
- 5º slot / mais de 4.
- Validar balanceamento dos atributos além do padrão de classe.

### Validação (quando implementar)

- [ ] Playwright: conta vazia → criar com nome 2 letras (bloqueado), 3 (ok), 13 (bloqueado); 3D no modal; criar dois chars; excluir o 2º; clicar o 1º → status preenchido; reload → estado consistente.
- [ ] Fade visível login → seleção e seleção → cidade.
- [ ] Felipe valida 3D idle no modal e o painel direito após delete.

---

## Cena 3 — (aguardando)

---

## Cena N — (aguardando)

Template ao receber a próxima cena:

```markdown
## Cena N — <nome>

**Status:** Em spec
**Tela / runtime:** …

### Funcionalidades (aceite)
| # | Item | Como validar | Estado |
|---|---|---|---|
| N.1 | … | … | `[ ]` |

### Comportamento detalhado esperado
…

### Lacunas no código (hoje)
…
```
