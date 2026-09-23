# 21 — Plano de execução dos VFX

Plano de produção visual do combate e dos efeitos de mundo do UAIDZIN. Fonte da prosa de estilo: `18-arte-direcao-visual.md` e `visual/DECISOES-ESTILO.md`. Código alvo: `game/src/presentation/`.

## 1. Situação atual

| Peça | Arquivo | Estado |
|---|---|---|
| Outline do player | `SceneRenderer.ts` | Pronto (inverted hull + ghost de oclusão) |
| Portal | `PortalVfx.ts` | Padrão de qualidade do projeto |
| Aura de armadura | `ArmorAura.ts` | Pronta, via `onBeforeCompile` |
| Combate | `EffectManager.ts` | Placeholder (linha, ring, emissive, pulse, números DOM) |
| Balance VFX | `data/balance/vfx.ts` | Só tempos/fonte — sem taxonomia visual |
| Post-process | — | Inexistente (decisão consciente em `player-outline`) |

O gap não é motor. É **conteúdo visual** e **assinatura por skill**, no molde que o portal já prova.

## 2. Objetivos

1. VFX de ataque com leitura imediata: forma + cor dizem árvore/efeito antes do número de dano.
2. Cor coerente com a paleta C Salão/Brasa e com a árvore da skill.
3. Nunca cobrir o personagem inteiro (GDD `18`).
4. Limite rígido de VFX simultâneos (GDD `24`): pool + teto por segundo.
5. Sem emoji na UI; textura sempre PNG/SVG quando houver arte.
6. Felipe valida o visual — task de VFX não fecha só porque “parece pronto”.

## 3. Referências fechadas

### 3.1 WYD Global (referência primária)

Pasta: `C:\Users\Felipe\AppData\Local\wyd_launcher\WYD Global\`

- `Effect/` (~543 `.wys`) e `shader/` (`.bin` DirectX proprietários) **não entram no pipeline** por default.
- O valor é o **catálogo de gramática visual** (mesmas classes TK/FM/BM/HT):
  - Fogo/impacto: `Fire*`, `FireBall*`, `gfire*`, `bomb*`, `TBomb*`
  - Gelo/controle: `ice*`, `icefreeze*`, `icespear`
  - Trovão/magia: `thunder*`, `blue*`, `energy*`
  - Hit: `blood`, `gblood`
  - Suporte: `ankh*`, `shield`
  - Faísca: `spark*`, `sparkle*`
  - Arco/HT: `arrow`, `ArrowShade`
  - Level-up: `levelup*`, `glevelup`
  - Ambient: `CampFire*`, `fog*`, `dust`, `aurora`
- **Opção B (reverse-engineering):** o Felipe tem direitos sobre o WYD. Decodificar `.wys`/`.bin` só se a referência visual (prints, execução do cliente, catalogação por nome) não bastar para fechar uma skill. Não é o primeiro passo.

### 3.2 Assets Kenney (placeholder CC0)

Fora do repositório: `C:\GameProjects\kenney-vfx-placeholder\`

| Pack | Pasta útil | Papel |
|---|---|---|
| Particle Pack | `particle-pack/PNG (Transparent)/` | slash, spark, magic, flame, smoke, light |
| Smoke Particles | `smoke-particles/PNG/` | explosão, morte, poeira |
| Light Masks | `light-masks/Transparent/` | glow de forja, aura, cookie |
| Splat Pack | `splat-pack/PNG/Double (512px)/` | impacto / mancha estilizada |

Quando um efeito sair de placeholder, copiar **só os PNGs usados** para `game/public/vfx/` (ou equivalente decidido na task). Não versionar o pack inteiro.

### 3.3 Molde interno

`PortalVfx.ts`: camadas de `ShaderMaterial` + `Points` + `AdditiveBlending` + cor por `uColor` + dispose limpo. Combate deve herdar essa receita, não inventar outro motor.

## 4. Princípios de implementação (ordem preguiçosa)

1. Reusar `EffectManager` e o molde do portal.
2. Estender `VFX_BALANCE` com taxonomia (cor, forma, sprite, duração).
3. Three.js nativo: `ShaderMaterial`, `Points`, rings, lines stretch.
4. Sprites Kenney só quando o shader sozinho não legibilizar.
5. Biblioteca de partículas (`three.quarks` / `three-nebula`) **só** se a tabela de skills explodir e o pool caseiro não bastar.
6. Bloom / `postprocessing` **só** após o Felipe pedir glow. Outline continua sem composer.
7. Reverse-engineering do WYD é plano B de referência, não pipeline de assets.

## 5. Taxonomia VFX (contrato de dados)

Ampliar `game/src/data/balance/vfx.ts` (ou arquivo irmão `vfx-taxonomy.ts`) com uma entrada por **árvore × classe**, não 12 classes de efeito.

### 5.1 Forma base por árvore (hoje já no código)

| Árvore | Kind atual | Leitura |
|---|---|---|
| `magia` | `bolt` | Projétil / linha entre caster e alvo |
| `controle` | `zone` | Área no chão sob o alvo |
| `fisica` | `burst` | Impacto no alvo + pulse |

### 5.2 Cor por árvore (ajustar para paleta C)

Valores atuais em `CityGameSession.ts` — calibrar, não jogar fora:

| Árvore | Hex atual | Direção |
|---|---|---|
| magia | `0xb07cff` | Manter roxo/violeta legível em fundo escuro |
| controle | `0x6b7cff` | Manter azul frio (contenção) |
| física | `0xc45c26` | Puxar para brasa/ouro (`#d4a017` / laranja de forja) |

