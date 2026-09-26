# Refatoração — implementação

Executar passos **1 → 12** na ordem. Cada passo = concluir **todos** os passos do plano indicado. Código em `game/` sem comentários.

## Comportamento

- Objetivo: reduzir acoplamento e bugs estruturais em save, sessão, input, HUD, itens, wire e render — **sem** mudar ids de skill, item, dungeon ou world — e fechar as issues #9–#50 listadas em cada plano filho.
- Jogo **não lançado**: saves anteriores ao formato novo **não** são migrados nem compensados. Perfil com `saveVersion < 4` ou conta com `version < 3` é tratado como `absent` (sem crash, sem gravar por cima): a seleção aparece vazia e o jogador cria o personagem de novo — criar é a confirmação. Lab **admin/admin** é recriado pelo `bootstrap()`.
- Personagem novo: atributos **5/5/5/5**, **0 ouro** (`AGENTS.md`); uma função de normalização (`normalizeSavePayload`, idempotente) usada na carga e no `apply`; atributos/ouro/nível vindos do boot são ignorados.
- `loadSave`: três resultados — `found`, `absent`, `error`; **error** não cria personagem nem grava por cima e oferece Tentar de novo.
- Gravação: um coordenador (`SaveCoordinator`) com fila única para perfil, cofre e slots; flush por **seção** do perfil; perfil v4 inclui `meta`, `character`, `skills`, `skillLoadout`, `equipment`, `inventory`, `bags`, `buffs`, `progress`, `options`.
- Política de save (única, usada por todos os chamadores):

| Classe | Eventos | Regra |
|---|---|---|
| Crítico | abate com XP, drop de item/ouro, level up, mover ouro/item para/do cofre, comprar, vender, consumir item de entrada de dungeon, usar consumível, descartar item, Reset, Evolução, criar personagem | `checkpoint()` imediato; eventos do **mesmo frame** viram uma escrita; nunca adiar; falha fica pendente e visível até gravar |
| Adiável | distribuir atributos, aprender skill, equipar/desequipar, montar barra, organizar bolsa, preferências de gameplay (`options`) | `markDirty` + debounce (provisório 2 s) ou próximo crítico/saída |

- Opções de vídeo e interface (qualidade gráfica, volume, aura) são **por máquina** em `localStorage` `uaidzin_settings`, fora do save. A seção `options` do perfil guarda só preferências de gameplay (ex.: “não solicitar mais” do portal).
- Conta v3 no IDB: registros separados `slots` e `vault`; cofre + inventário na **mesma** transação IDB quando ouro/item cruza fronteira. Criptografia (AES-GCM; XOR só em `file://`) roda **antes** de abrir a transação. Sem sessão, nada é gravado.
- Boot e runtime: **uma** versão de IndexedDB e o mesmo módulo de storage (boot gerado a partir do runtime, não versionado).
- Uma conta por aba: lock **por conta** adquirido pelo documento pai (`BootFlow`) em todo caminho de entrada; segunda aba (ou aba duplicada) é **recusada** com mensagem — sem modo somente leitura e sem assumir controle. `navigator.locks`; fallback `BroadcastChannel` + heartbeat (provisório 5 s).
- Jogo só carrega depois do login e da seleção de personagem (`import()` dinâmico), com tela de carregamento.
- Input: atalhos **C/K/I** iguais na cidade e na dungeon; **B** (cofre) só na cidade; `interact` só com UI fechada; nada dispara com foco em `input`/`textarea`/`select`/`[contenteditable=true]` (exceto Escape) nem com Ctrl/Meta/Alt; teclas de slot **1–9** e **0**.
- Debug: só `import.meta.env.DEV`. Sem `window.__UAIDZIN_DEBUG__`, sem `?debug=1`, sem `__UAIDZIN_SKIP_BOOT__` e sem atalho F1–F9 em produção; **F5** nunca capturado.
- Tick: exceção → `ErrorReporter`, loop continua; **5** frames seguidos com erro → `checkpoint` crítico + volta para a **cidade** (sem toast “tentar continuar”, sem voltar à seleção); mais 5 seguidos na cidade → tela fixa “Recarregue a página” (provisório).
- Item de entrada da dungeon: consumido ao usar e gravado na hora (crítico); **sem devolução** se a entrada falhar; entrada durante fade é recusada sem consumir.
- XP no nível máximo: descartado; `xp` não passa de `xpToNext`; UI mostra “MAX”; sem campo de excedente.
- DoT: tick por tempo a cada **3 s** (provisório, `DOT_TICK_SEC` em `game/src/data/balance/combat.ts`); fração restante aplicada na expiração; dano total = `dotDps × dotSec`.
- Skills **sem nível**: aprender é uma vez; nada de “Melhorar”, `levelCap`, `upCost` ou bônus por nível. Alinhado em `Planos/Skill TK linhagem 1.md` (compra única no passo **19**; checklist sem “Melhorar 1→10”). Sem compensar dano/cura base.
- Loja: estoque **infinito** (sem `qty` exibido nem decrementado); preço de venda ≤ preço de compra; `machado_leve` custa **0** e vende por **0**.
- Venda: no NPC (Mercador/Ferreiro) **e** na bolsa, sempre com confirmação.
- Item que não cabe: recusado com aviso; compra não cobra; drop recusado é **perdido** (não fica no chão); limite **999** por stack.
- Set de arma e passivas `weaponAny` derivados da arma equipada; strip de conjuntos só em DEV.
- `GamePanels.ts` só sai depois de existirem na `WireApi`: aprender skill (ouro + save), vender (NPC e bolsa, com confirmação), Reset/Evolução e refino +1 no Ferreiro.
- Lista de ciclo de vida VFX: `Planos/Skill TK linhagem 1.md` passo **23** — **não** duplicar em `Refatoracao 9.md`; o plano 9 a substitui pelo `TkVfxRegistry`.
- Testes cobrem AES-GCM (HTTP) e XOR (`file://`) (`Refatoracao 2.md` passo **29**).

