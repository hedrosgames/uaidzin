# Plano de desenvolvimento + Grill — Finalização de sistemas

Documento de **execução**. Spec fina: `CHECKLIST-CENAS.md`. Trabalho aberto: `TAREFAS-ABERTAS.md`. Ciclo de sessão: `PLAN-finalizacao-sistemas.md`.  
**Grill de design do jogo** (só decisões de jogo — como o jogo funciona): **`GRILL-FORM.html`**. Ordem de código e arquitetura de implementação não entram nesse formulário.

## Como ler

| Eixo | Significado |
|---|---|
| **Discovery** | Decidir, inventariar, documentar — destrava delivery e evita retrabalho |
| **Delivery** | Código/comportamento que o jogador **sente** |
| **P0** | Quebra o jogo ou impede a jornada (conta, save, entrar, morrer sem corromper) |
| **P1** | Loop principal com valor (cidade → dungeon → up → voltar) |
| **P2** | Apresentação, conteúdo extra, ferramenta de escala |

**Regra de valor:** cada etapa termina com algo que o Felipe consegue **jogar ou validar como produto**, não só “meio sistema”.

## Jornada do jogador (norte do valor)

```text
Conta → Personagem → Cidade → Preparar → Dungeon → Farm/Loot/Up → Voltar → Evoluir → Repetir
```

Se a etapa não melhora um trecho dessa jornada, ela é discovery de apoio ou fica depois.

---

## Grill resumida (prioridade × valor)

| Prio | Fase | Discovery | Delivery | Valor para o jogador | IDs |
|---|---|---|---|---|---|
| P0 | **G0** | Save/load + inventários mínimos | — | Saber o que o jogo grava; não implementar às cegas | D10 D11 · I5 I10 I3 I1 · E4 rascunho |
| P0 | **G1** | Specs login/conta | Conta + personagem + save íntegro | Criar conta/char, entrar na cidade com o que o save diz | L1–L5 · S1–S3 S5 S8 · C2–C5 C9 · X3 (login↔sel) · S4 S6 S7 |
| P0 | **G2** | — | Hub anda + UI não mente | Anda na cidade sem travar; HUD/classe/status = save | C21 C25 C15 · C3 C4 · C6 C20 · C16 C19 |
| P0 | **G3** | Balance D1 (provisório ok) | Dungeon jogável + morte/up/save | Entra, vê, luta, morre, upa, volta — sem preto nem save quebrado | D1 D2 D3 D4 D5 D9 · D6 D7 · D8 · D12 · C17 C18 · X3 (cena↔dungeon) |
| P1 | **G4** | C1 quests + C7 fórmulas + I6 I7 I9 | NPCs de serviço | Comprar, forjar, compor, quests mínimas — cidade com propósito | C1 C7 C10 C11 C14 · I6 I7 I9 I13 |
| P1 | **G5** | I2 I11 I12 I14 · I8 | Mundo e apresentação | Parece jogo: NPCs/monstros reais, fonte/chão, escudo, LD D1, anims por arma | C8 C22 C23 C24 C12 C13 C26 · D13 · X4 · S4 S7 (se ainda abertos) |
| P2 | **G6** | E1 E3 E4 completo · I1–I14 fechados | Editor + métricas (fases) | Equipe configura o jogo e mede progressão sem engolir código | E1 → E2 · E3 · inventários finais |

P0 pode e deve **se sobrepor em staff** (ex.: G0 roda enquanto G1 codifica), mas **não pula** G1 antes de G0 curto.

---

## Etapas detalhadas — grill por fase

Cada fase tem a **própria grill**. Marcar `Estado` ao longo da execução: `[ ]` aberto · `[~]` em andamento · `[x]` fechado com DoD · `[-]` descartado/adiado.

Colunas: **ID** (bate com `TAREFAS-ABERTAS.md`) · **Tipo** Discovery/Delivery · **Entrega** · **Aceite (valor)** · **Depende**.

---

### Grill G0 — Discovery destravadora (P0 · Discovery)

