# UAIDZIN

## Visão Geral

UAIDZIN é um RPG 3D de farm e autofarm para navegador. O jogo combina o controle direto do personagem durante o combate com a progressão persistente dos RPGs clássicos de farm.

O jogador possui um personagem permanente, equipado e evolutivo. A cidade é o ponto central da experiência. Dela, o jogador prepara o personagem e escolhe uma dungeon para farmar.

Dentro da dungeon, o jogador controla diretamente o movimento do personagem. O ataque básico acontece automaticamente e as skills podem funcionar de forma automática ou manual.

Cada entrada em uma dungeon dura 10 minutos. Ao entrar, o contador começa imediatamente. Quando o tempo chega a zero, a atividade termina e o personagem retorna para a cidade. Se o personagem morrer antes disso, também retorna para a cidade.

A progressão é contínua e possui três etapas: Mortal, Arch e Cele. Cada etapa possui seu próprio ciclo de nível e de reset.

## Fantasia Principal

A fantasia central é controlar um personagem no meio da batalha sem precisar comandar cada ataque.

O jogador decide onde o personagem deve estar, quais spawns deve farmar e quando vale a pena se reposicionar. O personagem executa o ataque básico automaticamente enquanto estiver parado.

Ao mesmo tempo, o personagem é permanente. Equipamentos, refinamentos, inventário e demais patrimônios conquistados acompanham o jogador entre as dungeons e permanecem após os resets.

## Loop Principal

**Cidade → Preparação → Dungeon → Farm → Retorno → Progressão → Nova Dungeon**

Na cidade, o jogador prepara o personagem, organiza o inventário, melhora equipamentos e escolhe a próxima dungeon.

Na dungeon, o jogador tem 10 minutos para aproveitar o espaço disponível, derrotar inimigos e acumular experiência, equipamentos, Ouro e outros recursos.

Quando o tempo termina ou o personagem morre, ele retorna para a cidade. Os recursos já obtidos permanecem com o personagem.

Na cidade, o resultado do farm é transformado em crescimento. O jogador pode melhorar atributos, skills, equipamentos e build ou realizar um reset quando cumprir os requisitos.

## Estrutura da Dungeon

Cada dungeon é uma área fechada e independente, formada por arenas conectadas em uma estrutura pré-definida.

O jogador entra, o contador de 10 minutos começa e o farm acontece dentro desse período. Não existe geração procedural de salas nem escolha de caminhos.

Os inimigos podem surgir em ondas ou reaparecer em pontos definidos. Alguns permanecem próximos ao spawn, enquanto outros podem perseguir o personagem ou atacar à distância.

## Combate

O combate é baseado em posicionamento e automação.

O ataque básico é sempre automático e depende da arma equipada. O personagem não realiza o ataque básico enquanto estiver se movimentando.

As skills podem ser automáticas ou manuais. O jogador pode desligar a automação das skills quando quiser, mas o ataque básico continua automático.

Acerto e esquiva são determinados pelos sistemas de combate. Não existe uma mecânica manual de esquiva baseada em apertar um botão no momento do ataque.

## Progressão

O personagem possui três etapas de evolução:

- **Mortal:** níveis 1 a 400.
- **Arch:** níveis 1 a 400.
- **Cele:** níveis 1 a 200.

Cada etapa possui sua própria progressão e seus próprios resets.

O reset reinicia o nível, os atributos e as skills do ciclo atual e concede pontos de atributo adicionais para a próxima progressão. Equipamentos, refinamentos, inventário e demais patrimônios permanentes não são perdidos.

## Plataforma

UAIDZIN será desenvolvido como um jogo 3D para navegador, com foco em desktop e sem instalação tradicional.

A implementação utilizará HTML, JavaScript e as tecnologias necessárias para executar modelos 3D, animações, efeitos, áudio e sistemas de jogo diretamente no navegador.

## Modelo de Experiência

UAIDZIN é single-player e offline. A experiência principal não depende de servidores, outros jogadores, guildas ou economia entre jogadores.

O jogo não é estruturado como um MMORPG nem como um ARPG tradicional baseado em ação constante. O foco está na combinação entre controle direto, combate automático, farm, progressão persistente e resets.