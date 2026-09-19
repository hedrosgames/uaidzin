# UAIDZIN

## Interface e UX

## Princípio

A interface deve permitir que o jogador administre um RPG de progressão profunda sem interromper desnecessariamente o fluxo entre cidade e dungeon.

## Durante a Dungeon

A interface deve comunicar claramente:

- Vida do personagem.
- Tempo restante da dungeon.
- Habilidades disponíveis.
- Estado de automação das habilidades.
- Informações relevantes de combate.
- Progressão e recompensas obtidas.

## Na Cidade

A interface deve permitir acesso aos sistemas de:

- Personagem.
- Atributos.
- Skills.
- Equipamentos.
- Inventário.
- Lojas.
- Quests.
- Dungeons.
- Evolução e reset.

## Filosofia

O controle durante a dungeon deve ser simples.

A complexidade deve estar principalmente na preparação e na progressão do personagem.


## Proposta de Design

### HUD da dungeon

- Contador de 10 minutos no topo central.
- Slots de skills no inferior central, com cooldown em anel.
- Indicador de autofarm por skill.
- Aviso de inventário a 80% e em 100%.
- Mini log de loot recente no canto, sem spam.
- Ouro visível no canto superior direito.

### Vida em world space

A vida não vive só na HUD.

- Barra de vida **sobre o personagem** e **sobre cada inimigo** no mundo 3D.
- Verde enquanto HP ≥ 40% do máximo.
- Vermelho abaixo de 40%.
- A HUD pode espelhar o HP do jogador com a mesma regra de cor, sem ser a fonte primária de leitura em combate.

### Ícones

- Nunca emojis na interface. Sempre PNG ou SVG.
- Ícone de skill legível a 32px.
- Runas Elder Futhark como alfabeto de ícones de sistema (tabs, escolas, flavor).

### HUD da cidade

- Acesso rápido a inventário, atributos, skills, quests e mapa da cidade.
- Ouro sempre visível.
- Botão de entrada em dungeon leva à seleção.

### Navegação

- Esc ou botão fecha a interface aberta.
- Atalhos: I inventário, C personagem, K skills, M mapa/seleção, J quests.
- Nenhuma tela exige arrastar item para vender no protótipo. Venda por seleção.

### Feedbacks

- Loot: brilho curto no slot e nome do item flutuando.
- Level up: flash dourado e texto de nível.
- Morte: tela simples com recursos mantidos e botão de retorno.
- Conclusão de dungeon: resumo de experiência, Ouro e itens.
- Inventário cheio: aviso persistente e mensagem no chat/log.

### Filosofia

- Na dungeon, poucos botões. Quase tudo é posicionamento.
- Na cidade, a complexidade de build fica em telas organizadas, não em um painel só.

### Tela de login (primeira tela)

O jogo abre no login, antes da cidade ou da criação de personagem.

- Campos: login e senha.
- Opção de salvar credenciais no dispositivo.
- Login com Google (simulado — o jogo é single-player offline; não há backend real).
- Botão de entrar habilita só com os dois campos preenchidos.
- Mensagem de erro (campos vazios, credenciais inválidas).
- Mensagem de sucesso antes de avançar.
- Botão de opções abre as configurações do jogo (áudio, vídeo, controles) sem sair da tela.

Detalhes de fluxo em `20-fluxos-e-telas.md`. Direção visual em `visual/DECISOES-ESTILO.md`.

## Pendências

- Mockup final do HUD.
- Produção dos ícones SVG/PNG (sem emoji).
- Cards de item e classe (novo round de design).
- Telas compostas (personagem, dungeons) — mais opções.
- Tela de resultado — refinar.
- Se haverá chat/log completo ou só toast.
