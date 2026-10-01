# Circulo da Morte — brief VFX profissional

Crie um VFX profissional para **Circulo da Morte** (`tk_mag_circulo_morte`), da classe **Thegn Knight**, árvore **Mágico**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Tribunal de lâminas**. Um círculo consagrado ergue oito lâminas ao redor da área; elas convergem e apagam num único anel quente.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `tk_mag_circulo_morte` |
| Classe | Thegn Knight |
| Árvore | Mágico |
| Tier | 8/8 |
| Tipo | `damage` |
| Forma | `aoe` |
| Poder | `magic` |
| Elemento | sagrado |
| Alcance | 4.2 m |
| Cooldown | 12s |
| MP | 18 |

Leitura mecânica obrigatória: **dano 2.7×; alcance 4.2 m; raio 4.2 m**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/tk.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Circulo da Morte**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- marfim luminoso;
- ouro pálido;
- branco quente;
- âmbar contido.

Forma-chave: **Um círculo consagrado ergue oito lâminas ao redor da área; elas convergem e apagam num único anel quente.**

Técnica autoral: Three.js · geometria animada..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — ORIGEM / TELEGRAPH

Um círculo consagrado ergue oito lâminas ao redor da área; elas convergem e apagam num único anel quente.

## LAYER — CORPO DA ÁREA

Construir o raio com geometria 3D, instâncias e partículas radiais. A borda usa anéis incompletos, rachaduras, lâminas, cristais, folhas ou arcos, sem decal circular dominante.

## LAYER — EVENTO PRINCIPAL

Ruptura, tempestade, pulso, convergência ou erupção carrega 60–70% da identidade. Centro/eixo tem maior valor e contraste.

## LAYER — BORDA E VOLUME

Elementos em alturas, escalas e rotações diferentes mantêm leitura em perspectiva.

## LAYER — RESÍDUO

Matéria temática por 150–450 ms; resíduo não altera duração mecânica.

## MOVIMENTO E ORIENTAÇÃO 3D

A área nasce no centro mecânico correto e respeita o chão. Distribuir elementos em Y para evitar aparência de decal plano.

A geometria principal deve continuar legível em terceira pessoa, isométrica e top-down inclinada. Billboards entram apenas como partículas, flash e wisps auxiliares.

## TIMING

Telegraph curto **60–180 ms**, evento principal **120–380 ms**, pico **60–160 ms**, resíduo **180–500 ms**.

Sequência autoral inicial: **sigil em 0s (alvo) → lance em 0.25s (alvo) → vortex em 0.6s (alvo) → wave em 0.8s (alvo).**.

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
tk_mag_circulo_morte_Release
tk_mag_circulo_morte_Main
tk_mag_circulo_morte_Secondary
tk_mag_circulo_morte_Impact
tk_mag_circulo_morte_Residual
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

**Circulo da Morte** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **damage/aoe**, tema **sagrado** e dissipação limpa.