| Plano | Foco | Issues fechadas |
|---|---|---|
| `Refatoracao 1.md` | Vitest + normalizar + carregar | #30 #48 (+#39 base, #49 payload) |
| `Refatoracao 2.md` | Coordenador + seções IDB + boot na mesma versão | #16 #23 #24 (+#22 fila, #28 versão) |
| `Refatoracao 3.md` | Conta v3 no IDB + boot gerado + lock de conta + BootFlow | #22 #28 #29 #49 |
| `Refatoracao 4.md` | Input + tick + HUD diff + settings | #13 #17 #45 (loop) #46 #47 (+#43 atalhos) |
| `Refatoracao 5.md` | Itens, equip, ouro, loja, skills sem nível | #33 #36 #38 #41 #42 (+#32 #37 #40 domínio, #50 setters) |
| `Refatoracao 6.md` | Fatiar `CityGameSession` | #14 #27 #34 #44 #50 (+#19 sessão, #45 fade/entrada, #39 Reset) |
| `Refatoracao 7.md` | `WireApi` injetada + operações reais | #31 #32 #35 #37 #39 #40 |
| `Refatoracao 8.md` | Wire TS + remover legado | #43 (+#31 #13 reforço) |
| `Skill TK linhagem 1.md` | Física, barra 10, lista VFX | — (pré-requisito do plano 9) |
| `Refatoracao 9.md` | VFX registro e pool de luz | #9 #12 |
| `Refatoracao 10.md` | Views async + diff + jogo após login | #10 #15 #19 #21 #25 #26 (+#20 carga) |
| `Refatoracao 11.md` | Render, mundo, assets e qualidade gráfica | #11 #18 #20 |

## Passos

1. Executar `Planos/Refatoracao 1.md` passos **1 → 22**.
2. Executar `Planos/Refatoracao 2.md` passos **1 → 34**.
3. Executar `Planos/Refatoracao 3.md` passos **1 → 25** (planos 2 e 3 na mesma entrega da `main`).
4. Executar `Planos/Refatoracao 4.md` passos **1 → 33**.
5. Executar `Planos/Refatoracao 5.md` passos **1 → 36**.
6. Executar `Planos/Refatoracao 6.md` passos **1 → 38**.
7. Executar `Planos/Refatoracao 7.md` passos **1 → 25**.
8. Executar `Planos/Refatoracao 8.md` passos **1 → 24**.
9. Executar `Planos/Skill TK linhagem 1.md` passos **1 → 30** (no mínimo **23**, **25** e **28** antes do passo 10).
10. Executar `Planos/Refatoracao 9.md` passos **1 → 16**.
11. Executar `Planos/Refatoracao 10.md` passos **1 → 26**.
12. Executar `Planos/Refatoracao 11.md` passos **1 → 25**.

`Planos/Skill TK linhagem 2.md`, `3.md`, `Dungeon 1.md` e `Dungeon 2.md` rodam depois do passo 8; os que chegarem antes do passo 10 registram VFX no `TkVfxRegistry` quando o plano 9 entrar.

## Testar

- [ ] Após cada plano filho: `cd game && npm run typecheck && npm run test && npm run smoke`; planos 1–3 também `npm run test:save`; planos 3, 7, 8 e 11 também `npm run build`.
- [ ] Passos 1–3: save v4 e conta v3 gravam e recarregam; save antigo vira `absent` sem crash; segunda aba e aba duplicada recusadas.
- [ ] Passos 4–6: `npm run bot`; combate/equip/inventário estáveis; 5 erros seguidos no tick salvam e voltam para a cidade.
- [ ] Passos 7–8: login → cidade → Mestre/comprar skill/barra/vender/cofre/refino/Reset no build de produção, sem `window.__UAIDZIN_WIRE__`, `GamePanels` nem `visual/telas`.
- [ ] Passos 10–12: `npm run vfx:runtime:qa`, `npm run check:model-lab` e presets Baixo/Médio/Alto verdes.
- [ ] Cada issue da tabela acima: critérios de aceitação do Complemento da issue marcados antes de fechar.

## Pendências

- Comentários “Refatoração (Complemento)” das issues #9–#50 citam os números de passo antigos; atualizar depois que esta revisão entrar na `main`.
- Felipe no fim: pasta definitiva das artes de classe (`Refatoracao 8.md`) e validação visual dos presets (`Refatoracao 11.md`).
- Depois da refatoração: conjuntos de animação definitivos (`Refatoracao 5.md` usa mapa provisório).
