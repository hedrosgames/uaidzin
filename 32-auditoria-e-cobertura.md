# UAIDZIN

## Auditoria e Cobertura do GDD

Revisão atualizada após o preenchimento das propostas de design e das decisões confirmadas. Esta auditoria serve para a IA de implementação saber o que **pode codar com confiança** e o que ainda é **número provisório**.

## Coberto e travado (não inventar)

- Loop Cidade → Dungeon 10 min → Farm → Retorno → Progressão/Reset.
- Autofire sem movimento autônomo.
- Ataque básico automático e bloqueado em movimento.
- Câmera fixa ¾; WASD + clique.
- Acerto/esquiva por fórmula.
- 3 arquétipos de inimigo + boss opcional.
- Mortal 1–400, Arch 1–400, Cele 1–200; resets independentes.
- 5 pts/nível; 1.000 pts/reset; reset mantém patrimônio.
- 4 classes: TK Thegn Knight, FM Frost Maiden, BM Beast Master, HT Huntress.
- 3 árvores × 8 skills + comum por livros; 8ª exclusiva.
- Especialização 60/40; livros sobrevivem ao reset.
- Inventário 40; material 999; perda se cheio.
- 5 raridades; refine +0–+10 sem destruir item; Ori/Lac.
- Apenas Ouro; sem ads; sem IAP no lançamento.
- 8 dungeons Mortal com faixas propostas e itens a partir de D4.
- Cidade Aurelion com 7 NPCs de serviço.
- Save IndexedDB versionado + export.
- three.js + Vite + TypeScript.
- Arch/Cele fora do lançamento público.

Fonte executável: `plano de implementação/19-decisoes-confirmadas.md`.

## Provisório (centralizar em dados)

- Fórmulas numéricas de XP, dano, defesa, HP, Ouro, drop.
- Chance de sucesso de refine por nível.
- Custos exatos de reset e redistribuição.
- Nomes de skills, inimigos, biomas, dungeons.
- Quantidade de arenas por dungeon de conteúdo.
- Faixas D1–D8 (valores podem deslizar; a tabela existe).

## Como a IA deve tratar

1. Estrutura confirmada → implementar direto.
2. Número provisório → `data/balance/*`, nunca hardcoded em service.
3. Se o GDD e `19-decisoes-confirmadas.md` divergirem, **GDD vence**; corrija o 19.
4. Não transformar valor de teste em regra permanente sem registrar no GDD.

## Riscos restantes

- Autofarm pode parecer chato se o posicionamento não for frequente o bastante (medir tempo parado).
- 8 dungeons × 400 níveis depende de faixas com repetição bem comunicada na UI de seleção.
- Inventário cheio com perda de item exige aviso claro a 80%.

## Resultado

O GDD e o plano cobrem o jogo completo do lançamento. O que resta de aberto é **calibração**, não descoberta de sistemas.
