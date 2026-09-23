# UAIDZIN

## Inimigos e Bosses

## Inimigos

Os inimigos são organizados por dungeon e possuem níveis fixos.

Eles podem surgir em ondas ou reaparecer em pontos determinados do cenário.

A composição e a frequência dos inimigos fazem parte do balanceamento de cada dungeon.

## Função no Farm

Os inimigos são a principal fonte de experiência, equipamentos e outros recursos obtidos durante o farm.

A densidade e a velocidade de respawn devem sustentar a atividade de farm durante os 10 minutos da dungeon.

## Progressão de Dificuldade

As dungeons possuem dificuldade crescente.

Os inimigos não escalam automaticamente com o nível do jogador.

## Bosses

Dungeons podem possuir bosses.

Bosses são encontros de maior dificuldade e podem funcionar como momentos de destaque dentro da atividade de farm.

## Proposta de Design

O protótipo em greybox usa três arquétipos. Eles cobrem os comportamentos já descritos no capítulo de combate.

### Arquétipos iniciais

- Spawn fixo: nasce no ponto definido, não persegue e permanece dentro de um raio curto do spawn.
- Perseguidor: aproxima do personagem até uma distância mínima e para de avançar.
- Longo alcance: mantém distância e ataca à distância. Cria pressão sobre posições paradas.

Cada arena do protótipo deve misturar pelo menos dois arquétipos.

### IA

- Spawn fixo não desloca por conta própria.
- Perseguidor segue em linha reta até a distância mínima e ataca quando o alvo estiver no alcance.
- Longo alcance recua se o personagem entrar muito perto e volta a atacar quando houver espaço.
- Nenhum inimigo usa caminho complexo nem flanqueia no protótipo.

### Respawn

- Cada ponto de spawn possui um temporizador próprio.
- O padrão inicial é de 3 a 8 segundos, ajustável por arena.
- Ondas de inimigos são opcionais e não substituem o respawn por ponto no protótipo.

### Drops individuais

- No protótipo, o drop pertence ao inimigo e usa a tabela da dungeon.
- Não existe drop exclusivo por arquétipo ainda.

### Bosses

- O protótipo usa no máximo um boss opcional na dungeon de teste.
- O boss permanece em uma arena e não persegue por toda a dungeon.
- A morte do boss não encerra o contador de 10 minutos.

## Dados Ainda Pendentes

- Nomes e identidade dos arquétipos.
- Famílias visuais de inimigos.
- Resistências elementares ou por tipo.
- Tabela completa de drop por inimigo.
- Variação de respawn por dificuldade.
- Padrões de ataque exclusivos de cada boss.
- Quantidade de bosses no lançamento.