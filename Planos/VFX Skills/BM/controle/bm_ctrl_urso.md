# Invocar Urso — brief VFX profissional

Crie um VFX profissional para **Invocar Urso** (`bm_ctrl_urso`), da classe **Beast Master**, árvore **Summon**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Casulo de musgo**. Um casulo de folhas grossas se rompe e revela o urso; o pouso espalha uma roda de poeira macia.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `bm_ctrl_urso` |
| Classe | Beast Master |
| Árvore | Summon |
| Tier | 4/8 |
| Tipo | `summon` |
| Forma | `self` |
| Poder | `weapon` |
| Elemento | sem elemento |
| Alcance | 2.8 m |
| Cooldown | 4.6s |
| MP | 10 |

Leitura mecânica obrigatória: **invoca urso (tank)**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/bm.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Invocar Urso**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- verde musgo;
- ocre terroso;
- âmbar natural;
- marfim quente.

Forma-chave: **Um casulo de folhas grossas se rompe e revela o urso; o pouso espalha uma roda de poeira macia.**

Técnica autoral: Three.js · geometria animada · partículas instanciadas · CanvasTexture..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — SIGILO DE CHAMADO

Um casulo de folhas grossas se rompe e revela o urso; o pouso espalha uma roda de poeira macia.

## LAYER — MATERIALIZAÇÃO

Criar um ponto de spawn claro e formar a criatura de dentro para fora.

## LAYER — VÍNCULO

Fio/arco curto entre invocador e spawn por 100–250 ms comunica autoria do summon.

## LAYER — BURST DE SPAWN

No frame em que a criatura entra no gameplay, soltar poeira, folhas, penas, faíscas ou energia coerente com ela.

## LAYER — LIMPEZA

Portal e emissão pesada desaparecem rápido; o summon persiste sem VFX contínuo caro.

## MOVIMENTO E ORIENTAÇÃO 3D

Ancorar a ativação ao personagem. Estado persistente segue sockets/`Group` local e não depende da câmera.

A geometria principal deve continuar legível em terceira pessoa, isométrica e top-down inclinada. Billboards entram apenas como partículas, flash e wisps auxiliares.

## TIMING

Preparação **120–260 ms**, materialização **220–500 ms**, burst **80–180 ms**, portal limpo em até **650 ms**.

Sequência autoral inicial: **leaves em 0s (origem) → bear em 0.35s (origem) → dust em 0.65s (origem).**.

Os tempos acima são parâmetros visuais de partida. Ajustar no lab sem deslocar o momento mecânico do cast.

## SCALE E ALPHA OVER LIFE

- 0%: escala **0,15–0,40**, alpha **0**;
- 10–20%: escala **0,75–1,00**, alpha **0,75–1,00**;
- meio: forma estável, deformação pequena, alpha **0,55–0,85**;
- 70–85%: quebra/abertura, alpha abaixo de **0,45**;
- final: expansão ou retração temática, alpha **0**.

Núcleo, trail, impacto e resíduo usam curvas diferentes para criar profundidade.

## THREE.JS + QUARKS

Reutilizar `game/src/presentation/effects/vfxKit/`: `curveTrajectory.ts`, `CometTail`, `quarkFx.ts`, `canvasTexture.ts`, `InstancedMesh` e `ParticleSystem` por função.

Estrutura sugerida:

```text
bm_ctrl_urso_Sigil
bm_ctrl_urso_Materialize
bm_ctrl_urso_Link
bm_ctrl_urso_Spawn
```

Recursos compartilhados são criados uma vez por controller. Sistemas emitem apenas na fase correta, com `restart()/play()`, `endEmit()` e limpeza em `dispose()`.

## TEXTURAS E SPRITE SHEETS

Quando a matéria pedir animação, usar atlas **4×4** ou sprite sheet de **8–16 frames**, fundo transparente, alpha limpo e deformação desenhada à mão.

A sequência visual é **formação → pico → deformação → quebra/dissipação**. Additive fica restrito a núcleo, flash e highlights; o corpo principal preserva valor e forma.

## REGRAS ESPECÍFICAS

- Não sugerir status, alcance ou comportamento que não existam na ficha.

## PERFORMANCE E CLEANUP

- reutilizar materiais, geometrias e texturas;
- usar `InstancedMesh` para repetição;
- nenhuma textura/geometria nova por cast;
- nenhum mesh, luz, emitter ou Quarks órfão;
- memória do renderer estável após ciclos;
- coordenadas inválidas sem NaN/infinito;
- em qualidade reduzida, cortar partículas secundárias antes da silhueta principal.

## QA

Validar: múltiplas câmeras; 11 direções quando fizer sentido; alvo próximo e no alcance máximo; alturas diferentes; origem=alvo quando permitido; impacto/área no ponto mecânico; nada abaixo do chão; `clear()/dispose()`; memória estável em ≥12 ciclos; concorrência; integração catálogo/dispatcher; zero erro de shader/console; `npm run typecheck` e `npm run build`.

## RESULTADO FINAL

**Invocar Urso** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **summon/self**, tema **Beast Master** e dissipação limpa.
