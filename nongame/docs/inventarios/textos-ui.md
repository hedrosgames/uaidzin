# Textos UI / falas — inventário I13

Documento de discovery. Depois de ler isto, dá para auditar **strings de UI/NPC** (pt-BR, acentos) e pendências sem caçar no HTML.

**Fontes:** wire `03-wire-paineis-cidade.html` (`SAGE_DOCS`, portal, shop, composer) · `CITY_INTERACTABLES` · `GameApp` toasts/Settings · boot login/seleção · I6/I9 · C20/D8.  
**Conflito GDD × grill:** tutorial na UI **proibido** exceto **Sábio**; acento errado **reprova**; sem emoji.

---

## Contagem

| Grupo | Qtd | Nota |
|---|---:|---|
| Tópicos do Sábio (`SAGE_DOCS`) | **18** | 9 fundamentos + 9 progressão |
| Labels de NPC/mundo | **8** | interactables |
| Títulos de painel wire | **10** | C/K/I + serviços |
| Descrições de dungeon portal | **8** | `PORTAL_DESC` |
| Nomes de selo / monstro portal | **5 + 4** | entry + archetypes |
| Categorias compositor | **4** + 2 locked | rótulos |
| Toasts runtime amostrados | **≥4** | GameApp / CityGameSession |
| Quests (falas) | **0** | painel vazio |
| Shop: compra/erro | **0** | só detalhe preço |

---

## Legenda de status

| Status | Significado |
|---|---|
| `ok-pt` | pt-BR com acentos; parece final |
| `revisado-C20` | Texto do Sábio já revisado (aguarda Felipe) |
| `provisorio` | Placeholder de conteúdo |
| `vazio` | UI sem copy |
| `gap` | Grill pede; string ainda não existe |
| `ingles-mistura` | Termo EN no meio (ex.: Special, Anct, Jewels) |

---

## NPCs — nameplates

| id | texto | status |
|---|---|---|
| `npc-portal-guard` | Guarda do Portal | ok-pt |
| `npc-merchant` | Mercador | ok-pt |
| `npc-blacksmith` | Ferreiro | ok-pt |
| `npc-skill-master` | Mestre de Skills | ok-pt · wire título “Mestre de Técnicas” *(divergência)* |
| `npc-sage` | Sábio | ok-pt |
| `npc-composer` | Compositor | ok-pt |
| `vault-chest` | Baú | ok-pt |
| `npc-quest` | Mestre de Quests | ok-pt · painel vazio |

---

## Painéis — títulos e chrome

| id texto | onde | status |
|---|---|---|
| Personagem | `#p-person` · hint C | ok-pt |
| Técnicas / Habilidades | K: win “Técnicas”; hint “Habilidades” | ok-pt · **dois rótulos** |
| Equipamento / Inventário | I: win “Equipamento”; hint “Inventário” | ok-pt · **dois rótulos** |
| Baú | vault | ok-pt |
| Loja / Mercador / Ferreiro | `#shopTitle` dinâmico | ok-pt |
| Guarda do Portal | portal | ok-pt |
| Mestre de Técnicas | skillmaster | ok-pt |
| Sábio | sage | ok-pt |
| Compositor | composer | ok-pt |
| Mestre de Quests | quest | ok-pt · corpo vazio |
| Fecha (Esc) | hint bar | ok-pt |
| Preço | shop detail | ok-pt |
| estoque N | shop detail sub | ok-pt |
| Disponíveis | filtro portal | ok-pt |
| Mortal / Arch / Cele | abas evolução | ok-pt |
| Entrar / Cancelar | confirm portal | ok-pt |
| Não solicitar mais confirmação | checkbox | ok-pt |
| Descartar / Cancelar | confirm lixeira | ok-pt |
| Trancado · 120 slots · desbloqueio no Intendente | vault lock | ok-pt · NPC “Intendente” **não existe** no hub |

---

## Sábio — índice (C20)

### Fundamentos (9)

| id | título | status |
|---|---|---|
| `ciclo` | O ciclo do aventureiro | revisado-C20 |
| `cidade` | A cidade | revisado-C20 |
| `interface` | Painéis e atalhos | revisado-C20 |
| `movimento` | Movimento e câmera | revisado-C20 |
| `combate` | Combate | revisado-C20 |
| `inimigos` | Inimigos e spawns | revisado-C20 |
| `dungeon-basico` | Dentro da dungeon | revisado-C20 |
| `sobrevivencia` | Sobrevivência | revisado-C20 |

### Progressão (9)

