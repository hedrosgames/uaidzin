# VFX Kit — padrão FireBurstUAID

Fonte de qualidade: `FireBurstUAID` (lab `/vfx/fire-burst.html`), aprovado tecnicamente em 24/09/2026 e aguardando validação do Felipe. Este doc é o material de produção para replicar essa qualidade nas outras skills, começando pelo TK.

Não descreve regra de jogo (dano/mana/CD ficam no grill). Só pipeline, parâmetros e gate de qualidade.

## Kit de código (extraído do FireBurstUAID, 24/09/2026)

Peças genéricas prontas para reuso em `game/src/presentation/effects/vfxKit/`:

| Arquivo | Fornece |
|---|---|
| `curveTrajectory.ts` | `createHelixCurve(origin, target, phase, options?)` — helicoidal com envelope e jitter; `createArcCurve(origin, target, phase, options?)` — arco de projétil com aba, swing lateral e rosca opcional; `createJaggedCurve(origin, target, phase, options?)` — raio serrilhado com células alternadas de amplitude aleatória. Defaults iguais ao FireBurstUAID |
| `linkProjectile.ts` | `LinkProjectile` (elos instanciados + ponta + giro + emissão de partículas na curva via `CurveEmissionPlacement`) |
| `cometTail.ts` | `CometTail` — cauda de projétil: estilhaços `InstancedMesh` alinhados à tangente da curva com afinamento, mais rastro de partículas emissas na própria curva (`wake`) com janela `tail..head` |
| `quarkFx.ts` | `createAdditiveMaterial`, `createFireGradient`, `createShrink`, `createTurbulence`, `createFlameAnimation` |
| `canvasTexture.ts` | `createCanvasTexture` e `drawRadialGlow` para texturas procedurais |

QA: `game/scripts/vfx/qa-cdp.mjs` (`createCdpQa(binary, cdp)` → `command`/`evaluate`) reaproveitável em novos scripts de checagem.

Uma skill nova no padrão FireBurstUAID usa: curva do kit + `LinkProjectile` com geometrias/materiais da skill + sistemas Quarks próprios com os helpers + textura procedural do kit + QA com `qa-cdp.mjs`.

## Pipeline por skill (7 passos)

1. **Ficha no catálogo** — garantir entrada em `SkillVfxCatalog.ts` e o `family` certo no `EffectManager.dispatchSkillVfx`. Família nova = switch novo apontando para um controller próprio.
2. **Controller dedicado** — `game/src/presentation/effects/<arquivo>/SkillVfxController`, no formato de `FireBurstVfx.ts`: config explícita (`DEFAULT_*_CONFIG`), tempo fixo 1/60 com acumulador, `maxConcurrentCasts`, recursos compartilhados criados uma vez e descartados no `dispose()`.
3. **Malhas reais 3D** — nada de billboard do ataque inteiro (X9 reprovado). Elementos sólidos em `InstancedMesh`/`Mesh` posicionados por curva no espaço do mundo; funciona em qualquer direção e altura. Sem comentários no código.
4. **Partículas com three.quarks** — `ParticleSystem` por função (rastro, faísca, impacto, pluma), materiais compartilhados, `autoDestroy: false`, `restart()`/`endEmit()` no ciclo. Chama procedural em atlas 4×4 (`FrameOverLife` + `uTileCount/vTileCount` + `blendTiles`), nunca fumaça preta nem fundo opaco.
5. **Texturas procedurais** — classe própria por textura (ex.: `FireBurstFlameTexture.ts`), canvas determinístico, sRGB, LinearFilter, ClampToEdge, sem mipmap. Reutilizar as de `FireBurstTextures.ts` quando a paleta servir.
6. **Lab standalone** — HTML em `game/vfx/` + `demo.ts` com entrada no `vite.config.ts`: OrbitControls, grid, seletor de direção, pausa, velocidade, `?qa=1` pausado, API `window.__*__` com `cast/advance/setTarget/getState/clear/render/dispose`.
7. **QA via CDP** — script `game/scripts/check-<vfx>.mjs` no formato de `check-fire-chain.mjs`: direções múltiplas (incluindo acima/abaixo/zero), duração exata, limpeza (0 casts/partículas/sistemas), memória estável em ciclos, coordenada inválida recusada, limite de concorrência, integração `EffectManager`, shaders sem erro, typecheck + build.

## Parâmetros de referência do FireBurstUAID

| Parâmetro | Valor |
|---|---|
| Duração do disparo | 0,20 s exatos (5 correntes chegam juntas) |
| Correntes por cast | 5, curvas CatmullRom com fase e raio aleatórios |
| Elos | Torus 0.12/0.029, metal escuro (color `0x8b8884`, metalness 0.72, emissão fraca) |
| Ponta | Cone metálico por corrente, girando em voo |
| Explosão | Bursts Quarks (impacto 32 + pluma 18) + flash + anel de choque + PointLight |
| Limpeza | Corrente some ~55 ms após contato; tudo destruído em 0,85 s |
| Concorrência | 3 salvas; excedente descarta a mais antiga |