**Valor:** o time sabe o que o save guarda e o que já existe; G1/G3 não adivinham.

| ID | Tipo | Entrega | Aceite (valor) | Depende | Estado |
|---|---|---|---|---|---|
| D11 | Discovery | Doc save/load: grava/carrega/F5 por cena | Qualquer dev responde “o que se perde no F5” sem abrir o código | — | `[ ]` doc em `docs/inventarios/save-load.md` — aguarda Felipe |
| D10 | Discovery | Decisão produto F5 por cena (reload vs login) | Regra única no doc; sem surpresa em teste | D11 | `[~]` regra em `docs/inventarios/save-load.md` § D10 — aguarda Felipe |
| I5 | Discovery | Inventário assets mínimo (pasta → uso → placeholder?) | Saber o que é asset real vs debug em 1 consulta | — | `[~]` doc em `docs/inventarios/assets.md` — aguarda Felipe |
| I10 | Discovery | Classes: attrs base, árvores, armas | G1 usa a tabela no create; X4/G5 sabem o que animar | GDD `05` | `[~]` |
| I3 | Discovery | Skills listadas (efeito pode ser TBD) | Lista completa 4 classes + 8ª + livros | GDD `12`, I10 | `[~]` doc em `docs/inventarios/skills.md` — aguarda Felipe |
| I1 | Discovery | Animações: clip, GLB origem, quem usa | Destrava S7, X4, morte D2/D3 | I5 parcial | `[~]` doc em `docs/inventarios/animacoes.md` — aguarda Felipe |
| E4a | Discovery | **Rascunho** fluxo Mortal 1–400 (marcos) | Marcos de nível/dungeon/skill anotados; fecha em G6 | GDD `05` `28` | `[x]` rascunho absorvido em E4b (`fluxo-mortal-1-400.md`) |

**DoD G0:** D10+D11 aceitos pelo Felipe; I5 I10 I3 I1 + E4a existem como md em `docs/inventarios/` (ou equivalente).

---

### Grill G1 — Conta, personagem e save que não mentem (P0 · Delivery)

**Valor de jogador:** “Crio conta e herói, entro no jogo com o que configurei — e ao voltar é a mesma coisa.”

| ID | Tipo | Entrega | Aceite (valor) | Depende | Estado |
|---|---|---|---|---|---|
| L5 | Delivery | Boot conta única `admin` → seleção | Storage limpo: só admin; login admin funciona | G0 D11 | `[x]` |
| L1 | Delivery | Botão Criar conta; CTA Entrar ↔ Criar | Toggle claro no login (visual já aprovado) | — | `[x]` aguarda Felipe |
| L2 | Delivery | Registro login+senha sem e-mail; save zerado | Conta nova abre empty-state na seleção | L1, save-store | `[x]` aguarda Felipe |
| L3 | Delivery | Duplicado **recusado** | Mesmo login → erro; conta antiga intacta | L2 (`registerAccount`) | `[x]` Playwright — aguarda Felipe |
| L4 | Delivery | Google cria conta nova (≠ admin) | Clique Google não usa admin; save próprio | L2/L3 | `[x]` Playwright — aguarda Felipe |
| S3 | Delivery | Nome 3–12 no create | Botão Criar só no intervalo | — | `[ ]` |
| S1 | Delivery | Fix painel direito pós-delete | Delete 2º + clicar 1º mostra status | save-store `normalizeSlots` | `[ ]` |
| S2 | Delivery | Status = padrão da classe no create; save depois | Painel nunca vazio com slot válido | S1, I10 | `[ ]` |
| S5 | Delivery | Create/delete grava na hora na conta | Reload mantém estado; sem “salvar depois” | S1, D11 | `[ ]` |
| C9 | Delivery | Char novo: sem equip, ouro 0, skills 0 | Create usa zeros reais (não gold 100) | S5 | `[x]` técnico — aguarda Felipe |
| C2 | Delivery | Skills zeradas + evolução grava no save | Upar/alocar persiste no reload | C9, S5 | `[x]` técnico — aguarda Felipe |
| C3 | Delivery | Painéis/HUD = save (sem mock) | Tela mostra o slot ativo | C2, G2 parcial | `[x]` Playwright — aguarda Felipe |
| C4 | Delivery | Classe correta na UI (TK ≠ Huntress) | Label/classId certos no hub | C3 | `[x]` Playwright — aguarda Felipe |
| C5 | Delivery | Wipe + telas alinhadas ao save | Ferramenta reset + caminho create→cidade limpo | S5, L2 | `[x]` técnico — aguarda Felipe |
| S8 | Delivery | Deslogar no Settings da seleção | logout → login; sessão limpa | L5 | `[x]` técnico — aguarda Felipe |
| S6 + X3a | Delivery | Fade preto login ↔ seleção | Transição com tela preta nos dois sentidos | BootFlow | `[x]` técnico — aguarda Felipe |
| S4 | Delivery | Modal criar com 3D idle por classe | Sem PNG no seletor de classe | I1, char-preview | `[x]` aguarda Felipe |
| S7 | Delivery | Idle TK = clip do BM | TK (modelo TK) usa anim do BM | I1 | `[x]` aguarda Felipe (só seleção/`char-preview`) |

