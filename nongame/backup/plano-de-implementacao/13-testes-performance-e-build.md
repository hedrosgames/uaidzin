# 13. Testes, Performance e Build

## Fase 12

Uso real no navegador.

## Checklist funcional

Novo jogo · movimento · ataque auto · skill auto/manual · 3 AIs · morte · 10 min · retorno timer/morte · loot · inventário cheio · venda · equipar · refine · level up · evolução (se liberada) · reset · save/load.

## Performance

- Alvo 60 FPS; piso 30 em cena densa.
- 20–40 inimigos ativos.
- Pooling, instancing, reuso de material, GLB otimizado, load sob demanda.
- Medir draw calls, memória, tempo de boot (<10s em banda comum).

## Navegadores

Chrome/Edge/Firefox. Safari melhor esforço.

## Build

Vite production. Testar em HTTP real (não só dev server). Assets relativos.

## Acessibilidade mínima

Escala UI 80–140% · volumes separados · reduzir VFX/tremor · remapear teclas · raridade com rótulo, não só cor.

## Validação final

Sessão completa + load de save + build de produção.

## Saída

Build público de conteúdo Mortal.
