# 19. Decisões Confirmadas do Design

Este é o documento canônico de decisões travadas. A IA de implementação **não deve inventar** regras que estejam aqui. Valores de balanceamento marcados como provisórios podem mudar; a **estrutura** não.

Fonte de verdade da prosa: capítulos `01` a `30` do GDD. Este arquivo é o recorte executável.

---

## 1. Identidade do produto

| Item | Decisão |
|---|---|
| Nome de projeto | UAIDZIN |
| Cidade | **Aurelion** (confirmado) |
| Gênero | RPG de farm/autofarm 3D no navegador |
| Modo | Single-player, offline |
| Lançamento público | Conteúdo **Mortal**. Arch e Cele fora do primeiro build público |
| Monetização | Free-to-play web. **Zero ads por enquanto**. Sem IAP no lançamento |
| Stack | HTML/CSS, **TypeScript**, Vite, Three.js, glTF/GLB, IndexedDB |

## 2. Loop principal

```
Cidade → Preparação → Seleção de dungeon → Entrada (timer 10:00)
  → Farm → (morte OU tempo zero) → Resultado → Cidade
  → Progressão / Evolução / Reset → Nova dungeon
```

- Timer de **exatamente 10 minutos** por entrada. Não pausa entre arenas.
- Morte: retorna à cidade. **Recursos já obtidos não são perdidos.**
- Loot: **direto ao inventário**. Sem item no chão.
- Inventário cheio: **perde o item** e informa o jogador. Aviso a 80%.

## 3. Combate

| Regra | Decisão |
|---|---|
| Ataque básico | Sempre automático, definido pela arma |
| Movimento vs ataque | **Não ataca enquanto se move** |
| Skills | Auto por padrão; podem ser manuais por skill |
| Autofarm | Combate no lugar. **Não anda sozinho** |
| Esquiva | Fórmula (chance). Sem i-frame manual |
| Acerto base | 95% (provisório de balanceamento) |
| Esquiva base | 5% (provisório) |
| Dano final | `max(1, danoBruto − defesa)` (provisório) |

### Controles (confirmados)

- **WASD** move.
- **Clique esquerdo** move até o ponto.
- Sem botão de ataque básico.
- Skills: teclas 1–4 ou HUD.
- **Câmera fixa em ¾**, segue o personagem. Sem rotação do jogador no combate.

## 4. Inimigos

Três arquétipos no lançamento:

1. **Spawn fixo** — não persegue; raio curto do spawn.
2. **Perseguidor** — aproxima até distância mínima e para.
3. **Longo alcance** — mantém range; recua se aproximar demais.

- Respawn por ponto: 3 a 8s (provisório).
- Boss opcional; não zera o timer.
- Sem escalonamento automático com o nível do jogador.

## 5. Progressão

| Etapa | Faixa de nível | Reset |
|---|---|---|
| Mortal | 1–400 | Próprio |
| Arch | 1–400 | Próprio (fora do lançamento público) |
| Cele | 1–200 | Próprio (fora do lançamento público) |

- **5 pontos de atributo** por nível.
- Atributos: **FOR, DES, CONS, INT**.
- Reset volta ao nível 1 da **mesma** etapa.
- Reset **não** carrega contagem para a etapa seguinte.
- **1.000 pontos de atributo** adicionais por reset (baseline todas as etapas).
- Reset **mantém**: equipamentos, refinamentos, inventário, evolução atual.
- Reset **remove**: nível, atributos distribuídos, skills do ciclo.

### Custo de reset (estrutura)

- Ouro proporcional à faixa da dungeon + material raro a partir do 2º reset.
- Frequência-alvo Mortal: 1 reset a cada 8–12h de farm eficiente (provisório).

## 6. Classes e skills

### Classes (nomes de produção confirmados)

| Código | Nome | Fantasia | Principal |
|---|---|---|---|
| TK | Thegn Knight (Cavaleiro Thegn) | linha de frente | FOR |
| FM | Frost Maiden (Donzela Glacial) | magia à distância | INT |
| BM | Beast Master (Mestre das Feras) | invocação/área | INT/CONS |
| HT | Huntress (Caçadora) | físico à distância | DES |

Cada classe: 3 árvores específicas (Controle / Magia / Física) + 1 árvore comum por livros.

### Regras de skill

- **8 skills** por árvore específica.
- Skills 1–7 livres dentro da árvore, com pré-requisito linear (skill anterior ≥ 1).
- **8ª skill só em uma das três árvores** (escolha de especialização).
- Pontos de skill: 1 por nível; teto inicial 10 por skill.
- Especialização: **60 pts** total, **máx 40** na mesma árvore; redistribuível com custo.
- Redistribuição de atributos/skills: na cidade, custo em Ouro crescente.
- **Livros não são perdidos no reset.**

## 7. Itens, loot e economia

### Inventário

- **40 slots** de equipamento/item.
- Materiais empilham até **999**.
- Equipamentos não empilham.
- Ouro não ocupa espaço.

### Raridades

Comum → Incomum → Raro → Épico → Lendário (5 tiers).

### Slots de equipamento

Cabeça, Armadura, Arma, Anel 1, Anel 2, Colar, Brinco (7).

### Refinamento

- Faixa de lançamento: **+0 a +10**.
- **Falha não destrói o item** (decisão confirmada).
- Custo: Ouro + **Poeira de Ori** até +5; **Poeira de Lac** de +6 a +10.
- Ori: D1–D4. Lac: D5–D8 e bosses.

### Economia

