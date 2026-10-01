# Ursão Ancião — brief VFX profissional

Crie um VFX profissional para **Ursão Ancião** (`bm_fis_ursao`), da classe **Beast Master**, árvore **Nature**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Espírito ancião**. Pedras flutuam ao redor dos pés; um urso enorme ocupa a silhueta e solta pó dourado dos ombros.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `bm_fis_ursao` |
| Classe | Beast Master |
| Árvore | Nature |
| Tier | 6/8 |
| Tipo | `transform` |
| Forma | `self` |
| Poder | `weapon` |
| Elemento | sem elemento |
| Alcance | 2.8 m |
| Cooldown | 6s |
| MP | 12 |

Leitura mecânica obrigatória: **forma urso 18s; escala 1.24×; ataque 1.12×; defesa 1.42×; HP 1.35×**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/bm.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Ursão Ancião**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- verde musgo;
- ocre terroso;
- âmbar natural;
- marfim quente.

Forma-chave: **Pedras flutuam ao redor dos pés; um urso enorme ocupa a silhueta e solta pó dourado dos ombros.**

Técnica autoral: Three.js · geometria animada · partículas instanciadas · CanvasTexture..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — PRÉ-TRANSFORMAÇÃO

Pedras flutuam ao redor dos pés; um urso enorme ocupa a silhueta e solta pó dourado dos ombros.

## LAYER — CASCA DE FORMA

Silhueta temporária 3D envolve o personagem e cresce até o volume da forma. Não usar imagem plana da criatura.

## LAYER — IMPULSO

Pulso curto no solo e partículas comunicam massa, espécie e ferocidade no instante da troca.

## LAYER — FORMA ATIVA

Manter só detalhes baratos: olhos, respiração, poeira, runas naturais ou fragmentos. O modelo é a identidade principal.

## LAYER — RETORNO

Puxar os acentos de volta ao corpo em 150–300 ms.

## MOVIMENTO E ORIENTAÇÃO 3D

Ancorar a ativação ao personagem. Estado persistente segue sockets/`Group` local e não depende da câmera.

A geometria principal deve continuar legível em terceira pessoa, isométrica e top-down inclinada. Billboards entram apenas como partículas, flash e wisps auxiliares.

## TIMING

Preparação **120–260 ms**, transição **220–500 ms**, fechamento **250–650 ms**. Forma mecânica: **18s**.

Sequência autoral inicial: **rock em 0s (origem) → bear em 0.35s (origem) → dust em 0.75s (origem).**.

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
bm_fis_ursao_Shell
bm_fis_ursao_Pulse
bm_fis_ursao_State
bm_fis_ursao_Exit
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

**Ursão Ancião** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **transform/self**, tema **Beast Master** e dissipação limpa.