Cores de números de dano já em `VFX_BALANCE.colors` — alinhar com a mesma família.

### 5.3 Assinatura por classe (temperamento, não arte final)

| Classe | Temperamento visual | Referência WYD |
|---|---|---|
| TK Thegn Knight | Peso, ouro/ferro, ring largo, impacto seco | `bomb*`, `TBomb*`, `shield`, `ankh*` |
| FM Frost Maiden | Frio, linhas finas, freeze flash, rastro | `ice*`, `thunder*`, `blue*` |
| BM Beast Master | Orgânico, garras, sangue contido, matilha | `blood`, `gblood`, `spark*`, multi-frames |
| HT Huntress | Velocidade, rastro de flecha, precisão | `arrow`, `ArrowShade`, `spark*` |

Cada skill slot herda: **forma da árvore + cor da árvore + matiz da classe**.

### 5.4 Camadas de um efeito de skill

1. **Telegrafia** (pré-hit opcional): ring/zone chão, 0.1–0.2s.
2. **Projeção** (bolt/física): line ou ribbon caster→alvo.
3. **Impacto**: sprite/shader no alvo + `playHitFlash`.
4. **Resíduo curto**: sparks/smoke 0.2–0.4s.
5. **Feedback de jogo**: número de dano, pulse, KO, shake se kill.

GDD: o personagem não some dentro do VFX. Camada 3 e 4 ficam no alvo/ao redor, não no player.

## 6. Fases de execução

### F0 — Fundação de dados (sem visual novo)

- [ ] Formalizar taxonomia em `vfx.ts` / `vfx-taxonomy.ts`.
- [ ] Mapa skill tree → `{ kind, colorHex, classTint, layers }`.
- [ ] Teto de VFX simultâneos + contador no `EffectManager` (GDD 24).
- [ ] Aceite: typecheck passa; `playSkillVfx` lê a tabela em vez de hex solto na sessão.

### F1 — Combate base (placeholder → legível)

Arquivos: `EffectManager.ts`, `CityGameSession.ts` (só o hookup).

- [ ] **Hit físico (burst):** flash emissive + short sparks (Points) + pulse atual.
- [ ] **Bolt (magia):** ribbon/quadrilátero esticado com `ShaderMaterial` simples + head sprite; substituir `LineBasicMaterial`.
- [ ] **Zone (controle):** ring + fill radial animado no chão (shader curto tipo portal, mais simples).
- [ ] **Slash básico:** quad ou sprite Kenney `slash_0x` tintado ouro, no lugar da linha.
- [ ] **Morte:** scale-out atual + puff de smoke curto (opcional F1.1).
- [ ] Aceite: Felipe roda `npm run dev` e distingue árvore magia/controle/física em 1s de farm.

### F2 — Matiz por classe

- [ ] TK: ring de impacto mais largo; cor puxa brasa/ouro.
- [ ] FM: bolt mais fino + flash azul-gelo no impacto.
- [ ] BM: 3–5 particles irregulares no impacto (garras/spark sujo).
- [ ] HT: rastro mais longo no bolt/arrow; impacto pequeno e preciso.
- [ ] Aceite: 4 classes, mesma árvore → assinaturas diferentes sem quebrar legibilidade.