## Gate de qualidade (uma skill só entra com tudo isto)

- Tempo e trajetória corretos em 11 direções, incluindo alvo na origem e alturas diferentes.
- 174+ verificações CDP verdes; `getPhase`/`getState` expostos.
- Cleanup completo e memória do renderer estável após ≥12 ciclos.
- Sem billboard do ataque inteiro; sem spritesheet de cena; sem emoji; pt-BR correto.
- `npm run typecheck` e `npm run build` passando.

## Rampa de qualidade (5 passes, nota por passe)

Toda skill nova entra com nota 3 honesta e sobe 1,5 por passe. A nota é o critério, não a Perception.

| Passe | Nota | O que resolve | Como verificar |
|---|---|---|---|
| v1 | 3,0 | Pipeline completo e limpo: catálogo, controller, malha 3D, Quarks, textura, lab, QA verde. Art genérica, sem antecipação, impacto seco | QA + captura de voo/impacto |
| 1 | 4,5 | Identidade de estúdio: ferro/bronze/ouro reais, paleta travada, silhueta legível, bloom calibrado | Captura: a malha identifica a skill a 1 screenshot |
| 2 | 6,0 | A chama/a matéria lê: invólucro de partículas forte, rastro contínuo na curva, luz<PointLight> espelhando no chão | Captura: o efeito não pode parecer arame ou poeira |
| 3 | 7,5 | Hierarquia de valores: cabeça mais brilhante e maior que o rastro, easing de arremesso, pop de lançamento | Captura: o olho vai para a cabeça, não para a cauda |
| 4 | 9,0 | Impacto legível: flash aditivo com textura (nunca bola opaca), cascas que se abrem, detritos geométricos, queimadura, luz em dois estágios | Captura de impacto: nada some atrás de um branco |
| 5 | 10,5 | Gate: QA ≥170 checks, 11 direções, memória estável em ≥12 ciclos, integração `EffectManager`, zero comentário, typecheck + build | `npm run typecheck`, `npm run build`, script de QA |

Regras que os passes aprenderam na prática:

- Sistema Quarks só emite na fase dele: `pause()` + `emitter.visible = false` na fábrica, `restart()`/`play()` na troca de fase. Sem isso o impacto e o voo vazam para a carga.
- `CometTail` recebe a cauda por `wake`; o `startWake()` é explícito na fase de voo, nunca no construtor.
- Flash de impacto é `MeshBasicMaterial` **aditivo com textura radial**. Cor chapada sem blend vira bola branca opaca e mata o burst.
- A captura de QA lê o `renderer.info.memory` entre ciclos: se subir, há recurso por cast.
- **Arma precisa de haste.** Lâmina/bola sozinha lê como faísca; a haste escura dá a silhueta de arma e o contraste ferro-gelo.
- **Partícula grande demais vira adesivo.** Cristal/flor de neve com muita área lê como decal colado; keep a área baixa e a emissão alta.
- Timing de fase: para provar independência de framerate, o controller expõe `phaseStartedAt` (tempo simulado exato da virada). Medir `elapsed` depois do `update` erra, porque o resto do frame já cai na fase nova.
- A cauda nasce vazia no primeiro frame do voo (sem percurso). Teste o meio do voo, não o instante do disparo.
- **Captura de tela precisa bater com a fase.** Efeito rápido (raio de 0,16 s) captura o frame de impacto se a soma dos `advance` passar do meio; some o tempo por fase e some as fases.
- O Vite assiste `game/scripts/`, então **editar o próprio script de QA recarrega a página no meio da execução**. Todo script precisa de `ensurePage()` antes de cada bloco de avaliação.
- Geometria emissiva alta + bloom vira massa branca e come o metal. Em efeito elemental, deixe a **partícula** carregar o brilho e o metal só o contorno.

## Plano das 7 skills restantes do TK (mesma linha do FireBurstUAID)

Fonte: `docs/inventarios/skills.md` — árvore física do TK. Fire Burst (`tk_fis_fire_burst`) já validado; restam as outras 7. Visual no padrão FireBurstUAID: malha real + Quarks, kit reutilizável, QA CDP completo, sem alterar dano/mana/CD. Tempos e detalhes são **provisórios** até o Felipe ajustar jogando.

