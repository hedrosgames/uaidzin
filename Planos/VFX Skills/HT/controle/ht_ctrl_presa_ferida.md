# Presa Ferida — brief VFX profissional

Crie um VFX profissional para **Presa Ferida** (`ht_ctrl_presa_ferida`), da classe **Huntress**, árvore **Capture**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Rastro de ferida**. Uma garra deixa um corte luminoso estreito; fios ferruginosos continuam escorrendo sob a marca da presa.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `ht_ctrl_presa_ferida` |
| Classe | Huntress |
| Árvore | Capture |
| Tier | 3/8 |
| Tipo | `damage` |
| Forma | `single` |
| Poder | `weapon` |
| Elemento | físico |
| Alcance | 2.6 m |
| Cooldown | 4s |
| MP | 8 |

Leitura mecânica obrigatória: **dano 1.45×; alcance 2.6 m; DoT 40% por 5s**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/ht.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Presa Ferida**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- prata;
- verde frio;
- ciano dessaturado;
- violeta escuro.

Forma-chave: **Uma garra deixa um corte luminoso estreito; fios ferruginosos continuam escorrendo sob a marca da presa.**

Técnica autoral: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — PREPARO DE ARMA / CORPO

Uma garra deixa um corte luminoso estreito; fios ferruginosos continuam escorrendo sob a marca da presa.

## LAYER — ARCO PRINCIPAL

Acompanhar a trajetória real da arma, garra ou corpo com ribbon, arco volumétrico, segmentos instanciados ou mesh curva.

## LAYER — CONTATO

Impacto curto no alvo com flash texturizado e fragmentos orientados pelo golpe.

## LAYER — MATERIAL SECUNDÁRIO

6–14 partículas temáticas dão peso sem cobrir a animação.

## LAYER — DISSIPAÇÃO

Apagar trilhas/fragmentos em 100–250 ms.

## MOVIMENTO E ORIENTAÇÃO 3D

Calcular `direction = normalize(targetPosition - attackPoint)` e orientar núcleo, trail, streaks e impacto por esse vetor. O movimento existe no espaço 3D.

A geometria principal deve continuar legível em terceira pessoa, isométrica e top-down inclinada. Billboards entram apenas como partículas, flash e wisps auxiliares.

## TIMING

Preparo **30–90 ms**, arco/contato **70–180 ms**, impacto **50–120 ms**, dissipação **100–250 ms**.

Sequência autoral inicial: **claw em 0.1s (alvo) → rift em 0.35s (alvo) → motes em 0.55s (alvo).**.

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
ht_ctrl_presa_ferida_Release
ht_ctrl_presa_ferida_Main
ht_ctrl_presa_ferida_Secondary
ht_ctrl_presa_ferida_Impact
ht_ctrl_presa_ferida_Residual
```

Recursos compartilhados são criados uma vez por controller. Sistemas emitem apenas na fase correta, com `restart()/play()`, `endEmit()` e limpeza em `dispose()`.

## TEXTURAS E SPRITE SHEETS

Sprite sheet é secundária: **8–16 frames** para wisps/impacto; a identidade principal continua em geometria 3D.

A sequência visual é **formação → pico → deformação → quebra/dissipação**. Additive fica restrito a núcleo, flash e highlights; o corpo principal preserva valor e forma.

## REGRAS ESPECÍFICAS

- DoT deixa marca residual leve; o cast inicial continua sendo o maior pico.

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

**Presa Ferida** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **damage/single**, tema **físico** e dissipação limpa.
