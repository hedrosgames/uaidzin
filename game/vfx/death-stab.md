# Death Stab — execução

Pedido de Felipe em 01/10/2026. Task local em execução; `task create/start/done/block` indisponível nesta sessão.

Task adicional: transferir para o checkout da main antes da checagem final, conforme pedido de Felipe. Em execução; preservar mudanças existentes do Force Wave.

Escopo: substituir o VFX de `tk_fis_death_stab` por cinco ondas brancas de pressão, atlas transparente de 16 frames, trilha descontínua, streaks, turbulência lateral, liberação na arma, impacto e overshoot secundário. Parâmetros visuais seguem o pedido; regras de dano, mana, alcance e recarga permanecem as do código.

Verificação pendente: typecheck, build, QA de trajetória, timing, descarte, concorrência, integração e captura no lab. Aceite visual de Felipe pendente.

Arte: gerada pela ferramenta integrada imagegen. Atlas 4 × 4, leitura da esquerda para a direita e de cima para baixo; movimento para a direita em cada célula.

## Prompt do atlas

Create a production game VFX sprite atlas for Death Stab physical wind pressure attack. Exactly 4 columns x 4 rows, 16 equal square cells, 1024x1024 transparent PNG, no grid, no labels, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. White and gray-white hand-painted stylized cartoon wind slash, elongated curved pressure brushstroke with pointed tips, hollow transparent internal cuts, irregular fragmented edges, sharp readable silhouettes, no blur, no colored light. NOT discs, NOT magic missile, NO electricity/fire/smoke. Frames 1-2 tiny narrow white stroke; 3-5 explosive expansion into long asymmetric hooked gust with thin trailing scratches; 6-9 full strong sharp curved gust, semitransparent body and small opaque white accents; 10-12 breaking silhouette and separated sharp wind shards; 13-15 dissipating sparse fragments; frame 16 completely empty transparent. Shape stays centered, animation changes shape not position. Keep each shape within its own cell. Pure transparent background including holes.
