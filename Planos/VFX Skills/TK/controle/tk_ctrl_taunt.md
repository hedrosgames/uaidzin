# Taunt — brief VFX profissional

Crie um VFX profissional para **Taunt** (`tk_ctrl_taunt`), da classe **Thegn Knight**, árvore **Defensivo**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Batida no escudo**. Um estampido curto de metal abre círculos grossos; marcas angulares se voltam para o cavaleiro.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `tk_ctrl_taunt` |
| Classe | Thegn Knight |
| Árvore | Defensivo |
| Tier | 3/8 |
| Tipo | `damage` |
| Forma | `aoe` |
| Poder | `weapon` |
| Elemento | físico |
| Alcance | 5 m |
| Cooldown | 4s |
| MP | 8 |

Leitura mecânica obrigatória: **dano 0.35×; alcance 5 m; raio 5 m; taunt 5s**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/tk.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Taunt**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- branco de pressão;
- aço claro;
- ouro envelhecido;
- cinza translúcido.

Forma-chave: **Um estampido curto de metal abre círculos grossos; marcas angulares se voltam para o cavaleiro.**

Técnica autoral: Three.js · geometria animada..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — ORIGEM / TELEGRAPH

Um estampido curto de metal abre círculos grossos; marcas angulares se voltam para o cavaleiro.

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

Sequência autoral inicial: **shield em 0s (origem) → wave em 0.22s (origem) → mark em 0.42s (alvo).**.

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
tk_ctrl_taunt_Release
tk_ctrl_taunt_Main
tk_ctrl_taunt_Secondary
tk_ctrl_taunt_Impact
tk_ctrl_taunt_Residual
```

Recursos compartilhados são criados uma vez por controller. Sistemas emitem apenas na fase correta, com `restart()/play()`, `endEmit()` e limpeza em `dispose()`.

## TEXTURAS E SPRITE SHEETS

Sprite sheet é secundária: **8–16 frames** para wisps/impacto; a identidade principal continua em geometria 3D.

A sequência visual é **formação → pico → deformação → quebra/dissipação**. Additive fica restrito a núcleo, flash e highlights; o corpo principal preserva valor e forma.

## REGRAS ESPECÍFICAS

- Taunt converge visualmente ameaças para o cavaleiro sem setas de UI.

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

**Taunt** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **damage/aoe**, tema **físico** e dissipação limpa.