### F3 — Mundo e ambiente

- [ ] Portal: manter; apenas alinhar `uColor` de dungeons com paleta por bioma (quando houver guia de cores).
- [ ] Forja da cidade: glow sutil com Light Masks + sparks ocasionais (opcional, baixa prioridade).
- [ ] Level-up: pulse atual + halo curto (não full-screen).
- [ ] Aceite: cidade continua legível; VFX ambient não compete com farm.

### F4 — Assets definitivos (só após F1–F2 aprovados)

- [ ] Felipe escolhe 6–12 PNGs Kenney (ou arte própria) para o set base.
- [ ] Copiar para `game/public/vfx/`; atlas se valer a pena.
- [ ] Tint via material (não PNG colorido à mão) para reaproveitar por skill.
- [ ] Remover referências mortas aos packs externos no código de runtime.
- [ ] Aceite: build não depende de `C:\GameProjects\kenney-vfx-placeholder`.

### F5 — Polish e performance

- [ ] Pool de meshes/Points (sem alocar geometry por cast no caminho quente).
- [ ] Dispose auditado (padrão `PortalVfx.dispose`).
- [ ] Slider/opção “reduzir VFX de skill” (GDD acessibilidade `25`) — valor 0.5 na contagem/alpha.
- [ ] Smoke Playwright: skill cast → skillFx count > 0; kill → death + número.
- [ ] `npm run typecheck` + smoke limpos.
- [ ] Aceite: farm 10× com múltiplos inimigos sem estouro de pool; Felipe valida visual.

### F6 — Opcional / sob demanda

| Item | Gatilho |
|---|---|
| `three.quarks` ou `three-nebula` | Dezenas de efeitos autônomos ou artista de VFX operando editor |
| Bloom / `pmndrs/postprocessing` | Felipe pedir glow de skill/mágica |
| Reverse-engineering `.wys` WYD | Referência por nome/print não fechar uma skill específica |
| VFX por skill individual (8ª exclusiva, livros) | Conteúdo de skills sair de stub |
| Flipbook/smoke animado por morte de boss | Conteúdo de dungeon pedir peso de boss |

## 7. Mapa de arquivos

| Arquivo | Papel no plano |
|---|---|
| `game/src/data/balance/vfx.ts` | Tempos + taxonomia (F0) |
| `game/src/presentation/effects/EffectManager.ts` | Implementação dos efeitos |
| `game/src/presentation/effects/PortalVfx.ts` | Molde de shader/particles (referência, pouco mexe) |
| `game/src/app/CityGameSession.ts` | Hookup skill → kind/color da tabela |
| `game/public/vfx/` (F4) | PNGs definitivos |
| `C:\GameProjects\kenney-vfx-placeholder\` | Placeholder CC0 fora do repo |
| WYD `Effect/` + `shader/` | Só referência (e RE sob demanda) |

## 8. Critérios de aceite do plano (fechamento)

O plano inteiro está fechado quando:

1. Toda skill castada em gameplay tem VFX distinto por árvore e matiz por classe.
2. Nenhum VFX cobre a silhueta do player de forma que impeça leitura do farm.
3. Teto de VFX simultâneos respeitado no 10× do bot.
4. Felipe aprovou o visual no `npm run dev` (não basta smoke verde).
5. Runtime não depende de pasta externa Kenney nem de binário WYD.
6. Zero comentário de humano no código novo; `typecheck` passa.

## 9. Fora de escopo deste plano

- Animações skeletais novas de ataque.
- Áudio de skill/hit (plano de áudio à parte, GDD `19`).
- Balance numérico de dano/CD.
- Ícones de skill na UI (já no `visual/TODO.md`).
- Troca do greybox de personagem por modelo final.

## 10. Ordem sugerida de task no painel

1. T: Taxonomia VFX em `vfx.ts` (F0)
2. T: Bolt + zone + burst legíveis (F1)
3. T: Validação visual Felipe — árvores (F1)
4. T: Matiz TK/FM/BM/HT (F2)
5. T: Validação visual Felipe — classes (F2)
6. T: Pool + limite + opção reduzir VFX (F5)
7. T: Assets definitivos públicos (F4) — só após aprovação
8. T: Ambient/level-up/polish (F3/F5 restante)

Cada task: `start` antes, `done` só com teste + (quando visual) validação do Felipe. Falhou o visual → `block`, nunca `done`.
