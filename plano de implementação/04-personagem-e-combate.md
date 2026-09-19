# 04. Personagem e Combate

## Fase 3

Combate completo em uma arena simples.

## Personagem runtime

- Vida, nível 1, atributos FOR/DES/CONS/INT.
- Arma placeholder com alcance e velocidade de ataque.
- Estados: vivo, movendo, parado, atacando, morto.

## Ataque básico (confirmado)

- Automático. Sem botão.
- Enquanto `moving == true`: **não** inicia nem mantém ciclo de ataque.
- Ao parar: procura alvo válido no alcance e ataca na cadência da arma.
- Dano final provisório: `max(1, ataque − defesa)`.
- Acerto 95% / esquiva 5% (dados).

## Skills stub

- Pelo menos **1 skill** com auto e manual.
- Auto dispara sozinha com cooldown.
- Manual: tecla 1.
- Ataque básico permanece automático nos dois casos.

## Inimigos

Modelo genérico + 3 AIs:

1. Spawn fixo (raio curto).
2. Perseguidor (distância mínima).
3. Ranged (mantém range; recua se perto).

Respawn 3–8s por spawn (dado).

## Morte

Personagem morre → processa morte → cidade. Recursos da sessão já creditados permanecem.

## Validação

Arena: andar, parar, atacar auto, skill auto/manual, matar os 3 tipos, sofrer dano, morrer e voltar.

## Saída

Combate Archero-like com autofarm no lugar.
