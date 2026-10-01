# AGENTS.md — UAIDZIN

UAIDZIN é um RPG 3D de farm no navegador feito com Three.js, Vite e TypeScript.

- Runtime: `game/`
- Documentação ativa: `nongame/docs/`
- Build gerada: `game/dist/` — não editar à mão.

## Fonte de verdade

Antes de alterar qualquer coisa:

1. Buscar a `main` mais recente.
2. Ler `nongame/docs/project/README.md`.
3. Ler o inventário relevante em `nongame/docs/inventarios/`.
4. Ler o código/runtime afetado.

Em conflito, a ordem é:

**pedido atual do Felipe + comportamento/save real > código atual > inventários > documentação histórica**.

Ignorar no fluxo normal `nongame/backup/`, planos removidos, checklists antigos e cópias históricas de GDD.

## Git e concorrência

- Nunca assumir que o SHA lido no começo ainda é o HEAD antes de gravar.
- Antes de commit/push, buscar `main` novamente.
- Se `main` mudou, refazer o diff sobre o novo HEAD. Não aplicar patch antigo às cegas.
- Nunca usar force push.
- Commit e push somente com autorização explícita do Felipe.
- Commits devem ser focados, legíveis e em pt-BR.
- Não sobrescrever mudança recente sem entender por que ela entrou.

## Código

Regra dura: **não escrever comentários em TypeScript, JavaScript, CSS ou HTML inline**.

Exceção: `/// <reference types="vite/client" />`.

Ao fechar uma mudança:

- zero `console.log` de debug;
- zero temporários, código morto ou arquivos de teste descartáveis;
- zero emoji em UI;
- nenhum código gerado editado manualmente;
- remover infraestrutura obsoleta em vez de manter flags e contratos sem consumidor;
- preferir uma regra central a vários special cases equivalentes.

## Performance

Hot paths incluem `update`, `render`, HUD por frame, AI, combate e VFX.

- Não reconstruir catálogo, `Map`, lookup estático ou configuração imutável a cada frame.
- Não fazer `scene.traverse`, sorting, clone ou alocação evitável por frame quando o dado puder ser cacheado.
- VFX pesado deve criar recursos compartilhados no controller, não por cast.
- Sistemas de partículas inativos não devem receber trabalho de matriz/update sem necessidade.
- Todo emitter, mesh, material, geometry e luz criado por cast precisa ter lifecycle claro de limpeza.
- Luz de pool volta ao pool; luz própria é removida e descartada.
- Otimização visual não começa reduzindo qualidade. Primeiro remover trabalho redundante, alocação, compilação tardia e recursos órfãos.
- Controllers/VFX pesados das skills equipadas devem ser aquecidos antes do gameplay, durante o carregamento, para evitar travamento no primeiro uso.

## Combate e skills

`CombatOrchestrator` é a fonte central para sincronização entre animação, VFX e impacto.

- Não duplicar timing de ataque em controllers de VFX.
- Skill de dano baseada em `power: "weapon"` deve usar `PlayerView.playAttack()`, permitindo que o weapon set escolha o clip correto.
- O hit-frame deve acompanhar a duração real da animação, não um tempo absoluto copiado entre armas.
- Quando um projétil tem tempo de viagem, separar momento de disparo e momento de impacto.
- Dano que depende da chegada visual deve acontecer no impacto, não antes.
- Ataque/skill pendente deve ser cancelado em morte, troca de mundo ou reset de combate.
- Não deixar ação atrasada sobreviver ao contexto onde foi iniciada.
- Cooldown e duração atuais no código são a fonte de verdade. Não reintroduzir `recastWindowSec` sem nova regra explícita.
- Mudança de range, target selection, cooldown ou área precisa de teste de limite.

## VFX

Referência de acabamento: `nongame/docs/project/VFX-KIT-FIREBURST.md` e o kit compartilhado em `game/src/presentation/effects/vfxKit/`.