| Ordem | Skill | Arquétipo | Elementos do VFX | Peças do kit |
|---|---|---|---|---|
| 1 | `tk_fis_1` Golpe | Melee em arco | Arco de lâmina volumétrico (torus parcial) na frente do jogador, faíscas no contato, ≤0,15 s | Materiais metal + `quarkFx` (faíscas), burst Quarks |
| 2 | `tk_fis_3` Investida | Dash com trilha | Trilha de elos/vento no caminho percorrido, poeira no destino, deslocamento visual rápido | `curveTrajectory` reta + emissão na curva |
| 3 | `tk_fis_2` Corte | Corte duplo cruzado | Duas trilhas de lâmina cruzadas em sequência rápida (duas curvas curtas), brilho metálico | `linkProjectile` com geometria de lâmina, `canvasTexture` para metal |
| 4 | `tk_fis_4` Machado | Impacto descendente | Machado de energia cai no alvo, anel de choque no chão, estilhaços | Anel + burst Quarks + PointLight (padrão de impacto do FireBurstUAID) |
| 5 | `tk_fis_5` Quebra | Quebra de guarda | Estilhaços metálicos no alvo + faíscas densas, curto e seco | Burst Quarks com geometria fragmento, turbulência |
| 6 | `tk_fis_6` Fúria | Aura de buff | Anel pulsante vermelho no solo + partículas ascendentes, dura enquanto o buff | `quarkFx` com gradiente vermelho, anel contínuo |
| 7 | `tk_fis_7` Avalanche | Onda frontal em área | Onda volumétrica avança em cone, levanta detritos, impacto em múltiplos alvos | Curva frontal larga + bursts escalonados |

Regras do plano:

- Cada skill segue o pipeline de 7 passos deste doc e o gate de qualidade cheio (QA próprio, 11 direções onde fizer sentido, limpeza, memória estável, typecheck/build).
- Uma skill por vez: implementar, validar com o Felipe, só então abrir a próxima. A ordem acima é sugestão; o Felipe reordena se quiser.
- Texturas novas só quando a paleta do metal/brasa do FireBurstUAID não servir; reutilizar o que der.
- `tk_fis_8` Colosso (8ª exclusiva) e as 8 de magia do TK ficam fora desta leva; entram depois em tarefa própria.

## Plano da árvore de magia da FM (8 skills, mesma linha do FireBurstUAID)

Fonte: `docs/inventarios/skills.md` — `fm_mag`. Controller novo por skill em `game/src/presentation/effects/fmSkills/<slug>/`, lab em `game/vfx/fm-<slug>.html`, QA em `game/scripts/check-fm-<slug>.mjs`. Dano, mana e CD ficam intocados.

| Ordem | Skill | Arquétipo | Peças do kit |
|---|---|---|---|
| 1 | `fm_mag_esfera_ignea` Esfera Ígnea | Bola de fogo em projétil | `createArcCurve` + `CometTail` com wake; núcleo de lava `IcosahedronGeometry` e cascas `TorusGeometry` em arco; atlas de fogo do FireBurst |
| 2 | `fm_mag_lanca_glacial` Lança Glacial | Lança de gelo perfurante | `createArcCurve` reta + `CometTail`; lâmina `ConeGeometry`, engaste e **haste** `CylinderGeometry` de ferro, colar `TorusGeometry`, 3 cristais `TetrahedronGeometry` orbitando, atlas de gelo próprio `LancaGlacialFrostTexture` (flor de 6 pontas em 4×4) |
| 3 | `fm_mag_choque_vital` Choque Vital | Raio que salta | `createJaggedCurve` (deslocamento alternado por segmento, envelope senoidal) + trilhos `BoxGeometry` em `InstancedMesh` revelados por contagem, 3 nós rúnicos `OctahedronGeometry`, 2 aros `TorusGeometry`, `CometTail` de detritos; sem ciano — ouro pálido em ferro |
| 4 | `fm_mag_picada` Picada Peçonhenta | Dardo ácido | `createArcCurve` + `CometTail`; agulha `ConeGeometry`, bolhas `SphereEmitter` verdes, sem fumaça preta |
| 5 | `fm_mag_tempestade_brasa` Tempestade de Brasa | Chuva de brasas em área | Cone de queda, anel no solo, `GridEmitter` de brasa, luz pulsante |
| 6 | `fm_mag_sombra_corrosiva` Sombra Corrosiva | Lâmina de sombra perfurante | `createArcCurve` reta; lâminas `PlaneGeometry` em fita, fuligem quente (nunca preta), anel de corrosão |
| 7 | `fm_mag_nevasca` Nevasca | Domo de gelo em área | Coluna de cristais `ConeGeometry` escalonada, `HemisphereEmitter` de flocos, ground ring |
| 8 | `fm_mag_colapso` Colapso Elemental | Colapso em área, 4 elementos | Casca `IcosahedronGeometry` que expande, 4 sistemas de cor, anel duplo, PointLight em dois estágios |

## Regras de ouro extraídas do FireBurstUAID

- Determinismo onde importa (QA `?qa=1` pausado) e aleatoriedade só nos caminhos visuais.
- Recursos compartilhados uma vez por controller; por cast só clonar material de efeito efêmero.
- Nome do lab como marca: `<Skill>UAID` no título/HUD para separar dos protótipos antigos.