**DoD G1:** Playwright boot/login/seleção verde; Felipe joga create → cidade com status/reload ok.

**Depende de:** G0 (D11 + envelope de slots — raiz de S1).

---

### Grill G2 — Cidade onde se anda e a UI fala a verdade (P0 · Delivery)

**Valor de jogador:** “Ando, clico nos NPCs e a tela mostra **meu** personagem — sem travar e sem mentira.”

| ID | Tipo | Entrega | Aceite (valor) | Depende | Estado |
|---|---|---|---|---|---|
| C21 | Delivery | Fix click-to-move preso andando no lugar | Colisão/path: para ou desvia; anim acompanha velocidade real | — | `[x]` aguarda Felipe |
| C25 | Delivery | Colisão da fonte | Não entra na base/tigela | C21, I14 | `[x]` aguarda Felipe |
| C15 | Delivery | Click longe no NPC → UI ao chegar | Fila de interação + raio | C21 | `[x]` aguarda Felipe |
| C3/C4 restos | Delivery | UI hub 100% save | Classe/nome/status em todos os painéis abertos | G1 C3/C4 | `[ ]` |
| C6 | Delivery | Sábio abre só a tela dele | Sem equipamento junto | painéis | `[x]` aguarda Felipe |
| C20 | Delivery/Discovery | Textos do Sábio revisados | pt-BR correto; sem mockup | C6, I13 parcial | `[x]` aguarda Felipe |
| C16 | Delivery | Scroll lista dungeon no padrão | Guarda → UI com scrollbar do tema | DECISOES-ESTILO | `[x]` aguarda Felipe |
| C19 | Delivery | Toggle “não perguntar” + Settings restaura | Escolha persiste; Settings desfaz | C16/C18 | `[x]` aguarda Felipe |
| C17a | Delivery | Entrada dungeon **valida** item (UI) | Sem item: bloqueio; com item: libera | C16 | `[x]` aguarda Felipe |

**DoD G2:** Felipe anda na cidade, NPCs respondem, não trava na fonte; painéis batem com o save.

**Paralelo:** pode sobrepor G1 depois que S5/C9 estiverem sólidos.

---

### Grill G3 — Dungeon que se joga (P0 · Delivery) — **gate jogável**

**Valor de jogador:** “Entro, vejo, luto, morro, upo, volto — progresso continua.”

