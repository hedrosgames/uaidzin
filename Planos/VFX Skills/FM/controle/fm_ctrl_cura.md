# Cura — brief VFX profissional

Crie um VFX profissional para **Cura** (`fm_ctrl_cura`), da classe **Frost Maiden**, árvore **White Mage**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Pétalas de luz**. Três pétalas luminosas nascem na base e sobem até o peito, curando com um movimento macio e sem impacto.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `fm_ctrl_cura` |
| Classe | Frost Maiden |
| Árvore | White Mage |
| Tier | 1/8 |
| Tipo | `heal` |
| Forma | `self` |
| Poder | `weapon` |
| Elemento | sem elemento |
| Alcance | 2.8 m |
| Cooldown | 2.4s |
| MP | 6 |

Leitura mecânica obrigatória: **cura 22%**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/fm.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Cura**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- azul-gelo;
- branco frio;
- azul profundo;
- ouro pálido.

Forma-chave: **Três pétalas luminosas nascem na base e sobem até o peito, curando com um movimento macio e sem impacto.**

Técnica autoral: Three.js · geometria animada · partículas instanciadas · CanvasTexture..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — CONVERGÊNCIA

Três pétalas luminosas nascem na base e sobem até o peito, curando com um movimento macio e sem impacto.

## LAYER — PICO DE CURA

Fitas, pétalas ou motes convergem ao torso. O pico coincide com a cura e permanece macio.

## LAYER — COROA / ANEL

Forma curta nos pés, peito ou ombros fecha a leitura de restauração.

## LAYER — CLEANSE

Sem cleanse, deixar apenas motes ascendentes e halo curto.

## LAYER — DISSIPAÇÃO

Encerrar em 0,45–0,75 s sem bloom excessivo.

## MOVIMENTO E ORIENTAÇÃO 3D

Ancorar a ativação ao personagem. Estado persistente segue sockets/`Group` local e não depende da câmera.

A geometria principal deve continuar legível em terceira pessoa, isométrica e top-down inclinada. Billboards entram apenas como partículas, flash e wisps auxiliares.

## TIMING

Convergência **100–220 ms**, pico **80–160 ms**, dissipação **250–550 ms**.

Sequência autoral inicial: **heal em 0s (origem) → feather em 0.2s (origem).**.

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
fm_ctrl_cura_Gather
fm_ctrl_cura_Heal
fm_ctrl_cura_Motes
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

**Cura** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **heal/self**, tema **Frost Maiden** e dissipação limpa.
