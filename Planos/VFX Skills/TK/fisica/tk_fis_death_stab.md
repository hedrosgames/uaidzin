# Death Stab — brief VFX profissional

Crie um VFX profissional para **Death Stab** (`tk_fis_death_stab`), da classe **Thegn Knight**, árvore **Físico ofensivo**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Estocada estriada**. O aço afila num ponto branco; três sulcos paralelos perfuram a linha de alvos e se desfazem em limalha.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `tk_fis_death_stab` |
| Classe | Thegn Knight |
| Árvore | Físico ofensivo |
| Tier | 4/8 |
| Tipo | `damage` |
| Forma | `line` |
| Poder | `weapon` |
| Elemento | físico |
| Alcance | 5.5 m |
| Cooldown | 4.6s |
| MP | 10 |

Leitura mecânica obrigatória: **dano 1.55×; alcance 5.5 m; até 3 alvos; perfuração 25%**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/tk.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Death Stab**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- branco de pressão;
- aço claro;
- ouro envelhecido;
- cinza translúcido.

Forma-chave: **O aço afila num ponto branco; três sulcos paralelos perfuram a linha de alvos e se desfazem em limalha.**

Técnica autoral: Three.js · geometria animada · shader GLSL · partículas instanciadas..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — RELEASE DA ARMA

O aço afila num ponto branco; três sulcos paralelos perfuram a linha de alvos e se desfazem em limalha.

## LAYER — EIXO PRINCIPAL

Criar 3–6 ondas/sulcos orientados por `attackPoint → targetPosition`, com pequenas variações de escala, rotação, offset e start time.

## LAYER — SPEED STREAKS

6–12 streaks finos e muito rápidos; parte desaparece antes do alvo.

## LAYER — PRESSÃO LATERAL

3–7 wisps/arcos laterais dão volume quando a linha aponta para a câmera.

## LAYER — IMPACTO PERFURANTE

Impacto estreito e direcional; fragmentos e slash shapes continuam apontando para frente.

## LAYER — OVERSHOOT

Partículas secundárias ultrapassam o contato por curta distância, reforçando perfuração/múltiplos alvos.

## MOVIMENTO E ORIENTAÇÃO 3D

Calcular `direction = normalize(targetPosition - attackPoint)` e orientar núcleo, trail, streaks e impacto por esse vetor. O movimento existe no espaço 3D.

A geometria principal deve continuar legível em terceira pessoa, isométrica e top-down inclinada. Billboards entram apenas como partículas, flash e wisps auxiliares.

## TIMING

Release **20–70 ms**, waves/streaks **80–220 ms**, impacto **50–120 ms**, overshoot/resíduo **100–250 ms**.

Sequência autoral inicial: **mark em 0s (origem) → lance em 0.18s (percurso) → slash em 0.5s (alvo) → shards em 0.52s (alvo).**.

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
tk_fis_death_stab_Release
tk_fis_death_stab_Main
tk_fis_death_stab_Secondary
tk_fis_death_stab_Impact
tk_fis_death_stab_Residual
```

Recursos compartilhados são criados uma vez por controller. Sistemas emitem apenas na fase correta, com `restart()/play()`, `endEmit()` e limpeza em `dispose()`.

## TEXTURAS E SPRITE SHEETS

Sprite sheet é secundária: **8–16 frames** para wisps/impacto; a identidade principal continua em geometria 3D.

A sequência visual é **formação → pico → deformação → quebra/dissipação**. Additive fica restrito a núcleo, flash e highlights; o corpo principal preserva valor e forma.

## REGRAS ESPECÍFICAS

- Perfuração continua além do contato com streaks/fragmentos secundários.

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

**Death Stab** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **damage/line**, tema **físico** e dissipação limpa.
