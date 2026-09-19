# 06. Progressão e Reset

## Fase 5

Progressão sobre o farm funcional. Decisões em `19`.

## Níveis e evoluções

- Mortal 1–400 (lançamento).
- Arch 1–400 e Cele 1–200: **implementar o sistema**, conteúdo fora do 1º build público.
- Resets independentes por etapa.

## XP

- Curva por degraus de dungeon (dados em `data/balance/xp.json`).
- Provissório flat por monstro dentro de cada faixa é aceitável no greybox.

## Atributos

- FOR, DES, CONS, INT.
- 5 pontos por nível.
- Distribuição na cidade; redistribuição com custo em Ouro.

## Evolução

- Nível máximo da etapa + custo → Sábio → nova etapa nível 1.
- Mantém patrimônio permanente.

## Reset (confirmado)

Remove: nível, atributos do ciclo, skills do ciclo.  
Mantém: equipamentos, refinamentos, inventário, evolução.  
Concede: **1.000** pontos de atributo.  
Custo: Ouro + material (Lac a partir do 2º reset de Mortal).  
Volta ao nível 1 da **mesma** etapa.

## Validação

Subir nível, distribuir, evoluir (stub se conteúdo bloqueado), resetar sem perder patrimônio.

## Saída

Progressão e reset de Mortal jogáveis.
