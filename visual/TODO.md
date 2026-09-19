# UAIDZIN — To-do de UI

Lista viva do que foi pedido. Marcar `x` quando fechar. Atualizar sempre que o Felipe pedir algo novo.

## Aberto

- [ ] Portar wire C/K/I/B para `GamePanels` real (dados de save/sessão; hoje é overlay de protótipo sobre o gameplay)
- [ ] HUD dungeon final com HP world bar (verde ≥40%, vermelho &lt;40%) no jogo real
- [ ] Cards de item / loot (lab reprovou as opções)
- [x] Lista de seleção de dungeon (Guarda do Portal)
- [ ] Tela de resultado de dungeon (refinar)
- [ ] Ícones de skill finais (SVG/PNG, legíveis a 32px) — wire usa placeholders por árvore

## Próximos passos (ordem sugerida)

1. **Validar visual do wire no jogo** (`npm run dev` → cidade → C/K/I/B) e marcar o que o Felipe aprova/reprova.
2. **Ligar o wire aos dados reais** (atributos, specs, inventário, ouro, hotbar, baú) no lugar do mock do HTML.
3. **Substituir `GamePanels` legado** pelo layout aprovado (sem dual UI).
4. Fechar HUD dungeon + HP world bar no runtime.
5. Lista de dungeon + tela de resultado.
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
