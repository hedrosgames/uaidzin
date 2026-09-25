# VFX Kit — padrão FireBurstUAID

Fonte de qualidade: `FireBurstUAID` (lab `/vfx/fire-burst.html`), aprovado tecnicamente em 24/09/2026 e aguardando validação do Felipe. Este doc é o material de produção para replicar essa qualidade nas outras skills, começando pelo TK.

Não descreve regra de jogo (dano/mana/CD ficam no grill). Só pipeline, parâmetros e gate de qualidade.

## Kit de código (extraído do FireBurstUAID, 24/09/2026)

Peças genéricas prontas para reuso em `game/src/presentation/effects/vfxKit/`:

| Arquivo | Fornece |
|---|---|
| `curveTrajectory.ts` | `createHelixCurve(origin, target, phase, options?)` — helicoidal com envelope e jitter; defaults iguais ao FireBurstUAID |
| `linkProjectile.ts` | `LinkProjectile` (elos instanciados + ponta + giro + emissão de partículas na curva via `CurveEmissionPlacement`) |
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

## Regras de ouro extraídas do FireBurstUAID

- Determinismo onde importa (QA `?qa=1` pausado) e aleatoriedade só nos caminhos visuais.
- Recursos compartilhados uma vez por controller; por cast só clonar material de efeito efêmero.
- Nome do lab como marca: `<Skill>UAID` no título/HUD para separar dos protótipos antigos.
