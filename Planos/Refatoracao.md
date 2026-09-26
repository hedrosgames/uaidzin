# Refatoração — implementação

Executar passos **1 → 11** na ordem. Cada passo = concluir **todos** os passos do plano filho indicado. Código em `game/` sem comentários.

## Comportamento

- Objetivo: reduzir acoplamento e bugs estruturais em save, sessão, input, HUD, itens, wire e render — **sem** mudar ids de skill, item, dungeon ou world — e fechar as issues #9–#50 listadas em cada plano filho.
- Jogo **não lançado**: saves anteriores ao formato novo **não** são migrados nem compensados. Perfil com `saveVersion < 4` ou conta com `version < 3` é tratado como `absent` (sem crash, sem gravar por cima antes do jogador confirmar personagem novo); lab **admin/admin** é recriado pelo `bootstrap()`.
- Personagem novo: atributos **5/5/5/5**, **0 ouro** (`AGENTS.md`); normalização única antes de qualquer `apply`.
- `loadSave`: três resultados — `found`, `absent`, `error`; **error** não cria personagem nem grava por cima.
- Gravação: um coordenador (`SaveCoordinator`); flush por **seção** do perfil; perfil v4 inclui `meta`, `character`, `skills`, `skillLoadout`, `equipment`, `inventory`, `bags`, `buffs`, `progress`, `options`.
- Política de save (única, usada por todos os chamadores):

| Classe | Eventos | Regra |
|---|---|---|
| Crítico | abate com XP, drop de item/ouro, level up, mover ouro/item para/do cofre, comprar, vender, consumir item de entrada de dungeon, usar consumível, descartar item | `checkpoint()` imediato; eventos do **mesmo frame** viram uma escrita; nunca adiar; falha fica pendente e visível até gravar |
| Adiável | distribuir atributos, aprender skill, equipar/desequipar, montar barra, opções | `markDirty` + debounce (provisório 2 s) ou próximo crítico/saída |

- Conta: registros separados `slots` e `vault`; cofre + inventário na **mesma** transação IDB quando ouro/item cruza fronteira. Criptografia (AES-GCM; XOR só em `file://`) roda **antes** de abrir a transação.
- Boot e runtime: **uma** versão de IndexedDB e o mesmo módulo de storage (boot gerado a partir do runtime).
- Uma conta por aba: lock **por conta** adquirido no login; segunda aba (ou aba duplicada) é **recusada** no login com mensagem — sem modo somente leitura e sem assumir controle. `navigator.locks`; fallback `BroadcastChannel` + heartbeat (provisório 5 s).
- Jogo só carrega depois do login e da seleção de personagem, com tela de carregamento.
- Input: atalhos **C/K/I** iguais na cidade e na dungeon; `interact` só com UI fechada; nada dispara com foco em `input`/`textarea`/`[contenteditable=true]` nem com Ctrl/Meta/Alt.
- Debug: só `import.meta.env.DEV`. Sem `window.__UAIDZIN_DEBUG__`, sem `?debug=1`, sem atalho F1–F9 em produção; **F5** nunca capturado.
- Tick: exceção → `ErrorReporter`, loop continua; **5** frames seguidos com erro → `checkpoint` crítico + volta para a **cidade** (sem toast “tentar continuar”, sem voltar à seleção).
- Item de entrada da dungeon: consumido ao usar e gravado na hora (crítico); **sem devolução** se a entrada falhar.
- XP no nível máximo: descartado; `xp` não passa de `xpToNext`; UI mostra “MAX”; sem campo de excedente.
- DoT: tick por tempo a cada **3 s** (provisório, constante em `game/src/data/balance/`); fração restante aplicada na expiração; dano total = `dotDps × dotSec`.
- Skills **sem nível**: aprender é uma vez; nada de “Melhorar”, `levelCap` ou bônus por nível. Prevalece sobre `Planos/Skill TK linhagem 1.md` (economia “teto nível 10”, passo **19** e checklist “Melhorar 1→10”).
- Loja: estoque **infinito** (sem `qty` exibido nem decrementado); preço de venda ≤ preço de compra; `machado_leve` custa **0** e vende por **0**.
- Venda: no NPC (Mercador/Ferreiro) **e** na bolsa, sempre com confirmação.
- Item que não cabe: recusado com aviso; compra não cobra; drop recusado é **perdido** (não fica no chão); limite **999** por stack.
- `GamePanels.ts` só sai depois de existirem na `WireApi`: aprender skill (ouro + save), vender (NPC e bolsa, com confirmação), Reset/Evolução e refino +1 no Ferreiro.
- Lista de ciclo de vida VFX: `Planos/Skill TK linhagem 1.md` passo **23** — **não** duplicar em `Refatoracao 9.md`.
- Testes cobrem AES-GCM (HTTP) e XOR (`file://`).