| id | título | status |
|---|---|---|
| `niveis` | Níveis e atributos | revisado-C20 |
| `evolucao` | Mortal, Arch e Cele | revisado-C20 |
| `skills` | Técnicas e especialização | revisado-C20 · menciona árvore **Special** (ingles-mistura) |
| `equip` | Equipamento e bolsa | revisado-C20 |
| `bau` | Baú e Ouro | revisado-C20 |
| `lojas` | Mercador e Ferreiro | revisado-C20 |
| `portal` | Entrar em dungeons | revisado-C20 |
| `reset` | Reset e redistribuição | revisado-C20 |
| `classes` | As quatro classes | revisado-C20 |

Abas: **Fundamentos** · **Progressão**. Corpo HTML completo vive no wire (não duplicar aqui).

---

## Portal — copy de dungeon

| id dungeon | descrição (`PORTAL_DESC`) | status |
|---|---|---|
| `dungeon-1` | Introdução e primeiro equipamento. | ok-pt · provisorio |
| `dungeon-2` | Consolidação de build inicial. | ok-pt · provisorio |
| `dungeon-3` | Primeiro salto de Ouro e refinamento. | ok-pt · provisorio |
| `dungeon-4` | Pressão de posicionamento. | ok-pt · provisorio |
| `dungeon-5` | Mix de perseguidores e longo alcance. | ok-pt · provisorio |
| `dungeon-6` | Densidade alta de spawns. | ok-pt · provisorio |
| `dungeon-7` | Preparação para o fim de Mortal. | ok-pt · provisorio |
| `dungeon-8` | Farm de topo de etapa. | ok-pt · provisorio |

| id | nome | status |
|---|---|---|
| `entry_d4`…`entry_d8` | Selo D4…D8 | ok-pt |
| `fixed` | Guarda Estático | ok-pt |
| `chaser` | Perseguidor | ok-pt |
| `ranged` | Atirador | ok-pt |
| `boss` | Chefe | ok-pt |

Nomes de dungeon no código: `Dungeon 1`…`Dungeon 8` — **provisorio** (sem nome diegético).

---

## Compositor — rótulos

| id | título | desc | status |
|---|---|---|---|
| `plus10` | +10 | Combinações até o refino +10. | ok-pt · provisorio |
| `plus12` | +12 | Combinações até o refino +12. | ok-pt · provisorio |
| `anct` | Anct | Combinações ancestrais. | ingles-mistura |
| `jewels` | Jewels | Combinações de joias. | ingles-mistura |

---

## Toasts / feedback runtime

| texto | fonte | status |
|---|---|---|
| Entrada insuficiente | `CityGameSession` gate | ok-pt |
| Inventário cheio — item perdido | drop log | ok-pt |
| Opções salvas. | Settings | ok-pt |
| Save ilegível — progresso não foi sobrescrito | load | ok-pt |
| Salvando… / Salvo / Falha ao salvar | save indicator | ok-pt |
| KO / MISS | floating combat | ingles-mistura *(feedback combate)* |

---

## Login / seleção (amostra)

Strings canônicas de fluxo (C20/D8 já tocaram parte do hub). Amostra:

| texto | onde | status |
|---|---|---|
| Entrar / Criar | login CTA | ok-pt |
| Criar Personagem | empty-state escudo | ok-pt |
| Deslogar | Settings seleção | ok-pt |
| Nomes de classe TK/FM/BM/HT | seleção | ok-pt (C4) |

Lista exaustiva de todo atributo/label do boot fica fora; I13 foca **NPC + shops + sábio + portal + toasts de serviço**.

---

## Quests / loja — gaps

| id | necessidade | status |
|---|---|---|
| quests.* | Título, objetivo, recompensa (matar N / dungeon / coletar) | vazio · gap C1 |
| shop.buy / shop.fail | “Comprar”, erro ouro, estoque | gap C10/C14 |
| forge.refine.* | Sucesso / falha / quebrou | gap C10 |
| compose.* | Resultado da fórmula +7 | gap C7 |

---

## Pendências de acento / cópia

1. Unificar **Mestre de Skills** (mundo) vs **Mestre de Técnicas** (painel).  
2. Unificar hint **Habilidades** vs título **Técnicas**; **Inventário** vs **Equipamento**.  
3. Trocar **Special / Anct / Jewels / KO / MISS** se o grill exigir 100% pt-BR diegético.  
4. Remover ou criar NPC **Intendente** citado no baú.  
5. Preencher quests + strings de compra/refine na delivery (não neste discovery).