| ID | Tipo | Entrega | Aceite (valor) | Depende | Estado |
|---|---|---|---|---|---|
| D1 | Delivery | Dungeon **não** abre preta | Mundo/luz visíveis na entrada | G2 C17a | `[x]` técnico — aguarda Felipe |
| D2 | Delivery | Morte: anim **na dungeon** → espera → cidade | Não anima na cidade | D1, I1 morte | `[x]` técnico — aguarda Felipe |
| D3 | Delivery | Animação de morte repetível | Morrer 2× roda anim 2× | D2 | `[x]` técnico — aguarda Felipe |
| X3b | Delivery | Fade entrada e saída da dungeon | Overlay preto nos dois sentidos | X3a/S6 | `[x]` técnico — aguarda Felipe |
| D5 | Delivery | X-ray só no jogador | Monstro não aparece por trás de parede | I12 | `[x]` técnico — aguarda Felipe |
| D9 | Delivery | Lock de movimento em ataque/dano | Sem andar no hit/ataque (janela do design) | combat controller | `[~]` aguarda Felipe |
| D6 | Delivery | Drop log canto inferior esquerdo | Listazinha debugável, não overlay solto | — | `[~]` aguarda Felipe |
| D7 | Delivery | Level up: fanfarra + HP/MP full | Up dá feedback e preenche barras; save da evolução | C2, I11 parcial | `[~]` aguarda Felipe |
| D4 | Delivery | D1 mais fácil | Balance provisório documentado se GDD vazio | E4a, GDD | `[x]` técnico — aguarda Felipe |
| D8 | Delivery | Acentos/símbolos pt-BR | Textos dungeon/UI corretos | I13 parcial | `[x]` técnico — aguarda Felipe |
| D12 | Delivery | Save dungeon amarra C2/C3 | Reload não perde skill/ouro da run | C2 S5 D11 | `[x]` técnico — aguarda Felipe |
| C17b | Delivery | Entrada **consome** item | Debita; bloqueia se faltar | C17a, I6 parcial | `[x]` técnico — aguarda Felipe |
| C18 | Delivery | Cards dungeon com info + wire se preciso | Mais que ícone+título; Felipe aprova wire | C16, I8 parcial | `[x]` técnico — aguarda Felipe |

**DoD G3:** loop D1 completo 2× seguidos; Felipe valida feel; reload seguro. **= release interna jogável.**

**Depende de:** G1 (save) + G2 (portão da cidade).

---

### Grill G4 — Cidade com propósito (P1 · Discovery curto + Delivery)

**Valor de jogador:** “Compro, forjo, componho e pego missão — farm vira progressão.”

| ID | Tipo | Entrega | Aceite (valor) | Depende | Estado |
|---|---|---|---|---|---|
| I6 | Discovery | Lista de todos os itens | id, raridade, ícone?, drop/venda | I5, GDD `11` | `[~]` doc `docs/inventarios/itens.md` — aguarda Felipe |
| I7 | Discovery | Lista de equipamentos | 7 slots × tiers × req. classe | I6, GDD `05`/`11` | `[~]` doc `docs/inventarios/equipamentos.md` — aguarda Felipe |
| I9 | Discovery | Listas das lojas/NPC | Ferreiro/mercador vs I6 | I6 | `[~]` doc `docs/inventarios/lojas.md` — aguarda Felipe |
| C7d | Discovery | **Fórmulas** do compositor | Regras escritas e aceites | GDD, I7 | `[~]` doc `docs/inventarios/compositor-formulas.md` — aguarda Felipe |
| C1d | Discovery | Spec mínima mestre de quests | UI + 1 missão mínima definida | GDD `14`/`15` | `[~]` doc `docs/inventarios/quests-spec.md` — aguarda Felipe |
| C10 | Delivery | Ferreiro com lista real | Painel catálogo = I9/I7 | I7 I9 | `[x]` técnico — aguarda Felipe |
| C14 | Delivery | Mercador com lista montada | Loja = I9/I6 | I6 I9 | `[x]` técnico — aguarda Felipe |
| C11 | Delivery | Todo item com ícone | Zero item sem PNG/SVG na UI | I6 | `[x]` técnico — aguarda Felipe |
| C7i | Delivery | Compositor implementado | Fórmula roda de verdade | C7d, I7 | `[~]` técnico — aguarda Felipe |
| C1i | Delivery | UI quests mínima | Aceitar/ver 1 quest | C1d | `[~]` técnico — aguarda Felipe |
| I13 | Discovery | Textos UI/NPC inventariados | Falas/shops listadas; pendências | I5 | `[~]` doc `docs/inventarios/textos-ui.md` — aguarda Felipe |

