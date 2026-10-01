# Vontade Divina — brief VFX profissional

Crie um VFX profissional para **Vontade Divina** (`fm_ctrl_vontade_divina`), da classe **Frost Maiden**, árvore **White Mage**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Constelação da vontade**. Pontos sagrados se conectam sobre a cabeça e descem num halo estreito, reforçando a magia sem sugerir dano.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `fm_ctrl_vontade_divina` |
| Classe | Frost Maiden |
| Árvore | White Mage |
| Tier | 6/8 |
| Tipo | `buff` |
| Forma | `self` |
| Poder | `weapon` |
| Elemento | sem elemento |
| Alcance | 2.8 m |
| Cooldown | 6s |
| MP | 12 |

Leitura mecânica obrigatória: **buff magicPower 24% por 12s; buff adicional healPower 25% por 12s**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/fm.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Vontade Divina**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- azul-gelo;
- branco frio;
- azul profundo;
- ouro pálido.

Forma-chave: **Pontos sagrados se conectam sobre a cabeça e descem num halo estreito, reforçando a magia sem sugerir dano.**

Técnica autoral: Three.js · geometria animada · partículas instanciadas · CanvasTexture..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — ATIVAÇÃO

Pontos sagrados se conectam sobre a cabeça e descem num halo estreito, reforçando a magia sem sugerir dano.

## LAYER — PULSO PRINCIPAL

Fazer o pulso nascer no chão, arma ou centro do corpo e atravessar a silhueta. Ataque expande, defesa fecha, mobilidade alonga, resistência cria cascas/facetas.

## LAYER — ESTADO ATIVO

Manter 1–2 motivos leves durante o buff: runa, placa, olho, pena, fenda, mote ou brilho localizado.

## LAYER — ACENTO SECUNDÁRIO

Representar o segundo atributo com forma/ritmo complementar, mantendo uma única composição.

## LAYER — EXPIRAÇÃO

Reduzir alpha e emissão em 120–250 ms, sem explosão que pareça dano.

## MOVIMENTO E ORIENTAÇÃO 3D

Ancorar a ativação ao personagem. Estado persistente segue sockets/`Group` local e não depende da câmera.

A geometria principal deve continuar legível em terceira pessoa, isométrica e top-down inclinada. Billboards entram apenas como partículas, flash e wisps auxiliares.

## TIMING

Ativação **80–180 ms**, pico **120–320 ms**, dissipação **250–700 ms**. O estado mecânico dura **12s**; o efeito persistente é muito mais leve que a ativação.

Sequência autoral inicial: **motes em 0s (origem) → crown em 0.25s (origem) → sigil em 0.55s (origem).**.

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
fm_ctrl_vontade_divina_Activation
fm_ctrl_vontade_divina_Body
fm_ctrl_vontade_divina_State
fm_ctrl_vontade_divina_Motes
```

Recursos compartilhados são criados uma vez por controller. Sistemas emitem apenas na fase correta, com `restart()/play()`, `endEmit()` e limpeza em `dispose()`.

## TEXTURAS E SPRITE SHEETS

Quando a matéria pedir animação, usar atlas **4×4** ou sprite sheet de **8–16 frames**, fundo transparente, alpha limpo e deformação desenhada à mão.

A sequência visual é **formação → pico → deformação → quebra/dissipação**. Additive fica restrito a núcleo, flash e highlights; o corpo principal preserva valor e forma.

## REGRAS ESPECÍFICAS

- Os dois buffs usam motivos complementares numa única composição.

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

**Vontade Divina** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **buff/self**, tema **Frost Maiden** e dissipação limpa.