| Plano filho | Foco | Issues fechadas |
|---|---|---|
| `Refatoracao 1.md` | Vitest + normalizar + carregar | #30 #39 (base) #48 |
| `Refatoracao 2.md` | Coordenador + seções IDB + boot na mesma versão | #16 #23 #24 (+#22 perfil) |
| `Refatoracao 3.md` | Conta v3 + boot gerado + lock de conta + BootFlow seguro | #22 #28 #29 #49 |
| `Refatoracao 4.md` | Input + tick + HUD diff + settings | #13 #17 #45 (loop) #46 #47 (+#43 atalhos) |
| `Refatoracao 5.md` | Itens, equip, ouro, loja, skills sem nível | #32 #33 #36 #37 #38 #40 (domínio) #41 #42 #50 (domínio) |
| `Refatoracao 6.md` | Extrair módulos de `CityGameSession` | #14 #19 #27 #34 #44 (+#45 fade/entrada, #50 cofre) |
| `Refatoracao 7.md` | `WireApi` injetada + telas que faltam | #31 #35 (+#39 UI, #40 UI, #32 UI) |
| `Refatoracao 8.md` | Wire TS + remover legado | #43 |
| `Refatoracao 9.md` | VFX registro (após TK1 passos 23 e 28) | #9 #12 |
| `Refatoracao 10.md` | Views async + diff + jogo após login | #10 #15 #21 #25 #26 (+#20 carga) |
| `Refatoracao 11.md` | Render e seletor de qualidade gráfica | #11 #18 #20 |

## Passos

1. Executar `Planos/Refatoracao 1.md` passos **1 → 17**.
2. Executar `Planos/Refatoracao 2.md` passos **1 → 26**.
3. Executar `Planos/Refatoracao 3.md` passos **1 → 18**.
4. Executar `Planos/Refatoracao 4.md` passos **1 → 26** (coordenar com `Skill TK linhagem 1.md` passos **6–7** se barra 10 ainda pendente).
5. Executar `Planos/Refatoracao 5.md` passos **1 → 25**.
6. Executar `Planos/Refatoracao 6.md` passos **1 → 27**.
7. Executar `Planos/Refatoracao 7.md` passos **1 → 18**.
8. Executar `Planos/Refatoracao 8.md` passos **1 → 19**.
9. Executar `Planos/Refatoracao 9.md` passos **1 → 11** (após `Skill TK linhagem 1.md` passos **23** e **28**).
10. Executar `Planos/Refatoracao 10.md` passos **1 → 17**.
11. Executar `Planos/Refatoracao 11.md` passos **1 → 12**.

## Testar

- [ ] Após cada plano filho: `cd game && npm run typecheck && npm run test && npm run smoke`; planos 1–3 também `npm run test:save`; planos 8 e 11 também `npm run build`.
- [ ] Passos 1–3: save v4 e conta v3 gravam e recarregam; save antigo vira `absent` sem crash; segunda aba recusada no login.
- [ ] Passos 4–6: `npm run bot`; combate/equip/inventário estáveis; 5 erros seguidos no tick salvam e voltam para a cidade.
- [ ] Passos 6–8: login → cidade → Mestre/comprar skill/vender/cofre/refino/Reset sem `window.__UAIDZIN_WIRE__` nem `GamePanels` em produção.
- [ ] Passos 9–11: `npm run vfx:runtime:qa`, `npm run check:model-lab` e presets Baixo/Médio/Alto verdes.
- [ ] Cada issue da tabela acima: critérios de aceitação do Complemento da issue marcados antes de fechar.
