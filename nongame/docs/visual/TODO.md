# UAIDZIN — To-do de UI

Lista viva do que foi pedido. Marcar `x` quando fechar. Atualizar sempre que o Felipe pedir algo novo.

**Plano ativo de sistemas:** `PLAN-finalizacao-sistemas.md`  
**Plano dev + grill (prioridades):** `PLAN-DEV-GRILL.md`  
**Design do jogo (grill):** `DECISOES-DESIGN.md`  
**Grill HTML:** `GRILL-FORM.html`  
**Checklist cena a cena:** `CHECKLIST-CENAS.md`  
**Tarefas em aberto:** `TAREFAS-ABERTAS.md`  
**Índice da doc ativa:** `../INDEX.md` · Backup: `../backup/README.md`  
**Comportamento do agente:** `../AGENTS.md`

## Aberto

- [ ] Cena 1 Login — L3/L4 aguardando Felipe (L1/L2/L5 aguardando ou feito)
- [ ] Cena 2 Seleção — `TAREFAS-ABERTAS.md` S2 (S1/S3–S8 em validação)
- [ ] Cena 3 Cidade — `TAREFAS-ABERTAS.md` C1 C7 (C8/C23/C24 bloqueados; C12 C13 C22 C26 + demais em validação)
- [ ] Cena 4 Dungeon — `TAREFAS-ABERTAS.md` D13b bloqueado + X4 em validação (D13a + D1–D12/X3b em validação)
- [ ] Cena 5 Editor/métricas — E1/E3/E4b docs aguardam Felipe; E2a/E2b/E3b bloqueados
- [ ] Inventários de conteúdo — I1–I14 docs em validação (I4 `inimigos.md` incluso)
- [ ] Portar wire C/K/I/B para `GamePanels` real (dados de save/sessão; hoje é overlay de protótipo sobre o gameplay)
- [ ] HUD dungeon final com HP world bar (verde ≥40%, vermelho &lt;40%) no jogo real
- [ ] Cards de item / loot (lab reprovou as opções)
- [x] Lista de seleção de dungeon (Guarda do Portal)
- [ ] Tela de resultado de dungeon — **cancelada** (grill design): volta à cidade com log; sem tela cheia
- [x] Grill de design respondido → `DECISOES-DESIGN.md` (regras de jogo travadas 20/09)
- [ ] Ícones de skill finais (SVG/PNG, legíveis a 32px) — wire usa placeholders por árvore

## Próximos passos (ordem do grill)

1. **G0** — D11/D10 save-load + F5; inventários mínimos; E4a→E4b.
2. **G1** — Login + seleção + save íntegro (L* S* C2–C5 C9).
3. **G2/G3** — Cidade anda + dungeon jogável (gate de release interna).
4. **G4/G5** — Lojas/quests/compositor + mundo/arte/LD.
5. **G6** — Editor e métricas.
6. Trocar ícones placeholder de skill pelos finais.

## Feito (sessões recentes)

- [x] Lab de estilo 50+ (`visual/ui-style-gallery.html`)
- [x] Decisões de estilo (`visual/DECISOES-ESTILO.md`)
- [x] Login (`01-login.html`) — admin/admin, Google, opções
- [x] Save criptografado (AES-GCM no HTTP) via SaveVault + boot `save-store.js`
- [x] Seleção de personagem (`02-selecao-personagem.html`)
- [x] Wire C/K/I/B (`03-wire-paineis-cidade.html`) overlay no gameplay (`WireUi.ts`, `/wire/*`)
- [x] Hotbar 10 slots; árvores especializadas 12 skills; 8ª com highlight; Special 12
- [x] Paperdoll alinhado (5 topo = colunas); bolsas I–IV com SVG bag/cadeado
- [x] Poder centralizado no espaço livre do Personagem; ouro teto 2.000.000.000
- [x] Baú via prop 3D (sem tecla B); abre junto com inventário
- [x] NPC Compositor (`#p-composer` 2× centralizado solo)
- [x] Handoff de art style para IA (`visual/ART-STYLE-HANDOFF.md`)
- [x] Fluxo pós-Entrar → cidade 3D — boot Vite Login→Seleção→Cidade
- [x] Fogueira + salão + 16:9 1600×900
- [x] Nomes: Thegn Knight / Frost Maiden / Beast Master / Huntress
- [x] Artes chibi com fundo transparente (`*png.png` oficiais)
- [x] Face nos slots + nome fora do rosto
- [x] Criar Mortal com card gamer full body
- [x] Excluir abaixo da lista; Entrar escudo centralizado

## Regras que não voltam atrás

1. Zero emoji — só PNG/SVG
2. Paleta C Salão/Brasa
3. Escudo só no CTA de Entrar / empty-state
4. Sem texto de mockup na UI
5. HP world bar verde/vermelho 40%
6. Art oficiais com alfa: `TKpng.png` `FMpng.png` `BMpng.png` `HTpng.png`
7. Sem tutorial embutido na UI (só texto diegético)
