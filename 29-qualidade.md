# UAIDZIN

## Qualidade

## Objetivo

A qualidade do jogo será validada principalmente pelo funcionamento do loop completo de farm e progressão.

## Critérios Fundamentais

O protótipo deve validar:

- Cidade funcional.
- Entrada em dungeon.
- Movimento do personagem.
- Ataque automático.
- Skills automáticas e manuais.
- Inimigos.
- Respawn e ondas.
- Morte.
- Loot.
- Experiência.
- Equipamentos.
- Progressão.
- Retorno à cidade.

## Testes de Gameplay

Uma sessão de teste deve permitir entrar em uma dungeon, farmar durante 10 minutos, retornar à cidade e aplicar o resultado na progressão.

O teste também deve validar o retorno antecipado em caso de morte e o comportamento do inventário quando não houver espaço para receber um item.

## Performance

A experiência deve permanecer estável durante situações com múltiplos inimigos e efeitos simultâneos.

## Greybox

O greybox deve ser usado para validar gameplay, escala e fluxo antes da produção visual definitiva.


## Proposta de Design

### Checklist de QA do protótipo

- Entrar na dungeon pelo portal.
- Mover, parar e ver ataque automático.
- Skill automática e manual.
- Matar monstros e receber XP e Ouro.
- Receber loot e ver inventário.
- Inventário cheio perde item e avisa.
- Morte mantém recursos.
- Timer de 10 minutos encerra a dungeon.
- Level up distribui pontos.
- Reset limpa ciclo e mantém equipamento.
- Save recarrega o personagem completo.

### Casos de teste de save

- Fechar a aba no meio da dungeon e voltar na cidade com recursos corretos.
- Importar save exportado.
- Save de versão antiga migra sem erro.

### Performance

- 60 FPS alvo em arena com 25 inimigos.
- Sem travamento de 1 segundo em loot denso.

### Balanceamento

- Sessão de teste de 30 minutos deve produzir ao menos um nível visível de progresso no início e sensação de escolha de dungeon depois.

## Pendências

- Automação de smoke test.
- Matriz de navegadores.
- Teste de acessibilidade.
