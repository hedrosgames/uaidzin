# UAIDZIN | Plano de Implementação

## Objetivo

Transformar o GDD em um jogo jogável em HTML, TypeScript e Web 3D. O alvo é o **loop completo** em greybox, não uma demo visual.

Placeholder 3D é permitido em todo o desenvolvimento inicial. Arte final não mascara problema de gameplay.

## Fontes de verdade

| Documento | Papel |
|---|---|
| GDD `01`–`30` | Regras e prosa do jogo |
| `19-decisoes-confirmadas.md` | Decisões travadas para implementação |
| `01-stack-e-arquitetura.md` | Arquitetura e estrutura de código |
| `16`–`18` | Estrutura, comunicação e modelos de dados |
| `14-regras-para-a-ia.md` | Obrigatórias para agentes |
| `15-checklist-de-implementacao.md` | Portão de entrada de cada fase |
| `32-auditoria-e-cobertura.md` | O que está fechado vs provisório |

## Ordem das fases

1. **02** Fundação técnica (Vite, TS, Three, loop)
2. **03** Mundo 3D, câmera fixa ¾, cidade Aurelion
3. **04** Personagem, WASD/clique, ataque auto, 3 AIs
4. **05** Dungeon 10 min, arenas, spawns, boss opcional
5. **06** XP, atributos, evolução, reset
6. **07** Loot, inventário 40, Ouro, refine, loja
7. **08** 4 classes, árvores, 8ª skill, especialização, livros
8. **09** HUD, telas, fluxos de morte/resultado/evolução/reset
9. **10** Save IndexedDB versionado
10. **11** 8 dungeons data-driven + conteúdo
11. **12** Integração, balanceamento, feedbacks
12. **13** QA, performance, build de produção

## Stack (fechada)

HTML5 · CSS3 · TypeScript · Vite · Three.js · glTF/GLB · IndexedDB · Howler · GSAP (UI) · Rapier3D sob demanda

Sem backend, multiplayer, ECS obrigatório ou DI container.

## Regra de ciclo curto

**Planejar → Implementar → Executar no navegador → Testar → Corrigir → Validar.**

Cada fase termina com build executável. Não acumular sistemas não testados.

## Registro por fase

- Objetivo e dependências
- Arquivos criados/alterados
- Comportamento esperado
- Teste manual no navegador
- Resultado
- Problemas conhecidos
- Pendências da próxima fase

## Critério de pronto do projeto

Jogador consegue: novo jogo → cidade → preparar → dungeon 10 min → farm → loot → evoluir → equipar → skills → morrer → retornar → reset → salvar → recarregar e continuar.

Validação final: sessão completa + sessão a partir de save.

## Documentos

| Arquivo | Conteúdo |
|---|---|
| `00-index.md` | Este índice |
| `01-stack-e-arquitetura.md` | Stack, camadas, serviços, eventos |
| `02`–`13` | Fases de implementação |
| `14-regras-para-a-ia.md` | Regras obrigatórias |
| `15-checklist-de-implementacao.md` | Checklist por fase |
| `16-estrutura-de-codigo.md` | Árvore e responsabilidades |
| `17-comunicacao-entre-sistemas.md` | Eventos e comandos |
| `18-modelos-de-dados-e-estado.md` | Tipos e serialização |
| `19-decisoes-confirmadas.md` | Design travado |