- Reutilizar recursos/kit existentes antes de criar um pipeline paralelo.
- VFX dedicado deve estar mapeado no catálogo; perder o mapping não pode degradar silenciosamente para o genérico.
- Evitar duas malhas transparentes quase coincidentes quando isso puder gerar leitura de efeito duplicado.
- VFX direcionado deve derivar orientação do alvo e manter geometria legível nos ângulos da câmera do jogo.
- Warm-up deve criar os recursos reais de cast, compilar e limpar antes de liberar o loop.
- Não disparar VFX de passiva ou entrada de mundo automaticamente sem comportamento de design explícito.

### Regressões visuais que devem ser preservadas

- Earthquake: onda radial de **6 m** com poeira, terra e pedras/detritos. Não substituir pelo AoE genérico.
- Fire Burst: projétil/corrente legível durante o percurso e impacto sincronizado.
- Force Wave: VFX único e legível; não voltar a sobrepor camadas que pareçam duas ondas.

## Rendering e mundo

### Sombras

- A sombra direcional acompanha o jogador.
- O centro da shadow camera usa snap por texel para reduzir shimmering.
- Não prender novamente a sombra da cidade em `(0, 0)`.
- Presets atuais controlam frequência e resolução; preservar a resposta visual antes de aumentar custo.

### Cidade

- Piso geral atual: `game/public/textures/city-painted/cobble-moss.webp`.
- `earth.webp` permanece no projeto para bioma/área de deserto.
- A praça/fonte usa material próprio e não deve herdar a troca do piso geral.
- Textura de chão precisa continuar seamless.
- A fonte não ativa o shader de oclusão do jogador.
- Os braseiros/tochas removidos da cidade continuam como assets reutilizáveis; não deletar só porque deixaram de spawnar ali.

### Escala — trava dura

Sem pedido explícito do Felipe, é proibido alterar:

- `PlayerView.fitStandingHeight`;
- `TARGET_HEIGHT`;
- `model.scale` do player;
- nova medição de altura para “corrigir” animação, arma, oclusão ou load;
- fitting/escala automática de inimigos em `EnemyRuntimeView`.

Problema de animação se corrige no clip/mixer/weapon set, não na escala do modelo.

## Dungeon 1 e inimigos

Enquanto o layout atual estiver valendo:

- Zona 1: 4 grupos de 3 `caveira_campo`.
- Zona 2: 4 grupos de 3 `lobo_selvagem`.
- Zona 3: 4 grupos de 3 `caveira_fogo` + boss separado.
- IDs de spawn são únicos e grupos não devem nascer sobre props/limites.
- `caveira_campo` preserva o material original do GLB; não passar novamente pelo shader `painted-character` sem validação visual.

## UI e save

Fonte de runtime da UI:

- `game/public/boot/`
- `game/src/ui/`
- wire em `game/src/ui/wire/`

Regras:

- UI mostra dados reais do save; não inventar classe, atributos, ouro, skills ou equipamento.
- pt-BR correto e sem emoji.
- Ícone inexistente não deve virar placeholder enganoso.
- Sábio é tutorial/codex; skills ficam no fluxo de skills.
- Painéis e atalhos devem manter comportamento consistente entre cidade e dungeon.
- Save/runtime: `game/src/persistence/`; boot: `game/public/boot/assets/save-store.js`.

## Validação

Para mudança em `game/src`:

```text
cd game
npm run typecheck
```

Executar também testes pontuais do domínio afetado e smoke/QA visual quando aplicável.

Antes do commit:

1. reler o diff final;
2. confirmar o HEAD atual;
3. confirmar ausência de comentário/debug/temporário;
4. validar lifecycle de recursos se houver VFX/rendering;
5. validar limites se houver combate/range/cooldown;
6. não afirmar que teste rodou se o ambiente não permitiu executá-lo.

UI, HUD e comportamento visual continuam exigindo validação do Felipe no jogo.
