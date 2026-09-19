# 02. Fundação do Projeto

## Fase 1

Projeto web mínimo executável. Ler `19-decisoes-confirmadas.md` e `01-stack-e-arquitetura.md` antes.

## Implementação

1. `npm create vite@latest` com template vanilla-ts (ou estrutura equivalente).
2. Scripts: `dev`, `build`, `preview`.
3. `index.html` com canvas full-viewport e overlay de UI.
4. Three.js: renderer, scene, camera, `GameLoop` com deltaTime.
5. Resize responsivo.
6. Iluminação hemisférica + direcional simples.
7. Chão placeholder (plano).
8. Objeto 3D de teste.
9. `ErrorReporter` + logs em desenvolvimento.
10. Pasta `src/` conforme `16-estrutura-de-codigo.md` (vazia se preciso, mas criada).
11. `EventBus` tipado mínimo (`game:ready`).
12. `GameStateStore` com modo `BOOT`.

## Validação

Navegador abre cena 3D estável, sem erros de console, loop contínuo, FPS visível em debug.

## Não fazer

Inventário, skills, economia, arte final, física complexa.

## Saída

Projeto pronto para a Fase 2.