- **Apenas Ouro** no lançamento. Sem moeda premium.
- Fontes: drop, venda, quests.
- Sumidouros: refine, reset, itens de entrada, livros, redistribuição.
- Sem troca entre jogadores.

## 8. Dungeons (lançamento Mortal)

- **8 dungeons**, repetíveis, pré-definidas, sem procedural.
- Sequência de arenas conectadas. Sem escolha de caminho.
- Protótipo: Dungeon de Teste, níveis 1–20, 3 arenas, sem item de entrada, boss opcional.

### Faixas propostas (provisórias de conteúdo)

| ID | Nível | Item de entrada |
|---|---|---|
| D1 | 1–40 | não |
| D2 | 35–90 | não |
| D3 | 80–150 | não |
| D4 | 140–220 | sim |
| D5 | 200–280 | sim |
| D6 | 260–330 | sim |
| D7 | 310–370 | sim (caro) |
| D8 | 350–400 | sim (caro) |

Sobreposição de faixas é intencional (repetição).

## 9. Cidade (Aurelion)

Hub 3D único. NPCs:

| NPC | Serviço |
|---|---|
| Guarda do Portal | entrada de dungeon |
| Mercador | compra/venda |
| Ferreiro | refinamento |
| Mestre de Skills | skills, especialização, livros |
| Sábio | evolução e reset |
| Intendente | inventário/armazenamento |
| Mestre de Quests | quests |

Atalhos de UI: I inventário, C personagem, K skills, J quests, M seleção de dungeon.

## 10. Fluxos de tela

1. **Primeira entrada** — criar personagem → cidade → tutorial curto → D1.
2. **Morte** — tela simples, recursos mantidos, botão cidade.
3. **Conclusão por tempo** — resumo XP/Ouro/itens → cidade.
4. **Level up** — feedback na HUD; pontos pendentes até distribuir.
5. **Evolução** — nível máximo da etapa + custo → Sábio → nova etapa nível 1.
6. **Reset** — nível máximo + Ouro/material → Sábio → nível 1 + 1.000 pts.

## 11. Save

- **IndexedDB** principal; LocalStorage só preferências/espelho.
- JSON versionado com `saveVersion` + migrações passo a passo.
- Export/import `.json` com confirmação.
- Corrupção: tenta espelho; senão save novo + download do arquivo corrompido.
- **Reload no meio da dungeon**: ao recarregar, personagem em **cidade** com recursos já creditados da sessão (regra simplificada do protótipo).

## 12. Técnico

- three.js + Vite + TypeScript.
- glTF/GLB; texturas WebP/PNG.
- Rapier3D só se colisão real for necessária; colisão simples de plano/caixa no greybox.
- Howler para áudio.
- Sem backend. Sem multiplayer. Sem ECS obrigatório.
- Build estático para host HTTP.

## 13. Performance e plataforma

- Chrome/Edge/Firefox atuais. Safari desktop em melhor esforço.
- Alvo 60 FPS; mínimo aceitável 30 em cena densa.
- 20–40 inimigos ativos por arena (alvo de design).
- Resolução-alvo 1600×900 a 1920×1080.

## 14. Arte e áudio (placeholders no greybox)

- Greybox: volumes cinza; gameplay colors: jogador azul, inimigo vermelho, spawn âmbar, drop dourado.
- Estilo final: 3D estilizado legível, silhueta forte.
- Áudio: 1 tema cidade, 2–3 dungeon, 1 boss; volumes mestre/música/SFX/UI.

### UI — estilo travado (lab 2026-10)

Detalhe em `visual/DECISOES-ESTILO.md`. Resumo executivo:

| Item | Decisão |
|---|---|
| Identidade | Nórdico medieval de salão (ferro, bronze, runas) |
| Paleta base | **C · Salão/Brasa** — `#100c08` / `#241c14` / `#d4a017` / `#a33b3b` / `#f0e6d0` |
| Moldura principal | A — ferro + cantos dourados |
| Moldura secundária | D — couro, só salão/NPC |
| Botão principal | Silhueta escudo; cores ouro/ferro/perigo/frost/ghost |
| Slots / skill HUD | Aprovados; skill com anel de cooldown |
| Emojis | **Proibidos** na UI — só PNG ou SVG |
| Raridades | Comum → Mítico, cores do lab |
| HP | World bar no personagem e inimigos; verde ≥ 40%, vermelho &lt; 40% |
| Runas | Elder Futhark aprovado como ícone de sistema |
| Abertura do jogo | Tela de **login** (local + Google simulado) com opções e salvar credenciais |
| Classes | TK Thegn Knight · FM Frost Maiden · BM Beast Master · HT Huntress (paralelos WYD TransKnight/Foema/BeastMaster/Huntress) |

## 15. Escopo de lançamento (corte)

**Entra:** 8 dungeons Mortal, 4 classes, reset Mortal, Ouro, refine +0–+10, quests mínimas, save, HUD funcional.

**Não entra no 1º build público:** conteúdo jogável Arch/Cele, eventos, IAP, ads, multiplayer, nuvem, narrativa longa, arte final completa.

## 16. O que ainda é provisório (pode mudar sem quebrar arquitetura)

- Números de XP, Ouro, drop, HP, dano, cooldown.
- Chance de sucesso de refine por nível.
- Custos exatos de reset e redistribuição.
- Nomes finais de skills, inimigos, biomas, dungeons.
- Quantidade de arenas por dungeon de conteúdo.
- Faixas D1–D8 (estrutura de tabela fixa).

A IA deve centralizar esses valores em `data/balance/` e registrar mudanças no GDD.
