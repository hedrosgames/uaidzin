# Assets não runtime

Esta árvore guarda fontes, referências e arquivos que não são consumidos pelo jogo.

## Drive

Fonte: https://drive.google.com/drive/u/0/folders/1dZgY2qI9fmGkeTpSFG8hGyW45hI5QpIk

- `drive/animations/human/`: FBX humanos, incluindo duplicatas e clips descartáveis.
- `drive/animations/mutant/`: FBX e packs de animação mutant, com os dois packs extraídos.
- `drive/models/`: ZIPs e GLB de malhas candidatas, com os ZIPs extraídos.
- `drive/art/`: `monsters.psd`, arte 2D sem uso direto no runtime.

## Não consumidos

- `animations/unused/human/`: clips humanos sem consumidor no código atual.
- `animations/unused/mutant/`: clips mutant ainda sem bind no runtime.
- `animations/unused/debug/`: cópias antigas em `player/TK/anims/`.
- `models/unused/`: `fountain-simple.glb`, sem spawn no mundo.

Os arquivos ativos continuam em `game/public/` e os paths de `game/src` não devem apontar para esta pasta.
