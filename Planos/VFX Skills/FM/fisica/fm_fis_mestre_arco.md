# Mestre do Arco — brief VFX profissional

Crie um VFX profissional para **Mestre do Arco** (`fm_fis_mestre_arco`), da classe **Frost Maiden**, árvore **Física**, em estilo cartoon/stylized de alto acabamento para o UAIDZIN, usando **Three.js + three.quarks**.

Direção autoral: **Corda astral**. Uma corda clara tensiona dois arcos pequenos junto à mão; uma flecha suspensa marca a afinidade passiva.

O VFX deve traduzir a mecânica real antes da decoração e não pode alterar balance ou timing de gameplay.

## CONTRATO DA SKILL

| Campo | Valor |
|---|---|
| ID | `fm_fis_mestre_arco` |
| Classe | Frost Maiden |
| Árvore | Física |
| Tier | 6/8 |
| Tipo | `passive` |
| Forma | `self` |
| Poder | `weapon` |
| Elemento | sem elemento |
| Alcance | 2.8 m |
| Cooldown | 0s |
| MP | 0 |

Leitura mecânica obrigatória: **passiva bow 28%; arma: bow**.

Fontes: `game/vfx/skills-manifest.json` e `game/src/data/classes/skills/fm.ts`.

## OBJETIVO VISUAL

Em poucos frames o jogador deve reconhecer **Mestre do Arco**, sua origem, direção, área ou estado. Aplicar a disciplina do FireBurstUAID: **silhueta 3D clara → matéria Quarks → hierarquia de fases → impacto/estado legível → cleanup completo**.

## IDENTIDADE VISUAL

Paleta:
- azul-gelo;
- branco frio;
- azul profundo;
- ouro pálido.

Forma-chave: **Uma corda clara tensiona dois arcos pequenos junto à mão; uma flecha suspensa marca a afinidade passiva.**

Técnica autoral: Three.js · geometria animada..

Evitar billboard do ataque inteiro, bloom que estoura a silhueta, fumaça realista pesada, partículas sem função, emissão contínua desnecessária, decal dominante e ruído que esconda personagem/alvo.

## LAYER — EVENTO DA PASSIVA

Não criar cast de tecla. O estudo aparece no evento **equip**. Uma corda clara tensiona dois arcos pequenos junto à mão; uma flecha suspensa marca a afinidade passiva.

## LAYER — MARCA DE ESPECIALIZAÇÃO

Uma forma curta junto à arma, corpo ou alvo pertinente, com mesh/instâncias 3D. Deve comunicar a vantagem sem virar aura pesada.

## LAYER — MICROPARTÍCULAS

4–10 motes, faíscas, folhas, gumes ou fragmentos. Lifetime curto e baixa emissão.

## LAYER — FECHAMENTO

Recolher em 100–250 ms. Indicador persistente, se necessário, deve ser discreto e barato.

## MOVIMENTO E ORIENTAÇÃO 3D

Ancorar a ativação ao personagem. Estado persistente segue sockets/`Group` local e não depende da câmera.

A geometria principal deve continuar legível em terceira pessoa, isométrica e top-down inclinada. Billboards entram apenas como partículas, flash e wisps auxiliares.

## TIMING

Evento visual: **150–350 ms**. Estado persistente, se existir, quase estático e de baixa emissão.

Sequência autoral inicial: **moon em 0.1s (origem) → arrow em 0.4s (origem).**.

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
fm_fis_mestre_arco_Event
fm_fis_mestre_arco_Mark
fm_fis_mestre_arco_Motes
```

Recursos compartilhados são criados uma vez por controller. Sistemas emitem apenas na fase correta, com `restart()/play()`, `endEmit()` e limpeza em `dispose()`.

## TEXTURAS E SPRITE SHEETS

Sprite sheet é secundária: **8–16 frames** para wisps/impacto; a identidade principal continua em geometria 3D.

A sequência visual é **formação → pico → deformação → quebra/dissipação**. Additive fica restrito a núcleo, flash e highlights; o corpo principal preserva valor e forma.

## REGRAS ESPECÍFICAS

- A passiva nasce da arma compatível (bow), não de aura genérica.
- Sem cast de tecla; evento recomendado: **equip**.

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

**Mestre do Arco** deve parecer uma habilidade autoral de MMORPG stylized moderno, com o mesmo padrão de acabamento do FireBurst e leitura inequívoca de **passive/self**, tema **Frost Maiden** e dissipação limpa.
