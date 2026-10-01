# Couro de Fera — brief VFX profissional

Crie um VFX profissional para **Couro de Fera** (`bm_fis_couro_fera`), da classe **Beast Master**, árvore **Nature**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Escamas de casca**. Placas de casca e couro sobem das pernas aos ombros, formando uma proteção orgânica sem pulso ofensivo.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `bm_fis_couro_fera` |
| Classe | Beast Master |
| Árvore | Nature |
| Tier | 2/8 |
| Tipo | `buff` |
| Forma | `self` |
| Poder | `weapon` |
| Elemento | sem elemento |
| Alcance | 2.8 m |
| Cooldown | 3.2s |
| MP | 8 |

Leitura mecânica obrigatória: **buff defense 22% por 14s; buff adicional maxHp 18% por 14s**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/bm.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Couro de Fera**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- verde musgo;
- ocre terroso;
- âmbar natural;
- marfim quente.

Forma-chave: **Placas de casca e couro sobem das pernas aos ombros, formando uma proteção orgânica sem pulso ofensivo.**

Técnica autoral: Three.js · geometria animada..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — ATIVAÇÃO

Placas de casca e couro sobem das pernas aos ombros, formando uma proteção orgânica sem pulso ofensivo.

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

Ativação **80–180 ms**, pico **120–320 ms**, dissipação **250–700 ms**. O estado mecânico dura **14s**; o efeito persistente é muito mais leve que a ativação.

Sequência autoral inicial: **rock em 0.1s (origem) → shield em 0.35s (origem).**.

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
bm_fis_couro_fera_Activation
bm_fis_couro_fera_Body
bm_fis_couro_fera_State
bm_fis_couro_fera_Motes
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

**Couro de Fera** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **buff/self**, tema **Beast Master** e dissipação limpa.