**DoD G4:** Felipe compra, vê ícone, compõe/forja com regra real, aceita 1 quest; listas batem com inventário.

---

### Grill G5 — Apresentação e mundo (P1 · Delivery + arte)

**Valor de jogador:** “Isto é UAIDZIN, não greybox com cápsula roxa.”

| ID | Tipo | Entrega | Aceite (valor) | Depende | Estado |
|---|---|---|---|---|---|
| I14 | Discovery | Modelos 3D do mundo listados | Cidade/fora: prop, colisor, placeholder? | I5 | `[~]` doc — aguarda Felipe |
| I2 | Discovery | VFX listados | Onde cada efeito roda | I5 | `[~]` doc — aguarda Felipe |
| I11 | Discovery | Áudios listados | BGM/SFX por cena | I5 | `[~]` doc — aguarda Felipe |
| I12 | Discovery | Shaders/efeitos listados | Fonte, x-ray, dungeon, fade | I5 | `[~]` doc — aguarda Felipe |
| I8 | Discovery | Dungeons listadas | D1–D8: nível, inimigos, item, LD | I4 parcial, GDD `10` | `[~]` doc — aguarda Felipe |
| C23 | Delivery | NPCs → personagens | Sem placeholder genérico no hub | I14, arte | `[~]` Bloqueado — sem GLB |
| C24 | Delivery | Cápsulas → monstros | Mesh de monstro no mundo/arena | I4 I14, arte | `[~]` Bloqueado — sem GLB |
| C8 | Delivery | Árvores fora da cidade trocadas | Modelo novo no place | I14 | `[~]` Bloqueado — sem GLB; cones removidos |
| C22 | Delivery | Escudo sem clipar na mão | Socket/offset ok em todas as cenas | X4 parcial | `[x]` técnico — aguarda Felipe |
| C12 | Delivery | Fonte: shader ajustado | Felipe aprova água/efeito | I12 | `[x]` técnico — aguarda Felipe |
| C13 + C26 | Delivery | Chão + área da fonte | Textura centro+geral; visual fonte aprovado | C12, I14 | `[x]` técnico — aguarda Felipe |
| D13a | Delivery | D1: luz + assets + LD | D1 legível e montada | I8 I4, D4 | `[x]` técnico greybox campo — aguarda Felipe |
| D13b | Delivery | D2–D8: luz + assets + LD | Cada dungeon no padrão D1 | D13a, E4 completo ajuda | `[~]` Bloqueado — sem assets de bioma |
| X4 | Delivery | Animações por arma | idle/run/attack coerentes com a arma | I1 I10 | `[x]` técnico parcial (shared melee/cast) — aguarda Felipe; gap idle/run |

**DoD G5:** cidade + D1 sem placeholder óbvio; Felipe aprova visual (regra AGENTS: ele valida UI/HUD).

---

### Grill G6 — Escala: editor, métricas, progressão (P2 · Discovery → Delivery)

**Valor time:** conteúdo/balance sem reabrir TS toda vez; medir progressão 1–400.

