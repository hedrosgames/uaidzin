# Tempestade do Caçador — brief VFX profissional

Crie um VFX profissional para **Tempestade do Caçador** (`ht_mag_tempestade`), da classe **Huntress**, árvore **Arcane Archer**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Céu do caçador**. Flechas, gelo e trovão convergem na mesma área em três tempos; a última onda costura os elementos num círculo dourado.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `ht_mag_tempestade` |
| Classe | Huntress |
| Árvore | Arcane Archer |
| Tier | 8/8 |
| Tipo | `damage` |
| Forma | `aoe` |
| Poder | `magic` |
| Elemento | elemental misto |
| Alcance | 4.6 m |
| Cooldown | 12s |
| MP | 18 |

Leitura mecânica obrigatória: **dano 2.6×; alcance 4.6 m; raio 4.6 m**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/ht.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Tempestade do Caçador**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- ouro quente;
- azul-gelo;
- violeta elétrico;
- laranja brasa.

Forma-chave: **Flechas, gelo e trovão convergem na mesma área em três tempos; a última onda costura os elementos num círculo dourado.**

Técnica autoral: Three.js · geometria animada · partículas instanciadas · CanvasTexture..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — ORIGEM / TELEGRAPH

Flechas, gelo e trovão convergem na mesma área em três tempos; a última onda costura os elementos num círculo dourado.

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

Sequência autoral inicial: **moon em 0s (alvo) → lance em 0.25s (alvo) → bolt em 0.6s (alvo) → wave em 0.85s (alvo) → motes em 1s (alvo).**.

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
ht_mag_tempestade_Release
ht_mag_tempestade_Main
ht_mag_tempestade_Secondary
ht_mag_tempestade_Impact
ht_mag_tempestade_Residual
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

**Tempestade do Caçador** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **damage/aoe**, tema **elemental misto** e dissipação limpa.
