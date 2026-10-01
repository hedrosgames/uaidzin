# Julgamento Sagrado — brief VFX profissional

Crie um VFX profissional para **Julgamento Sagrado** (`fm_ctrl_julgamento`), da classe **Frost Maiden**, árvore **White Mage**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Selo sentenciador**. Um losango sagrado fecha o alvo e recebe um golpe vertical de luz curta, preciso como um carimbo.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `fm_ctrl_julgamento` |
| Classe | Frost Maiden |
| Árvore | White Mage |
| Tier | 2/8 |
| Tipo | `damage` |
| Forma | `single` |
| Poder | `magic` |
| Elemento | sagrado |
| Alcance | 8 m |
| Cooldown | 3.2s |
| MP | 8 |

Leitura mecânica obrigatória: **dano 1.3×; alcance 8 m**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/fm.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Julgamento Sagrado**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- marfim luminoso;
- ouro pálido;
- branco quente;
- âmbar contido.

Forma-chave: **Um losango sagrado fecha o alvo e recebe um golpe vertical de luz curta, preciso como um carimbo.**

Técnica autoral: Three.js · geometria animada · partículas instanciadas..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — CHARGE / RELEASE

Um losango sagrado fecha o alvo e recebe um golpe vertical de luz curta, preciso como um carimbo.

## LAYER — NÚCLEO DO PROJÉTIL

Mesh 3D, instâncias ou geometria animada como identidade central. Sprite/partículas são invólucro.

## LAYER — TRAIL

Cauda curta, segmentada e afinando; revela velocidade sem ligar continuamente até a origem.

## LAYER — SECUNDÁRIAS

Motes, streaks ou fragmentos ao redor da curva de voo.

## LAYER — IMPACTO

Flash texturizado, anel/estilhaços e partículas direcionais com pico curto.

## LAYER — RESÍDUO

Dissipar em 150–450 ms sem emissão contínua.

## MOVIMENTO E ORIENTAÇÃO 3D

Calcular `direction = normalize(targetPosition - attackPoint)` e orientar núcleo, trail, streaks e impacto por esse vetor. O movimento existe no espaço 3D.

A geometria principal deve continuar legível em terceira pessoa, isométrica e top-down inclinada. Billboards entram apenas como partículas, flash e wisps auxiliares.

## TIMING

Charge **40–140 ms**, voo **100–420 ms** conforme distância, impacto **60–180 ms**, resíduo **120–450 ms**.

Sequência autoral inicial: **mark em 0s (alvo) → beam em 0.3s (alvo) → shards em 0.5s (alvo).**.

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
fm_ctrl_julgamento_Release
fm_ctrl_julgamento_Main
fm_ctrl_julgamento_Secondary
fm_ctrl_julgamento_Impact
fm_ctrl_julgamento_Residual
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

**Julgamento Sagrado** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **damage/single**, tema **sagrado** e dissipação limpa.
