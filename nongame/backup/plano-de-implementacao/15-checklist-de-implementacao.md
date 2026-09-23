# 15. Checklist de Implementação

Portão de entrada de cada fase. A IA **não codifica** sem rodar isto.

## Antes de cada fase

1. Ler `00-index.md`.
2. Ler `19-decisoes-confirmadas.md`.
3. Ler `32-auditoria-e-cobertura.md`.
4. Ler o capítulo do GDD do sistema.
5. Ler o arquivo da fase (`02`–`13`).
6. Separar: **confirmado** × **provisório**.
7. Definir o teste de aceite no navegador.
8. Registrar resultado ao fim da fase.

## Bloqueia implementação definitiva

Só se **não** estiver em `19`:

- Nova fórmula de sistema ainda sem dono.
- Mudança de regra de reset/inventário/combate.
- Nova moeda ou monetização.
- Conteúdo Arch/Cele como obrigatório de lançamento.

Se estiver em `19`, implementar. Se for número provisório, ir para `data/balance`.

## Valores provisórios permitidos

Dano, vida, defesa, velocidade, cooldown, XP, Ouro, drop rate, quantidade de inimigos, tamanho de arena, alcance, chance de refine, custo de reset.

**Sempre** em dados, nunca espalhados em services.

## Teste mínimo por sistema

| Sistema | Teste |
|---|---|
| Movimento | andar + limite |
| Ataque | parado ataca; andando não |
| Skill | auto e manual |
| Inimigo | parado, perseguidor, ranged |
| Dungeon | timer 10 min e saída |
| Loot | item entra; inventário cheio perde |
| Progressão | XP, level, 5 pts |
| Reset | remove/mantém corretamente |
| Equip | equipar, vender, refinar |
| Save | salvar, recarregar, conferir |

## Conclusão de fase

Código escrito **não** basta. Fluxo executado no navegador, comportamento observado, erros corrigidos ou listados.

## Regressão

Depois de cada sistema grande, rodar o loop:

**Cidade → Dungeon → Farm → Retorno → Progressão → Nova dungeon.**
