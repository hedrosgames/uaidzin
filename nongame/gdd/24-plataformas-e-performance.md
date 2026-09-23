# UAIDZIN

## Plataformas e Performance

## Plataforma

A plataforma-alvo é navegador em desktop.

O jogo deve funcionar diretamente no navegador, sem instalação tradicional.

## Web 3D

A experiência depende de renderização 3D no navegador, incluindo modelos, animações, efeitos e ambientes.

## Performance

Performance é uma restrição central do projeto porque o jogo precisa executar uma experiência 3D dentro de um navegador.

A prioridade deve ser manter estabilidade durante o farm, quando podem existir vários inimigos, efeitos e ataques simultaneamente.

## Otimização

O projeto deverá considerar desde o início:

- Quantidade de inimigos simultâneos.
- Reuso de objetos.
- Complexidade dos modelos.
- Quantidade de materiais.
- Texturas.
- Efeitos visuais.
- Carregamento de assets.
- Tamanho final do jogo.


## Proposta de Design

### Navegadores

- Chrome e Edge atuais.
- Firefox atual.
- Safari desktop em melhor esforço no lançamento.

### Hardware mínimo de alvo

- Notebook integrada de geração recente.
- 8 GB de RAM.
- Sem exigência de GPU dedicada.

### Resolução e FPS

- Alvo de 1600x900 a 1920x1080.
- 60 FPS como ideal.
- 30 FPS mínimo aceitável em cenas densas.

### Inimigos simultâneos

- Alvo de design: 20 a 40 inimigos ativos na arena.
- Pool de objetos e LOD simples.
- VFX limitados por contagem simultânea.

### Carregamento

- Draco ou compressão similar em modelos pesados, se necessário.
- Texturas com mipmap e tamanho controlado.
- Primeira cena em menos de 10 segundos em banda larga comum.

## Pendências

- Medir baseline no protótipo.
- Definir limite rígido de VFX por segundo.
- Testes em máquina low-end.