| ID | Tipo | Entrega | Aceite (valor) | Depende | Estado |
|---|---|---|---|---|---|
| E4b | Discovery | Fluxo jogador **1→400** completo | Marcos, unlocks, save por faixa; Felipe aprova | E4a, I3 I8 | `[~]` `docs/inventarios/fluxo-mortal-1-400.md` — aguarda Felipe |
| E1 | Discovery | Plano do editor | Domínios, schema, export → runtime; aprovado | I5–I9, E4b | `[~]` `docs/inventarios/editor-plano.md` — aguarda Felipe |
| E3 | Discovery | Planilha + dashboard de progressão | Métricas + fonte (save/log) definidas | D11, E4b | `[~]` `docs/inventarios/metricas-plano.md` — aguarda Felipe |
| I1–I14 fecho | Discovery | Inventários 100% status final/placeholder/falta | Zero “?” nos domínios do editor | grills G0/G5 | `[~]` I4 fechado em `inimigos.md`; demais I* em validação |
| E2a | Delivery | Editor fatia 1 (itens + lojas) | Exporta algo que o jogo consome | E1, I6 I9 | `[~]` **Bloqueado / Pulado** — aguarda aprovação E1 |
| E2b | Delivery | Editor fatia 2 (dungeons/monstros/classes) | Mesmo contrato de export | E2a, I8 I4 I10 | `[~]` **Bloqueado / Pulado** — aguarda aprovação E1 |
| D11b | Delivery | Doc save/load versionado no repo | Visível fora da conversa | D11, D10 | `[x]` técnico — `docs/inventarios/save-load.md` + INDEX |
| E3b | Delivery | Dashboard com ≥1 métrica real | Lê save/log de verdade | E3, D11 | `[~]` **Bloqueado** — aguarda E3 aprovado + métrica real |

**DoD G6:** E4b + E1 aprovados; E2a export consumido pelo runtime; ≥1 métrica real no dashboard.

---

## Ordem de execução recomendada

```text
Semana de spec/golpe de estado:
  G0 (docs + inventários mínimos)  ∥  início de G1 (save-store + login/seleção)

Depois:
  G1 completo
  → G2 cidade (anda + UI verdade)  ∥  G3 dungeon preta/morte já em investigação
  → G3 completo  =  JOGÁVEL
  → G4 serviços
  → G5 polimento/LD
  → G6 ferramentas
```

**Gate de “jogável”:** fim do G3. É o primeiro marco de release interna (Felipe joga o loop).

---

## Grill completa — task ID → fase

| Fase | IDs (os mesmos das grills G0–G6 acima) |
|---|---|
| G0 | D10 D11 · I5 I10 I3 I1 · E4a |
| G1 | L1–L5 · S1–S8 · C2–C5 C9 · X3a |
| G2 | C21 C25 C15 · C3 C4 restos · C6 C20 · C16 C19 · C17a |
| G3 | D1–D9 D12 · X3b · C17b C18 |
| G4 | C1d C1i · C7d C7i · C10 C11 C14 · I6 I7 I9 I13 |
| G5 | C8 C22 C23 C24 C12 C13 C26 · D13a D13b · X4 · I2 I8 I11 I12 I14 |
| G6 | E4b · E1 E2a E2b E3 E3b · I1–I14 fecho · D11b |
| Fora de fase (apoio) | X1 (feito) · X2 (go do Felipe) |

IDs “partidos” (C17a/b, C7d/i, E4a/b, D13a/b, X3a/b) são o mesmo item do backlog fatiado para caber na fase certa — o texto completo continua em `TAREFAS-ABERTAS.md`.

---

## Critério de pronto do programa (não do jogo inteiro)

Fases G0–G3 fechadas = **UAIDZIN jogável internamente**: conta → char save-correto → cidade anda → dungeon → up/loot/morte → reload seguro.

G4–G5 = **vertical slice com cara de jogo**.  
G6 = **time consegue evoluir conteúdo**.

GDD segue sendo fonte de regra; este plano **não** inventa número de balance — se faltar, marca provisório + fonte.

## Fora do grill (agora)

- Backend real / OAuth Google  
- Multiplayer / nuvem  
- Arch/Cele completos além do que G6 documentar  
- Monetização  
- Redesign de UI já aprovada  

## Atualização deste doc

- Tarefa nova do Felipe → `TAREFAS-ABERTAS.md` **e** linha na fase certa aqui.  
- Fase `done` só com DoD + validação (painel MiMo + checklist).  
- Grill é o mapa; **não** substitui o checklist de aceite.
