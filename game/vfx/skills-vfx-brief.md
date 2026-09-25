# Atelier VFX — fichas autorais

X7 · 96 skills × 3 conceitos. Estudos de VFX no lab; nenhuma alteração de balance ou comportamento do jogo.
Fonte mecânica: manifest extraído diretamente de `CLASSES`. Fonte criativa: descrições autorais em `lab/proposals-v1.js`, `proposals-v2.js` e `proposals-v3.js`.
Ordem de produção: V1 completa, V2 completa, V3 completa. O master original fornece apenas a estrutura de navegação. As receitas antigas e texturas de packs não alimentam estas propostas.
Direção solicitada: cartoon estilizado de alto acabamento. Qualidade artística ainda depende da validação do Felipe; invocações usam silhuetas espectrais de estudo, não modelos finais de criaturas.
Tempos, tamanhos e quantidades nas receitas são parâmetros visuais provisórios do laboratório, não números de balance. Passivas exibem um estudo de estado, nunca um cast real.
Regenerar após editar as fontes: `node scripts/vfx/write-atelier-brief.mjs`.

## V1

### Thegn Knight

#### `tk_fis_force_wave` · Force Wave · Gume de pressão

- Origem: Físico ofensivo, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: O punho comprime o ar; uma meia-lua de bronze atravessa a distância e abre um impacto seco no peito.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: slash em 0.08s (origem) → arrow em 0.2s (percurso) → wave em 0.5s (alvo) → dust em 0.5s (alvo).

#### `tk_fis_atk_descuidado` · Atk Descuidado · Armadura aberta

- Origem: Físico ofensivo, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Fendas de brasa abrem a guarda; duas lâminas sobem pelo corpo e permanecem pulsando, poder exposto sem proteção.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: rift em 0s (origem) → slash em 0.22s (origem) → embers em 0.3s (origem).

#### `tk_fis_mestre_dual` · Mestre Dual · Aço gêmeo

- Origem: Físico ofensivo, posição 3/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Duas espadas espectrais cruzam atrás dos ombros e deixam pequenos gumes em órbita. Estudo visual de passiva, sem explosão.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: lance em 0.1s (origem) → mark em 0.4s (origem) → motes em 0.5s (origem).

#### `tk_fis_death_stab` · Death Stab · Estocada estriada

- Origem: Físico ofensivo, posição 4/8, tipo `damage`, forma `line`, elemento `physical`.
- Descrição/prompt visual: O aço afila num ponto branco; três sulcos paralelos perfuram a linha de alvos e se desfazem em limalha.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: mark em 0s (origem) → lance em 0.18s (percurso) → slash em 0.5s (alvo) → shards em 0.52s (alvo).

#### `tk_fis_fury` · Fury · Fole da forja

- Origem: Físico ofensivo, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: O chão inspira brasa; golpes de calor batem como um coração e acendem os braços do cavaleiro.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: sigil em 0s (origem) → wave em 0.2s (origem) → embers em 0.45s (origem).

#### `tk_fis_increase_critical` · Increase Critical · Fio perfeito

- Origem: Físico ofensivo, posição 6/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma aresta dourada se fecha sobre a arma, seguida por um pequeno brilho de precisão, sem área de dano.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: lance em 0.1s (origem) → mark em 0.35s (origem) → motes em 0.4s (origem).

#### `tk_fis_earthquake` · Earthquake · Falha tectônica

- Origem: Físico ofensivo, posição 7/8, tipo `damage`, forma `aoe`, elemento `earth`.
- Descrição/prompt visual: O peso cai no solo; placas rochosas se levantam em sequência até o alvo e uma coroa de poeira fecha a ruptura.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: rock em 0.05s (origem) → rift em 0.2s (percurso) → rock em 0.48s (alvo) → dust em 0.55s (alvo).

#### `tk_fis_fire_burst` · Fire Burst · Correntes da fornalha

- Origem: Físico ofensivo, posição 8/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: Três correntes incandescentes partem do cavaleiro em arcos, cravam no alvo e puxam uma labareda para fora do chão.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: sigil em 0s (origem) → chain em 0.2s (percurso) → vortex em 0.65s (alvo) → embers em 0.7s (alvo).

#### `tk_ctrl_shield` · Shield · Guarda de ferro

- Origem: Defensivo, posição 1/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um painel de ferro luminoso sobe da base dos pés e fecha a frente do torso; pequenas aparas caem da borda.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: shield em 0.12s (origem) → shards em 0.45s (origem).

#### `tk_ctrl_resistance` · Resistance · Raízes de aço

- Origem: Defensivo, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Linhas de bronze abraçam as pernas e sustentam uma cinta larga ao redor do peito, traduzindo vigor aumentado.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: rift em 0s (origem) → crown em 0.3s (origem) → heal em 0.5s (origem).

#### `tk_ctrl_taunt` · Taunt · Batida no escudo

- Origem: Defensivo, posição 3/8, tipo `damage`, forma `aoe`, elemento `physical`.
- Descrição/prompt visual: Um estampido curto de metal abre círculos grossos; marcas angulares se voltam para o cavaleiro.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: shield em 0s (origem) → wave em 0.22s (origem) → mark em 0.42s (alvo).

#### `tk_ctrl_imunity` · Imunity · Vidro consagrado

- Origem: Defensivo, posição 4/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Facetas claras fecham um casulo aberto, desviando fagulhas arcanas para os lados em vez de explodir.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: crystal em 0s (origem) → shield em 0.25s (origem) → motes em 0.5s (origem).

#### `tk_ctrl_parry` · Parry · Ricochete

- Origem: Defensivo, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma placa oblíqua captura um brilho e o rebate em leque; o arco residual sugere a janela de aparo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: shield em 0.1s (origem) → slash em 0.4s (origem) → shards em 0.42s (origem).

#### `tk_ctrl_sustain` · Sustain · Brasa vital

- Origem: Defensivo, posição 6/8, tipo `heal`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pequenas brasas douradas convergem para o peito, sobem em espiral e assentam numa faixa de luz baixa.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: motes em 0s (origem) → heal em 0.2s (origem) → crown em 0.55s (origem).

#### `tk_ctrl_fear` · Fear · Sombra do elmo

- Origem: Defensivo, posição 7/8, tipo `damage`, forma `aoe`, elemento `shadow`.
- Descrição/prompt visual: Uma presença escura cresce atrás do cavaleiro; garras de sombra alcançam o chão e a onda deixa o alvo marcado.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: echo em 0s (origem) → claw em 0.3s (origem) → wave em 0.45s (origem) → mark em 0.5s (alvo).

#### `tk_ctrl_divine_armor` · Divine Armor · Couraça solar

- Origem: Defensivo, posição 8/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pequenas placas douradas montam a silhueta da armadura. O selo permanece discreto, adequado à redução passiva de dano.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: shield em 0.1s (origem) → crown em 0.35s (origem) → motes em 0.6s (origem).

#### `tk_mag_lamina_energia` · Lâmina de Energia · Fio de alvorada

- Origem: Mágico, posição 1/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: A lâmina se torna uma fita de luz e se solta da arma; o gume corta o alvo num único risco claro.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: slash em 0.05s (origem) → lance em 0.2s (percurso) → slash em 0.55s (alvo).

#### `tk_mag_campo_gelo` · Campo de Gelo · Geada radial

- Origem: Mágico, posição 2/8, tipo `damage`, forma `aoe`, elemento `ice`.
- Descrição/prompt visual: Um selo frio se espalha no solo; pequenas agulhas brotam na borda e vapor baixo desenha a área de lentidão.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: sigil em 0s (alvo) → crystal em 0.3s (alvo) → dust em 0.5s (alvo).

#### `tk_mag_mana_burn` · Mana Burn · Mana em combustão

- Origem: Mágico, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Faíscas azuis afundam no centro de um anel de brasa; o torso recebe uma chama arcana contida.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: motes em 0s (origem) → drain em 0.18s (origem) → orb em 0.4s (origem).

#### `tk_mag_moon_ray` · Moon Ray · Fenda lunar

- Origem: Mágico, posição 4/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Uma lua fina abre acima do alvo e derrama um raio vertical branco-dourado, sem ramificações elétricas.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: moon em 0s (alvo) → beam em 0.24s (alvo) → wave em 0.5s (alvo).

#### `tk_mag_poison_stab` · Poison Stab · Agulha verde

- Origem: Mágico, posição 5/8, tipo `damage`, forma `single`, elemento `poison`.
- Descrição/prompt visual: O veneno se condensa na ponta da estocada; gotas presas ao alvo escorrem para um halo ácido estreito.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: lance em 0.12s (percurso) → orb em 0.45s (alvo) → motes em 0.6s (alvo).

#### `tk_mag_fire_slash` · Fire Slash · Varredura de brasa

- Origem: Mágico, posição 6/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: Um corte largo arrasta fogo pelo chão. O rastro se divide em línguas curvas antes de apagar em carvão.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: slash em 0.16s (origem) → rift em 0.4s (alvo) → embers em 0.45s (alvo).

#### `tk_mag_death_stab` · Death Stab · Lança do veredito

- Origem: Mágico, posição 7/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Um gume sagrado atravessa uma única marca; a luz se fecha de dentro para fora num corte vertical.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: mark em 0s (alvo) → lance em 0.22s (percurso) → beam em 0.58s (alvo).

#### `tk_mag_circulo_morte` · Circulo da Morte · Tribunal de lâminas

- Origem: Mágico, posição 8/8, tipo `damage`, forma `aoe`, elemento `holy`.
- Descrição/prompt visual: Um círculo consagrado ergue oito lâminas ao redor da área; elas convergem e apagam num único anel quente.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: sigil em 0s (alvo) → lance em 0.25s (alvo) → vortex em 0.6s (alvo) → wave em 0.8s (alvo).

### Frost Maiden

#### `fm_fis_impacto_longinquo` · Impacto Longínquo · Martelo de ar

- Origem: Física, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: A palma solta um bloco de pressão translúcido que percorre a distância e se abre num leque compacto.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0s (origem) → arrow em 0.18s (percurso) → slash em 0.48s (alvo).

#### `fm_fis_olho_falcao` · Olho de Falcão · Íris elevada

- Origem: Física, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Duas penas finas sobem até um olho de luz acima da cabeça; os traços laterais deixam clara a percepção evasiva.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: feather em 0.05s (origem) → mark em 0.3s (origem).

#### `fm_fis_furia_combate` · Fúria de Combate · Punhos de rubi

- Origem: Física, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Arcos vermelhos apertam os antebraços; uma pulsação curta reforça a postura física da maga.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: claw em 0.1s (origem) → crown em 0.35s (origem) → embers em 0.5s (origem).

#### `fm_fis_guarda_solida` · Guarda Sólida · Aegis facetada

- Origem: Física, posição 4/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Quatro placas frias se encaixam como pétalas rígidas, protegendo o corpo sem esconder sua silhueta.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crystal em 0.1s (origem) → shield em 0.35s (origem).

#### `fm_fis_conversao_vital` · Conversão Vital · Alquimia do pulso

- Origem: Física, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Gotas de mana giram pelo corpo e mudam de azul para ouro ao subir; a energia convertida retorna ao peito.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: orb em 0s (origem) → drain em 0.25s (origem) → heal em 0.55s (origem).

#### `fm_fis_mestre_arco` · Mestre do Arco · Corda astral

- Origem: Física, posição 6/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma corda clara tensiona dois arcos pequenos junto à mão; uma flecha suspensa marca a afinidade passiva.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: moon em 0.1s (origem) → arrow em 0.4s (origem).

#### `fm_fis_ponto_critico` · Ponto Crítico · Lente de precisão

- Origem: Física, posição 7/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Três retículas se alinham num ponto luminoso; o anel mais externo se recolhe, concentrando o próximo golpe.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: mark em 0s (origem) → vortex em 0.35s (origem) → lance em 0.65s (origem).

#### `fm_fis_negacao_vida` · Negação de Vida · Flor sem vida

- Origem: Física, posição 8/8, tipo `damage`, forma `aoe`, elemento `shadow`.
- Descrição/prompt visual: Pétalas negras abrem no chão; fios escuros sobem e se fecham num eclipse que deixa uma área silenciosa.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: rift em 0s (alvo) → vortex em 0.3s (alvo) → moon em 0.6s (alvo) → shards em 0.9s (alvo).

#### `fm_ctrl_cura` · Cura · Pétalas de luz

- Origem: White Mage, posição 1/8, tipo `heal`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Três pétalas luminosas nascem na base e sobem até o peito, curando com um movimento macio e sem impacto.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: heal em 0s (origem) → feather em 0.2s (origem).

#### `fm_ctrl_julgamento` · Julgamento Sagrado · Selo sentenciador

- Origem: White Mage, posição 2/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Um losango sagrado fecha o alvo e recebe um golpe vertical de luz curta, preciso como um carimbo.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: mark em 0s (alvo) → beam em 0.3s (alvo) → shards em 0.5s (alvo).

#### `fm_ctrl_bencao` · Bênção · Coroa benigna

- Origem: White Mage, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma coroa baixa se forma sobre os ombros; pequenas asas de luz descem para sustentar a guarda.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: crown em 0.1s (origem) → feather em 0.35s (origem) → motes em 0.6s (origem).

#### `fm_ctrl_purificacao` · Purificação · Lavagem branca

- Origem: White Mage, posição 4/8, tipo `heal`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um véu luminoso sobe dos pés e leva fragmentos escuros para longe. A cura termina em partículas claras.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: wave em 0.1s (origem) → shards em 0.2s (origem) → heal em 0.45s (origem).

#### `fm_ctrl_lanca_luz` · Lança de Luz · Haste celeste

- Origem: White Mage, posição 5/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Uma lança longa ganha a ponta antes do corpo; atravessa o ar e abre penas de luz no contato.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: lance em 0.18s (percurso) → feather em 0.55s (alvo) → wave em 0.6s (alvo).

#### `fm_ctrl_vontade_divina` · Vontade Divina · Constelação da vontade

- Origem: White Mage, posição 6/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pontos sagrados se conectam sobre a cabeça e descem num halo estreito, reforçando a magia sem sugerir dano.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: motes em 0s (origem) → crown em 0.25s (origem) → sigil em 0.55s (origem).

#### `fm_ctrl_castigo` · Castigo Celestial · Martelo do céu

- Origem: White Mage, posição 7/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: O selo se fecha acima do alvo; um pilar dourado desce em duas batidas, cada uma com uma coroa de fragmentos.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: sigil em 0s (alvo) → beam em 0.3s (alvo) → shards em 0.65s (alvo).

#### `fm_ctrl_graca_ceu` · Graça do Céu · Catedral aberta

- Origem: White Mage, posição 8/8, tipo `damage`, forma `aoe`, elemento `holy`.
- Descrição/prompt visual: Arcos dourados contornam a área; feixes descem entre eles, seguidos por uma onda branca e plumas de graça.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: cage em 0.1s (alvo) → beam em 0.4s (alvo) → wave em 0.7s (alvo) → feather em 0.8s (alvo).

#### `fm_mag_esfera_ignea` · Esfera Ígnea · Carvão vivo

- Origem: Maga negra, posição 1/8, tipo `damage`, forma `single`, elemento `fire`.
- Descrição/prompt visual: Uma esfera assimétrica de fogo enrola a própria cauda e estoura num nódulo quente ao tocar o alvo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: orb em 0s (origem) → orb em 0.22s (percurso) → embers em 0.6s (alvo).

#### `fm_mag_lanca_glacial` · Lança Glacial · Cristal balístico

- Origem: Maga negra, posição 2/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: Uma agulha azul se alonga e parte em linha reta. O alvo recebe uma estrela curta de lascas de gelo.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: lance em 0.15s (percurso) → crystal em 0.5s (alvo) → shards em 0.55s (alvo).

#### `fm_mag_choque_vital` · Choque Vital · Sinapse violeta

- Origem: Maga negra, posição 3/8, tipo `damage`, forma `single`, elemento `lightning`.
- Descrição/prompt visual: Um arco nervoso salta até o alvo e bifurca na altura do peito; pequenos nós elétricos apagam em sequência.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: bolt em 0.15s (percurso) → orb em 0.4s (alvo) → shards em 0.5s (alvo).

#### `fm_mag_picada` · Picada Peçonhenta · Ferrão suspenso

- Origem: Maga negra, posição 4/8, tipo `damage`, forma `single`, elemento `poison`.
- Descrição/prompt visual: Um ferrão verde nasce de gotas viscosas e finca no alvo; bolhas pequenas marcam a persistência do veneno.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: orb em 0s (origem) → lance em 0.25s (percurso) → motes em 0.55s (alvo).

#### `fm_mag_tempestade_brasa` · Tempestade de Brasa · Chuva de carvão

- Origem: Maga negra, posição 5/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: Brasas sobem antes de retornar em arcos grossos; pequenos núcleos explodem alternados dentro da área.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: embers em 0s (alvo) → orb em 0.35s (alvo) → rift em 0.65s (alvo) → dust em 0.85s (alvo).

#### `fm_mag_sombra_corrosiva` · Sombra Corrosiva · Lágrima negra

- Origem: Maga negra, posição 6/8, tipo `damage`, forma `single`, elemento `shadow`.
- Descrição/prompt visual: Uma gota escura gira na ida e abre um olho vazio ao contato. Fios de corrosão escorrem para o solo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0.15s (percurso) → vortex em 0.5s (alvo) → drain em 0.65s (alvo).

#### `fm_mag_nevasca` · Nevasca · Círculo da geada

- Origem: Maga negra, posição 7/8, tipo `damage`, forma `aoe`, elemento `ice`.
- Descrição/prompt visual: Cristais inclinam contra o vento circular; um cone de neve se fecha e quebra em fragmentos na borda externa.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: sigil em 0s (alvo) → vortex em 0.25s (alvo) → crystal em 0.5s (alvo) → shards em 0.7s (alvo).

#### `fm_mag_colapso` · Colapso Elemental · Sol fragmentado

- Origem: Maga negra, posição 8/8, tipo `damage`, forma `aoe`, elemento `mixed`.
- Descrição/prompt visual: Quatro núcleos elementais orbitam um vazio; o centro encolhe, quebra e lança um disco de fragmentos multicolores.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: orb em 0.05s (alvo) → vortex em 0.3s (alvo) → crystal em 0.6s (alvo) → wave em 0.85s (alvo) → shards em 0.9s (alvo).

### Beast Master

#### `bm_fis_lobo_guerreiro` · Lobo Guerreiro · Pele de luar

- Origem: Nature, posição 1/8, tipo `transform`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um contorno de lobo emerge sobre a postura humana; pelos espectrais acompanham a expansão das patas.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: leaves em 0s (origem) → wolf em 0.25s (origem) → claw em 0.65s (origem).

#### `bm_fis_couro_fera` · Couro de Fera · Escamas de casca

- Origem: Nature, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Placas de casca e couro sobem das pernas aos ombros, formando uma proteção orgânica sem pulso ofensivo.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: rock em 0.1s (origem) → shield em 0.35s (origem).

#### `bm_fis_furia_selvagem` · Fúria Selvagem · Sangue da matilha

- Origem: Nature, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Garras de energia abrem nos punhos e folhas secas rodopiam ao redor dos pés, acendendo a agressividade da fera.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: claw em 0.1s (origem) → leaves em 0.35s (origem) → crown em 0.6s (origem).

#### `bm_fis_investida` · Investida Bestial · Rastro de ombros

- Origem: Nature, posição 4/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma silhueta bestial avança em linha baixa, arrastando poeira; o encontro termina num choque de terra.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: wolf em 0.1s (percurso) → dust em 0.25s (percurso) → wave em 0.55s (alvo).

#### `bm_fis_garra_brutal` · Garra Brutal · Três rasgos

- Origem: Nature, posição 5/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Três cortes largos descem em diagonal e levantam lascas de pedra sob o alvo, enfatizando peso e alcance curto.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: claw em 0.15s (alvo) → shards em 0.4s (alvo) → rift em 0.5s (alvo).

#### `bm_fis_ursao` · Ursão Ancião · Espírito ancião

- Origem: Nature, posição 6/8, tipo `transform`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pedras flutuam ao redor dos pés; um urso enorme ocupa a silhueta e solta pó dourado dos ombros.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: rock em 0s (origem) → bear em 0.35s (origem) → dust em 0.75s (origem).

#### `bm_fis_presas_aco` · Presas de Aço · Mandíbula temperada

- Origem: Nature, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Duas presas metálicas se encaixam como um emblema sobre a fera; um fio branco afia as pontas.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: lance em 0.1s (origem) → mark em 0.4s (origem) → shards em 0.6s (origem).

#### `bm_fis_tita` · Titã Primordial · Montanha desperta

- Origem: Nature, posição 8/8, tipo `transform`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Rochas e raízes desenham um colosso; os braços pesados se firmam numa onda de solo, encerrando a transformação.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: rift em 0s (origem) → rock em 0.2s (origem) → titan em 0.5s (origem) → dust em 0.9s (origem).

#### `bm_mag_dardo_igneo` · Dardo Ígneo · Semente em brasa

- Origem: Element, posição 1/8, tipo `damage`, forma `single`, elemento `fire`.
- Descrição/prompt visual: Uma semente incandescente sai da mão e se abre em pétalas de fogo no alvo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: orb em 0s (origem) → arrow em 0.2s (percurso) → leaves em 0.55s (alvo).

#### `bm_mag_fenda_glacial` · Fenda Glacial · Raiz congelada

- Origem: Element, posição 2/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: Uma raiz de gelo percorre o chão, ergue uma ponta sob o alvo e racha em lascas largas.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: rift em 0.1s (percurso) → crystal em 0.4s (alvo) → shards em 0.6s (alvo).

#### `bm_mag_escarpa` · Escarpa Sísmica · Degraus do solo

- Origem: Element, posição 3/8, tipo `damage`, forma `aoe`, elemento `earth`.
- Descrição/prompt visual: Três placas rochosas sobem em sequência, culminando numa borda quebrada que empurra a poeira para fora.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: rock em 0.05s (origem) → rift em 0.2s (percurso) → rock em 0.45s (alvo) → dust em 0.65s (alvo).

#### `bm_mag_voz_trovao` · Voz do Trovão · Rugido elétrico

- Origem: Element, posição 4/8, tipo `damage`, forma `single`, elemento `lightning`.
- Descrição/prompt visual: Uma onda sonora sai do peito e transporta dois arcos de eletricidade até o alvo, onde o trovão fecha.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: wave em 0s (origem) → bolt em 0.25s (percurso) → wave em 0.55s (alvo).

#### `bm_mag_manto` · Manto Elemental · Pele dos elementos

- Origem: Element, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Quatro focos naturais percorrem o corpo; água, brasa e gelo costuram um manto luminoso sem ocultar a forma.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: orb em 0.05s (origem) → leaves em 0.25s (origem) → crown em 0.5s (origem).

#### `bm_mag_corrente_agua` · Corrente de Água · Rio circular

- Origem: Element, posição 6/8, tipo `damage`, forma `aoe`, elemento `water`.
- Descrição/prompt visual: Um rio fino se enrola ao redor da área e levanta uma crista de água; gotas descrevem o fluxo antes de cair.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: vortex em 0.1s (alvo) → wave em 0.3s (alvo) → motes em 0.6s (alvo).

#### `bm_mag_muralha` · Muralha de Rocha · Costelas da terra

- Origem: Element, posição 7/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Colunas de pedra se encaixam em torno do mestre; folhas presas nas juntas deixam a defesa viva, não mineral pura.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: rock em 0.1s (origem) → shield em 0.35s (origem) → leaves em 0.7s (origem).

#### `bm_mag_furia_quatro` · Fúria dos Quatro · Estações em choque

- Origem: Element, posição 8/8, tipo `damage`, forma `aoe`, elemento `mixed`.
- Descrição/prompt visual: Gelo, fogo, água e terra disputam quatro cantos da área e convergem numa cruz elemental.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: crystal em 0.1s (alvo) → rock em 0.25s (alvo) → vortex em 0.45s (alvo) → embers em 0.6s (alvo) → wave em 0.9s (alvo).

#### `bm_ctrl_condor` · Invocar Condor · Pouso do vigia

- Origem: Summon, posição 1/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Penas descem em círculo; o condor se materializa no centro e abre asas baixas, anunciando a invocação.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: feather em 0s (origem) → condor em 0.3s (origem) → wave em 0.65s (origem).

#### `bm_ctrl_lobo` · Invocar Lobo · Pegadas do chamado

- Origem: Summon, posição 2/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pegadas de luz aparecem antes do lobo; folhas preenchem seu torso e se dispersam quando ele firma as patas.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: mark em 0s (origem) → wolf em 0.3s (origem) → leaves em 0.6s (origem).

#### `bm_ctrl_chamado_boss` · Chamado do Boss · Sinal do alfa

- Origem: Summon, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um emblema de chifres se eleva sobre o mestre; fios dourados levam o comando à presença aliada.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crown em 0s (origem) → drain em 0.25s (percurso) → mark em 0.55s (alvo).

#### `bm_ctrl_urso` · Invocar Urso · Casulo de musgo

- Origem: Summon, posição 4/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um casulo de folhas grossas se rompe e revela o urso; o pouso espalha uma roda de poeira macia.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: leaves em 0s (origem) → bear em 0.35s (origem) → dust em 0.65s (origem).

#### `bm_ctrl_tigre` · Invocar Tigre · Salto listrado

- Origem: Summon, posição 5/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Riscos âmbar desenham o flanco de um tigre que salta para fora do selo e pousa com as garras abertas.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: sigil em 0s (origem) → tiger em 0.3s (origem) → claw em 0.6s (origem).

#### `bm_ctrl_dragao` · Invocar Dragão · Ovo de cinza

- Origem: Summon, posição 6/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma concha de brasa se abre; a silhueta alada do dragão cresce entre fragmentos e sopra um véu quente.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: orb em 0s (origem) → dragon em 0.4s (origem) → embers em 0.75s (origem).

#### `bm_ctrl_vinculo` · Vínculo Vital · Dois corações

- Origem: Summon, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Duas luzes respiram em sincronia, unidas por um fio verde-dourado. O elo passivo não dispara dano nem cura fictícia.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0s (origem) → orb em 0s (alvo) → drain em 0.3s (percurso).

#### `bm_ctrl_exercito` · Exército Primordial · Chamado triplo

- Origem: Summon, posição 8/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Três selos nascem em sucessão; lobo, condor e tigre surgem num triângulo e respondem à coroa do mestre.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: sigil em 0s (origem) → wolf em 0.25s (origem) → condor em 0.4s (percurso) → tiger em 0.55s (alvo) → crown em 0.8s (origem).

### Huntress

#### `ht_fis_tiro_certeiro` · Tiro Certeiro · Linha de intenção

- Origem: Survival, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma mira estreita precede a flecha. O rastro quase não curva e termina num risco curto no alvo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: mark em 0s (alvo) → arrow em 0.16s (percurso) → slash em 0.48s (alvo).

#### `ht_fis_pes_ligeiros` · Pés Ligeiros · Passos de vento

- Origem: Survival, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Duas curvas pálidas envolvem os tornozelos; folhas seguem o movimento dos pés e se afastam sem impacto.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: wave em 0.1s (origem) → leaves em 0.3s (origem).

#### `ht_fis_mira_aguia` · Mira de Águia · Olho de caça

- Origem: Survival, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Penas finas convergem num visor dourado sobre o arco, indicando uma postura de ataque mais firme.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: feather em 0s (origem) → mark em 0.25s (origem).

#### `ht_fis_tiro_congelante` · Tiro Congelante · Pena de gelo

- Origem: Survival, posição 4/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: A flecha recebe uma crista azul; ao cravar, pequenas agulhas fecham um colar de geada em torno do alvo.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: arrow em 0.15s (percurso) → crystal em 0.5s (alvo) → motes em 0.6s (alvo).

#### `ht_fis_sentinela` · Sentinela · Círculo de escuta

- Origem: Survival, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Arcos baixos varrem a periferia e uma pena suspensa acompanha a caçadora. O efeito comunica atenção, não uma barreira.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: wave em 0.1s (origem) → feather em 0.4s (origem) → mark em 0.65s (origem).

#### `ht_fis_flecha_rasante` · Flecha Rasante · Risco rente ao chão

- Origem: Survival, posição 6/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma flecha pesada corre baixa, levanta pó num corredor fino e atravessa o contato em vez de explodir.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: arrow em 0.15s (percurso) → dust em 0.25s (percurso) → slash em 0.55s (alvo).

#### `ht_fis_instinto` · Instinto de Caça · Alvo solitário

- Origem: Survival, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma única marca aparece separada de órbitas vazias; o brilho se concentra no centro, evocando a vantagem contra isolados.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: mark em 0s (alvo) → moon em 0.3s (alvo) → motes em 0.6s (alvo).

#### `ht_fis_rapid_hit` · Rapid Hit · Costura de flechas

- Origem: Survival, posição 8/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma sequência apertada de flechas costura o mesmo ponto; pequenos impactos alternados mantêm a leitura de múltiplos golpes.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: mark em 0s (alvo) → arrow em 0.18s (percurso) → slash em 0.48s (alvo) → shards em 0.85s (alvo).

#### `ht_ctrl_garra` · Garra Cortante · Unha lateral

- Origem: Capture, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Um risco em gancho atinge o flanco do alvo e se divide em duas lascas curtas de metal.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: claw em 0.16s (alvo) → shards em 0.4s (alvo).

#### `ht_ctrl_mais_um_golpe` · Mais Um Golpe · Segunda batida

- Origem: Capture, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma lâmina ecoa outra com um pequeno atraso; duas marcas no pulso sinalizam aceleração dos golpes.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: slash em 0.12s (origem) → slash em 0.3s (origem) → crown em 0.5s (origem).

#### `ht_ctrl_presa_ferida` · Presa Ferida · Rastro de ferida

- Origem: Capture, posição 3/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma garra deixa um corte luminoso estreito; fios ferruginosos continuam escorrendo sob a marca da presa.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: claw em 0.1s (alvo) → rift em 0.35s (alvo) → motes em 0.55s (alvo).

#### `ht_ctrl_dodge` · Dodge · Vulto deslocado

- Origem: Capture, posição 4/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Duas silhuetas translúcidas se separam e voltam ao corpo, sugerindo a evasão passiva sem representar teleporte real.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: echo em 0.1s (origem) → leaves em 0.4s (origem).

#### `ht_ctrl_rugido` · Rugido Selvagem · Voz da caçadora

- Origem: Capture, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um aro quente sai do peito e abre garras luminosas nas mãos; poeira baixa reforça a postura ofensiva.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: wave em 0.1s (origem) → claw em 0.35s (origem) → dust em 0.6s (origem).

#### `ht_ctrl_roubo_vital` · Roubo Vital · Fio rubro

- Origem: Capture, posição 6/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: O corte captura pequenas gotas de luz; três fios as trazem do alvo de volta à caçadora.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: slash em 0.1s (alvo) → drain em 0.4s (percurso) → heal em 0.7s (origem).

#### `ht_ctrl_duas_maos` · Poder das Duas Mãos · Peso equilibrado

- Origem: Capture, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Dois gumes sustentam um losango central. A composição passiva se fecha com um brilho contido de aço.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: lance em 0.1s (origem) → mark em 0.45s (origem) → motes em 0.6s (origem).

#### `ht_ctrl_invisibilidade` · Invisibilidade · Véu de coruja

- Origem: Capture, posição 8/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Penas cinzentas cobrem o corpo e um contorno se desfaz em fatias; o centro fica vazio ao fim da dissolução.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: feather em 0s (origem) → echo em 0.25s (origem) → vortex em 0.5s (origem) → motes em 0.8s (origem).

#### `ht_mag_flecha_arcana` · Flecha Arcana · Ponta de runa

- Origem: Arcane Archer, posição 1/8, tipo `damage`, forma `single`, elemento `sem elemento`.
- Descrição/prompt visual: Uma ponta rúnica substitui o metal; o voo deixa uma fita clara e um losango breve no contato.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: arrow em 0.15s (percurso) → mark em 0.5s (alvo).

#### `ht_mag_flecha_ignea` · Flecha Ígnea · Flecha de carvão

- Origem: Arcane Archer, posição 2/8, tipo `damage`, forma `single`, elemento `fire`.
- Descrição/prompt visual: A haste carrega pequenas brasas atrás da ponta. Ao cravar, uma labareda se abre só na direção do tiro.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: arrow em 0.16s (percurso) → slash em 0.48s (alvo) → embers em 0.52s (alvo).

#### `ht_mag_flecha_glacial` · Flecha Glacial · Roseta glacial

- Origem: Arcane Archer, posição 3/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: A flecha azul passa por um cristal fino e abre uma roseta de gelo no alvo, distinta da geada física.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crystal em 0s (origem) → arrow em 0.22s (percurso) → crystal em 0.55s (alvo).

#### `ht_mag_flecha_trovao` · Flecha de Trovão · Haste condutora

- Origem: Arcane Archer, posição 4/8, tipo `damage`, forma `single`, elemento `lightning`.
- Descrição/prompt visual: A ponta finca antes do raio; eletricidade ramifica ao longo do rastro e descarrega no mesmo ponto.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: arrow em 0.15s (percurso) → bolt em 0.5s (alvo) → shards em 0.65s (alvo).

#### `ht_mag_chuva_mistica` · Chuva Mística · Chuva constelada

- Origem: Arcane Archer, posição 5/8, tipo `damage`, forma `aoe`, elemento `sem elemento`.
- Descrição/prompt visual: Um arco lunar abre acima da área; flechas claras descem em leque e deixam estrelas breves no chão.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: moon em 0s (alvo) → lance em 0.3s (alvo) → mark em 0.65s (alvo).

#### `ht_mag_flecha_espectral` · Flecha Espectral · Passagem fantasma

- Origem: Arcane Archer, posição 6/8, tipo `damage`, forma `single`, elemento `shadow`.
- Descrição/prompt visual: Duas imagens translúcidas acompanham uma flecha escura que atravessa o alvo, soltando fios de sombra.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: echo em 0s (percurso) → arrow em 0.2s (percurso) → drain em 0.55s (alvo).

#### `ht_mag_vagalume` · Vagalume de Fogo · Enxame incandescente

- Origem: Arcane Archer, posição 7/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: Pequenos focos de brasa circulam a área como insetos; pulsam um após outro e deixam uma poeira luminosa.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: orb em 0.05s (alvo) → motes em 0.25s (alvo) → embers em 0.65s (alvo).

#### `ht_mag_tempestade` · Tempestade do Caçador · Céu do caçador

- Origem: Arcane Archer, posição 8/8, tipo `damage`, forma `aoe`, elemento `mixed`.
- Descrição/prompt visual: Flechas, gelo e trovão convergem na mesma área em três tempos; a última onda costura os elementos num círculo dourado.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: moon em 0s (alvo) → lance em 0.25s (alvo) → bolt em 0.6s (alvo) → wave em 0.85s (alvo) → motes em 1s (alvo).

## V2

### Thegn Knight

#### `tk_fis_force_wave` · Force Wave · Disco de aço

- Origem: Físico ofensivo, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Um disco achatado se desprende do escudo, gira de lado e fecha como uma mandíbula no alvo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: shield em 0s (origem) → wave em 0.18s (percurso) → slash em 0.48s (alvo) → shards em 0.6s (alvo).

#### `tk_fis_atk_descuidado` · Atk Descuidado · Fendas da couraça

- Origem: Físico ofensivo, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Placas afastam do torso e revelam um núcleo quente; a defesa aberta cede espaço ao ataque.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: shield em 0s (origem) → orb em 0.3s (origem) → shards em 0.55s (origem).

#### `tk_fis_mestre_dual` · Mestre Dual · Balança dos gumes

- Origem: Físico ofensivo, posição 3/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Dois arcos de aço se equilibram nas laterais da postura e deixam um selo simétrico de maestria.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: moon em 0.1s (origem) → slash em 0.35s (origem) → sigil em 0.55s (origem).

#### `tk_fis_death_stab` · Death Stab · Broca de metal

- Origem: Físico ofensivo, posição 4/8, tipo `damage`, forma `line`, elemento `physical`.
- Descrição/prompt visual: A ponta gira por dentro de uma hélice curta e concentra todos os sulcos da linha num impacto perfurante.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: vortex em 0s (origem) → lance em 0.22s (percurso) → rift em 0.55s (alvo).

#### `tk_fis_fury` · Fury · Tambores da guerra

- Origem: Físico ofensivo, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Três marcas de combate se acendem ao redor da cintura; cada batida solta uma lâmina de calor.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: mark em 0s (origem) → slash em 0.22s (origem) → slash em 0.55s (origem).

#### `tk_fis_increase_critical` · Increase Critical · Estrela da aresta

- Origem: Físico ofensivo, posição 6/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um pequeno cristal lapidado gira sobre o punho e termina num brilho em estrela, sem efeito ofensivo.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: crystal em 0.05s (origem) → crown em 0.3s (origem) → shards em 0.6s (origem).

#### `tk_fis_earthquake` · Earthquake · Martelo subterrâneo

- Origem: Físico ofensivo, posição 7/8, tipo `damage`, forma `aoe`, elemento `earth`.
- Descrição/prompt visual: Uma pressão desce sobre o centro da área; rochas saltam de dentro para fora em duas coroas alternadas.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: beam em 0.1s (alvo) → wave em 0.35s (alvo) → rock em 0.5s (alvo) → dust em 0.75s (alvo).

#### `tk_fis_fire_burst` · Fire Burst · Rede da fornalha

- Origem: Físico ofensivo, posição 8/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: Correntes rasantes tecem uma rede quente no alvo; estacas de brasa prendem a trama antes do jato central.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: chain em 0.15s (percurso) → rift em 0.38s (alvo) → crystal em 0.55s (alvo) → beam em 0.85s (alvo).

#### `tk_ctrl_shield` · Shield · Broquel giratório

- Origem: Defensivo, posição 1/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Três pequenos broquéis circulam o peito e interceptam fragmentos, deixando a frente aberta entre as passagens.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: shield em 0.1s (origem) → crown em 0.35s (origem) → shards em 0.6s (origem).

#### `tk_ctrl_resistance` · Resistance · Coluna interna

- Origem: Defensivo, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um eixo de luz cálida sobe dentro da silhueta; cintas horizontais se fecham ao longo dele para comunicar resistência.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: beam em 0s (origem) → wave em 0.25s (origem) → shield em 0.5s (origem).

#### `tk_ctrl_taunt` · Taunt · Estandarte do desafio

- Origem: Defensivo, posição 3/8, tipo `damage`, forma `aoe`, elemento `physical`.
- Descrição/prompt visual: Uma marca elevada se abre como estandarte; fios curtos voltam das bordas para o peito do cavaleiro.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: lance em 0s (origem) → mark em 0.2s (origem) → drain em 0.45s (percurso).

#### `tk_ctrl_imunity` · Imunity · Refração dourada

- Origem: Defensivo, posição 4/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Fragmentos arcanos encontram um prisma branco e se partem em duas faixas que contornam o corpo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0.05s (origem) → crystal em 0.3s (origem) → moon em 0.6s (origem).

#### `tk_ctrl_parry` · Parry · Gume de retorno

- Origem: Defensivo, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma lâmina curva captura o golpe e o devolve pelo arco contrário, marcada por uma faísca única de metal.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: slash em 0.05s (origem) → lance em 0.32s (origem) → shards em 0.45s (origem).

#### `tk_ctrl_sustain` · Sustain · Taça da vida

- Origem: Defensivo, posição 6/8, tipo `heal`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um arco em forma de taça recebe gotas douradas; elas se recolhem ao centro e sobem pelo corpo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: moon em 0s (origem) → orb em 0.22s (origem) → heal em 0.5s (origem).

#### `tk_ctrl_fear` · Fear · Dentes da noite

- Origem: Defensivo, posição 7/8, tipo `damage`, forma `aoe`, elemento `shadow`.
- Descrição/prompt visual: Um círculo de presas negras emerge baixo e avança em sombra até o inimigo, encerrando numa marca de pavor.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: lance em 0s (origem) → drain em 0.28s (percurso) → cage em 0.6s (alvo).

#### `tk_ctrl_divine_armor` · Divine Armor · Halo de contrapeso

- Origem: Defensivo, posição 8/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Quatro pequenas insígnias se mantêm suspensas ao redor do torso; a defesa passiva parece estável e pesada.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: mark em 0s (origem) → rock em 0.25s (origem) → crown em 0.6s (origem).

#### `tk_mag_lamina_energia` · Lâmina de Energia · Lâmina dobrada

- Origem: Mágico, posição 1/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Dois gumes de luz viajam em sentidos opostos de uma mesma hélice e se encontram no contato.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: moon em 0s (origem) → arrow em 0.22s (percurso) → claw em 0.55s (alvo).

#### `tk_mag_campo_gelo` · Campo de Gelo · Placas de inverno

- Origem: Mágico, posição 2/8, tipo `damage`, forma `aoe`, elemento `ice`.
- Descrição/prompt visual: O gelo se espalha em placas sobrepostas, sem cone vertical; uma névoa rasteira preserva a leitura da área.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: rift em 0.05s (alvo) → wave em 0.28s (alvo) → dust em 0.55s (alvo).

#### `tk_mag_mana_burn` · Mana Burn · Fole arcano

- Origem: Mágico, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Dois reservatórios azuis alimentam o calor nos ombros; cada pulsação consome um pouco do anel externo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: orb em 0s (origem) → chain em 0.3s (origem) → embers em 0.65s (origem).

#### `tk_mag_moon_ray` · Moon Ray · Espelho da lua

- Origem: Mágico, posição 4/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Um disco lunar se abre atrás do alvo e projeta uma lança de luz ao chão, como um reflexo condensado.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: mark em 0s (alvo) → moon em 0.25s (alvo) → lance em 0.5s (alvo).

#### `tk_mag_poison_stab` · Poison Stab · Lâmina embebida

- Origem: Mágico, posição 5/8, tipo `damage`, forma `single`, elemento `poison`.
- Descrição/prompt visual: Um corte verde abre a superfície do alvo; uma fita venenosa envolve a ferida e libera gotas lentas.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: slash em 0.12s (alvo) → drain em 0.35s (alvo) → orb em 0.65s (alvo).

#### `tk_mag_fire_slash` · Fire Slash · Ferradura em chamas

- Origem: Mágico, posição 6/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: O corte abre uma ferradura de fogo horizontal; brasas saltam de cada extremidade e se unem atrás do alvo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: moon em 0.05s (alvo) → claw em 0.35s (alvo) → embers em 0.7s (alvo).

#### `tk_mag_death_stab` · Death Stab · Agulhas do julgamento

- Origem: Mágico, posição 7/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Pequenas hastes de luz cercam uma estocada central, concentrando a sentença num único alvo.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: mark em 0s (alvo) → arrow em 0.25s (percurso) → lance em 0.55s (percurso).

#### `tk_mag_circulo_morte` · Circulo da Morte · Relógio do fim

- Origem: Mágico, posição 8/8, tipo `damage`, forma `aoe`, elemento `holy`.
- Descrição/prompt visual: Marcas douradas acendem como horas; um gume rotativo varre o círculo e o selo fecha num feixe central.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: mark em 0s (alvo) → slash em 0.3s (alvo) → beam em 0.8s (alvo).

### Frost Maiden

#### `fm_fis_impacto_longinquo` · Impacto Longínquo · Punho refratado

- Origem: Física, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Três ecos da mão empurram um corte de pressão; o alvo recebe um estalo de ar em vez de um projétil sólido.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: echo em 0s (origem) → slash em 0.22s (percurso) → wave em 0.55s (alvo).

#### `fm_fis_olho_falcao` · Olho de Falcão · Asas da percepção

- Origem: Física, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pequenas asas se abrem à altura das têmporas e assentam em dois arcos de vigilância.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: moon em 0.05s (origem) → feather em 0.3s (origem) → motes em 0.6s (origem).

#### `fm_fis_furia_combate` · Fúria de Combate · Coração de combate

- Origem: Física, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um rubi bate junto ao peito; a energia percorre três sulcos curtos até os punhos e sela a postura.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0s (origem) → rift em 0.3s (origem) → mark em 0.55s (origem).

#### `fm_fis_guarda_solida` · Guarda Sólida · Arcos de quartzo

- Origem: Física, posição 4/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Arcos de quartzo se inclinam sobre os ombros e apoiam uma proteção leve, mais arquitetônica que a couraça.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: cage em 0s (origem) → crown em 0.3s (origem) → shards em 0.6s (origem).

#### `fm_fis_conversao_vital` · Conversão Vital · Ampulheta viva

- Origem: Física, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Dois núcleos, azul e dourado, se alternam num eixo; grãos de mana descem e retornam como energia vital.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: orb em 0s (origem) → beam em 0.25s (origem) → motes em 0.45s (origem) → heal em 0.75s (origem).

#### `fm_fis_mestre_arco` · Mestre do Arco · Arco de cristal

- Origem: Física, posição 6/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um cristal se parte em duas pontas curvas, sustentando uma corda luminosa como emblema de maestria.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crystal em 0s (origem) → moon em 0.3s (origem) → drain em 0.55s (origem).

#### `fm_fis_ponto_critico` · Ponto Crítico · Pétala focal

- Origem: Física, posição 7/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Quatro lâminas de vidro se fecham ao redor de um ponto quente; sobra apenas a lente central da mira.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: crystal em 0.05s (origem) → orb em 0.35s (origem) → mark em 0.65s (origem).

#### `fm_fis_negacao_vida` · Negação de Vida · Raízes do vazio

- Origem: Física, posição 8/8, tipo `damage`, forma `aoe`, elemento `shadow`.
- Descrição/prompt visual: Fendas negras se entrelaçam na área; uma gaiola baixa bloqueia a luz enquanto poeira cinzenta cai de fora para dentro.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: rift em 0s (alvo) → cage em 0.35s (alvo) → dust em 0.65s (alvo) → drain em 0.9s (alvo).

#### `fm_ctrl_cura` · Cura · Gota de aurora

- Origem: White Mage, posição 1/8, tipo `heal`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma gota luminosa desce até o peito e se espalha em pequenos anéis ascendentes, delicados e contínuos.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: orb em 0s (origem) → wave em 0.25s (origem) → heal em 0.55s (origem).

#### `fm_ctrl_julgamento` · Julgamento Sagrado · Balança celeste

- Origem: White Mage, posição 2/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Duas pequenas luas medem o alvo e fecham uma lâmina de luz horizontal sobre a marca.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: moon em 0s (alvo) → slash em 0.3s (alvo) → mark em 0.6s (alvo).

#### `fm_ctrl_bencao` · Bênção · Manto de penas

- Origem: White Mage, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Penas douradas se encaixam como uma capa de proteção, abrindo brechas suficientes para manter o corpo visível.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: feather em 0.05s (origem) → shield em 0.4s (origem) → motes em 0.65s (origem).

#### `fm_ctrl_purificacao` · Purificação · Cristal límpido

- Origem: White Mage, posição 4/8, tipo `heal`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma casca fria retém manchas escuras, se abre e libera luz de cura sem sacudir a arena.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: crystal em 0s (origem) → shards em 0.28s (origem) → feather em 0.55s (origem) → heal em 0.7s (origem).

#### `fm_ctrl_lanca_luz` · Lança de Luz · Agulha solar

- Origem: White Mage, posição 5/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Uma ponta compacta avança cercada de anéis de foco; no contato os aros se empilham num clarão pontual.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: mark em 0s (origem) → arrow em 0.18s (percurso) → wave em 0.5s (alvo).

#### `fm_ctrl_vontade_divina` · Vontade Divina · Livro sem páginas

- Origem: White Mage, posição 6/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Duas placas de luz se abrem como páginas e deixam runas suspensas ao redor da maga.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: shield em 0s (origem) → sigil em 0.3s (origem) → mark em 0.6s (origem).

#### `fm_ctrl_castigo` · Castigo Celestial · Espadas pendentes

- Origem: White Mage, posição 7/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Três espadas de luz aparecem sobre a marca e caem sucessivamente, com golpes secos e espaçados.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crown em 0s (alvo) → lance em 0.3s (alvo) → wave em 0.7s (alvo).

#### `fm_ctrl_graca_ceu` · Graça do Céu · Jardim de aurora

- Origem: White Mage, posição 8/8, tipo `damage`, forma `aoe`, elemento `holy`.
- Descrição/prompt visual: Grandes pétalas claras brotam em círculo; feixes menores iluminam as lacunas antes do florescer central.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: feather em 0s (alvo) → crystal em 0.25s (alvo) → beam em 0.6s (alvo) → heal em 0.85s (alvo).

#### `fm_mag_esfera_ignea` · Esfera Ígnea · Cometa de cera

- Origem: Maga negra, posição 1/8, tipo `damage`, forma `single`, elemento `fire`.
- Descrição/prompt visual: Um núcleo de fogo alonga a cauda em duas fitas e ricocheteia visualmente num arco baixo antes de se romper.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: moon em 0s (origem) → orb em 0.2s (percurso) → slash em 0.55s (alvo).

#### `fm_mag_lanca_glacial` · Lança Glacial · Dente do inverno

- Origem: Maga negra, posição 2/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: Três lascas se juntam numa ponta de gelo; a estocada deixa uma fissura azul comprida sob o alvo.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crystal em 0s (origem) → arrow em 0.25s (percurso) → rift em 0.6s (alvo).

#### `fm_mag_choque_vital` · Choque Vital · Nós de tempestade

- Origem: Maga negra, posição 3/8, tipo `damage`, forma `single`, elemento `lightning`.
- Descrição/prompt visual: Esferas minúsculas se prendem à linha do tiro e acendem, formando uma descarga segmentada até o alvo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0.05s (percurso) → chain em 0.25s (percurso) → bolt em 0.55s (alvo).

#### `fm_mag_picada` · Picada Peçonhenta · Vespa ácida

- Origem: Maga negra, posição 4/8, tipo `damage`, forma `single`, elemento `poison`.
- Descrição/prompt visual: Duas asas translúcidas empurram um ferrão venenoso; pequenas gotas ficam presas numa marca circular.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: feather em 0s (origem) → arrow em 0.2s (percurso) → mark em 0.5s (alvo) → motes em 0.65s (alvo).

#### `fm_mag_tempestade_brasa` · Tempestade de Brasa · Fornalha espiral

- Origem: Maga negra, posição 5/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: Fogo gira rente ao chão antes de subir em três colunas curvas, deixando brasas visíveis entre as voltas.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: rift em 0s (alvo) → vortex em 0.3s (alvo) → embers em 0.75s (alvo).

#### `fm_mag_sombra_corrosiva` · Sombra Corrosiva · Mandíbula de breu

- Origem: Maga negra, posição 6/8, tipo `damage`, forma `single`, elemento `shadow`.
- Descrição/prompt visual: Dois cortes negros fecham sobre a presa e deixam dentes verdes de corrosão no espaço entre eles.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: moon em 0s (alvo) → claw em 0.3s (alvo) → crystal em 0.65s (alvo).

#### `fm_mag_nevasca` · Nevasca · Flores de granizo

- Origem: Maga negra, posição 7/8, tipo `damage`, forma `aoe`, elemento `ice`.
- Descrição/prompt visual: Rosetas de gelo brotam em batidas distintas; os fragmentos são soprados horizontalmente numa onda pálida.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: crystal em 0.05s (alvo) → wave em 0.35s (alvo) → shards em 0.55s (alvo) → dust em 0.85s (alvo).

#### `fm_mag_colapso` · Colapso Elemental · Prisma fraturado

- Origem: Maga negra, posição 8/8, tipo `damage`, forma `aoe`, elemento `mixed`.
- Descrição/prompt visual: Um prisma captura três elementos e se rompe em placas: gelo por dentro, fogo nas bordas e trovão nas rachaduras.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: crystal em 0s (alvo) → cage em 0.3s (alvo) → bolt em 0.55s (alvo) → shards em 0.85s (alvo).

### Beast Master

#### `bm_fis_lobo_guerreiro` · Lobo Guerreiro · Uivo de casca

- Origem: Nature, posição 1/8, tipo `transform`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Folhas se fecham num selo de patas e a forma lupina aparece como madeira luminosa, com o focinho voltado ao alto.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: sigil em 0s (origem) → crown em 0.2s (origem) → wolf em 0.45s (origem).

#### `bm_fis_couro_fera` · Couro de Fera · Casulo de folhas

- Origem: Nature, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Folhas grandes se sobrepõem no torso e formam uma pele protetora flexível, mais vegetal que mineral.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: leaves em 0s (origem) → cage em 0.3s (origem) → crown em 0.6s (origem).

#### `bm_fis_furia_selvagem` · Fúria Selvagem · Olhos do predador

- Origem: Nature, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Dois focos âmbar se acendem sobre a cabeça; presas pequenas descem até as mãos e reforçam a ameaça.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0s (origem) → lance em 0.25s (origem) → mark em 0.55s (origem).

#### `bm_fis_investida` · Investida Bestial · Aríete de raiz

- Origem: Nature, posição 4/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Raízes empurram um ombro de pedra através de um corredor curto; o impacto quebra a casca em fragmentos.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: rift em 0s (percurso) → rock em 0.25s (percurso) → shards em 0.6s (alvo).

#### `bm_fis_garra_brutal` · Garra Brutal · Presa cruzada

- Origem: Nature, posição 5/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Dois grandes rasgos se cruzam sobre a presa e abrem uma mandíbula de poeira abaixo dela.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: slash em 0.1s (alvo) → lance em 0.4s (alvo) → dust em 0.6s (alvo).

#### `bm_fis_ursao` · Ursão Ancião · Urso de âmbar

- Origem: Nature, posição 6/8, tipo `transform`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma concha dourada pulsa antes de revelar o urso; folhas presas no dorso se soltam lentamente.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: orb em 0s (origem) → bear em 0.35s (origem) → leaves em 0.7s (origem).

#### `bm_fis_presas_aco` · Presas de Aço · Coroa dentada

- Origem: Nature, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Presas curtas contornam um aro junto à cabeça da fera; uma centelha corre pelas pontas sem atacar.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: crown em 0.05s (origem) → lance em 0.3s (origem) → shards em 0.65s (origem).

#### `bm_fis_tita` · Titã Primordial · Colosso de raízes

- Origem: Nature, posição 8/8, tipo `transform`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma cúpula de galhos se abre e revela o titã verde; a transformação termina com folhas em vez de detritos.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: cage em 0s (origem) → titan em 0.4s (origem) → leaves em 0.8s (origem) → wave em 1s (origem).

#### `bm_mag_dardo_igneo` · Dardo Ígneo · Espinho de carvão

- Origem: Element, posição 1/8, tipo `damage`, forma `single`, elemento `fire`.
- Descrição/prompt visual: Um espinho preto acende na ponta e corre rente ao solo; faíscas secas saltam da casca ao atingir.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: lance em 0.15s (percurso) → rift em 0.45s (alvo) → embers em 0.6s (alvo).

#### `bm_mag_fenda_glacial` · Fenda Glacial · Mordida do gelo

- Origem: Element, posição 2/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: Duas pontas azuis sobem dos flancos da presa e se unem num corte frio, como uma mordida subterrânea.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: moon em 0s (alvo) → claw em 0.3s (alvo) → crystal em 0.6s (alvo).

#### `bm_mag_escarpa` · Escarpa Sísmica · Espinha de pedra

- Origem: Element, posição 3/8, tipo `damage`, forma `aoe`, elemento `earth`.
- Descrição/prompt visual: Uma costela rochosa serpenteia até o centro da área e abre placas inclinadas ao redor do impacto.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: chain em 0.05s (percurso) → rock em 0.3s (alvo) → rift em 0.6s (alvo).

#### `bm_mag_voz_trovao` · Voz do Trovão · Chifres condutores

- Origem: Element, posição 4/8, tipo `damage`, forma `single`, elemento `lightning`.
- Descrição/prompt visual: Dois arcos elétricos se erguem junto à cabeça e disparam uma descarga curta, seguida por um estalo de poeira.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: moon em 0s (origem) → bolt em 0.25s (percurso) → dust em 0.55s (alvo).

#### `bm_mag_manto` · Manto Elemental · Estações no ombro

- Origem: Element, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pétalas frias e quentes atravessam o corpo em direções opostas, criando um manto assimétrico de afinidade elemental.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: feather em 0s (origem) → leaves em 0.25s (origem) → shield em 0.55s (origem).

#### `bm_mag_corrente_agua` · Corrente de Água · Mandala líquida

- Origem: Element, posição 6/8, tipo `damage`, forma `aoe`, elemento `water`.
- Descrição/prompt visual: Três ondas se cruzam na área e erguem gotas grossas, desenhando uma flor de água no chão.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: wave em 0s (alvo) → orb em 0.3s (alvo) → feather em 0.6s (alvo).

#### `bm_mag_muralha` · Muralha de Rocha · Dólmens protetores

- Origem: Element, posição 7/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Três dólmens pesados surgem em arco, ligados por veios dourados. A proteção deixa grandes intervalos de leitura.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: rock em 0s (origem) → chain em 0.35s (origem) → sigil em 0.65s (origem).

#### `bm_mag_furia_quatro` · Fúria dos Quatro · Mandíbulas elementais

- Origem: Element, posição 8/8, tipo `damage`, forma `aoe`, elemento `mixed`.
- Descrição/prompt visual: Quatro pares de gumes se fecham em torno da área; cada mordida traz uma estação antes do abalo conjunto.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: claw em 0.1s (alvo) → claw em 0.35s (alvo) → wave em 0.6s (alvo) → rock em 0.85s (alvo).

#### `bm_ctrl_condor` · Invocar Condor · Ninho de vento

- Origem: Summon, posição 1/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma espiral baixa reúne penas e sustenta o condor acima do solo, como um nascimento numa corrente de ar.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: vortex em 0s (origem) → condor em 0.35s (origem) → feather em 0.7s (origem).

#### `bm_ctrl_lobo` · Invocar Lobo · Fenda da matilha

- Origem: Summon, posição 2/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma abertura verde rasga o chão; o lobo salta através do corte e deixa dois ecos de patas.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: rift em 0s (origem) → wolf em 0.3s (origem) → echo em 0.6s (origem).

#### `bm_ctrl_chamado_boss` · Chamado do Boss · Trompa ancestral

- Origem: Summon, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Anéis graves saem do mestre e chegam aos aliados como pequenas coroas de comando, sem formar um ataque.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: wave em 0s (origem) → crown em 0.3s (alvo) → leaves em 0.6s (alvo).

#### `bm_ctrl_urso` · Invocar Urso · Pedras do guardião

- Origem: Summon, posição 4/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pedras delimitam um refúgio antes do urso surgir; uma cinta de luz marca sua função de proteção.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: rock em 0s (origem) → bear em 0.3s (origem) → shield em 0.65s (origem).

#### `bm_ctrl_tigre` · Invocar Tigre · Tigre de fumaça

- Origem: Summon, posição 5/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Faixas escuras se separam de uma esfera âmbar e revelam o tigre; a cauda desfaz o último véu de pó.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: orb em 0s (origem) → tiger em 0.3s (origem) → dust em 0.75s (origem).

#### `bm_ctrl_dragao` · Invocar Dragão · Dragão da tempestade

- Origem: Summon, posição 6/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Cristais e arcos luminosos desenham a forma alada; o dragão se estabiliza com uma descarga para o solo.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crystal em 0s (origem) → dragon em 0.35s (origem) → bolt em 0.75s (origem).

#### `bm_ctrl_vinculo` · Vínculo Vital · Raiz compartilhada

- Origem: Summon, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um caminho de pequenas raízes liga duas marcas vivas; pulsos discretos percorrem o chão entre mestre e fera.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: mark em 0s (origem) → mark em 0s (alvo) → rift em 0.3s (percurso) → motes em 0.6s (percurso).

#### `bm_ctrl_exercito` · Exército Primordial · Guardiões do bosque

- Origem: Summon, posição 8/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Urso, lobo e condor aparecem como estátuas vivas entre dólmens, ligados pelo sinal do mestre.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: rock em 0s (origem) → bear em 0.25s (origem) → wolf em 0.4s (alvo) → condor em 0.55s (percurso) → drain em 0.85s (percurso).

### Huntress

#### `ht_fis_tiro_certeiro` · Tiro Certeiro · Pena de aço

- Origem: Survival, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma pena se afila numa ponta metálica; a flecha viaja sem retícula e termina numa pequena estrela de lascas.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: feather em 0s (origem) → arrow em 0.2s (percurso) → shards em 0.5s (alvo).

#### `ht_fis_pes_ligeiros` · Pés Ligeiros · Pegadas suspensas

- Origem: Survival, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Marcas claras se separam dos pés e deixam uma silhueta breve atrasada, traduzindo leveza de movimento.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: mark em 0s (origem) → echo em 0.25s (origem) → motes em 0.5s (origem).

#### `ht_fis_mira_aguia` · Mira de Águia · Asa tensionada

- Origem: Survival, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um arco de penas sustenta a linha de mira; duas pontas se alinham à altura dos olhos.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: moon em 0s (origem) → lance em 0.25s (origem) → feather em 0.55s (origem).

#### `ht_fis_tiro_congelante` · Tiro Congelante · Grampo de inverno

- Origem: Survival, posição 4/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: A flecha abre duas presas de gelo junto aos pés do alvo, deixando a lentidão com uma silhueta baixa e clara.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: arrow em 0.1s (percurso) → moon em 0.42s (alvo) → rift em 0.6s (alvo).

#### `ht_fis_sentinela` · Sentinela · Olhos periféricos

- Origem: Survival, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Três pequenas marcas vigiam em alturas diferentes; um fio de vento passa entre elas e contorna a caçadora.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: mark em 0s (origem) → drain em 0.3s (origem) → feather em 0.6s (origem).

#### `ht_fis_flecha_rasante` · Flecha Rasante · Serpente de vento

- Origem: Survival, posição 6/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: A flecha arrasta duas fitas de vento que riscam a superfície e se abrem como gumes no final do percurso.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: drain em 0.05s (percurso) → arrow em 0.25s (percurso) → slash em 0.6s (alvo).

#### `ht_fis_instinto` · Instinto de Caça · Lua da presa

- Origem: Survival, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma lua estreita envolve a marca de um alvo isolado; nenhuma partícula invade as áreas vizinhas.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: moon em 0s (alvo) → mark em 0.3s (alvo) → feather em 0.65s (alvo).

#### `ht_fis_rapid_hit` · Rapid Hit · Leque convergente

- Origem: Survival, posição 8/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Flechas se abrem num leque curto e convergem na mesma presa; golpes de metal fecham o ritmo em duas batidas.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: feather em 0s (origem) → arrow em 0.22s (percurso) → claw em 0.58s (alvo) → shards em 0.9s (alvo).

#### `ht_ctrl_garra` · Garra Cortante · Gancho de caça

- Origem: Capture, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Dois gumes curtos puxam a borda da silhueta do alvo para um contato seco, sem círculo no chão.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: moon em 0s (alvo) → slash em 0.25s (alvo) → shards em 0.5s (alvo).

#### `ht_ctrl_mais_um_golpe` · Mais Um Golpe · Pulso duplicado

- Origem: Capture, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Duas ondas pequenas batem junto às mãos; a segunda alcança a primeira e deixa uma marca de velocidade.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: wave em 0s (origem) → lance em 0.3s (origem) → mark em 0.6s (origem).

#### `ht_ctrl_presa_ferida` · Presa Ferida · Espinho persistente

- Origem: Capture, posição 3/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma ponta curva fica presa na marca; gotas ferruginosas pulsam abaixo dela em vez de repetir o corte.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: lance em 0.12s (alvo) → mark em 0.35s (alvo) → orb em 0.65s (alvo).

#### `ht_ctrl_dodge` · Dodge · Penas evasivas

- Origem: Capture, posição 4/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Penas cinzentas se deslocam para os lados enquanto o centro fica livre. A passiva é sugerida sem salto de posição.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: feather em 0s (origem) → moon em 0.3s (origem) → motes em 0.6s (origem).

#### `ht_ctrl_rugido` · Rugido Selvagem · Presas da voz

- Origem: Capture, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um emblema dentado surge acima dos ombros e alimenta dois arcos quentes ao redor dos braços.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: crown em 0s (origem) → moon em 0.25s (origem) → embers em 0.6s (origem).

#### `ht_ctrl_roubo_vital` · Roubo Vital · Pétalas roubadas

- Origem: Capture, posição 6/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma garra arranca pétalas rubras do alvo; elas atravessam o percurso e se tornam uma coroa vital junto à caçadora.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: claw em 0.1s (alvo) → feather em 0.35s (percurso) → crown em 0.7s (origem).

#### `ht_ctrl_duas_maos` · Poder das Duas Mãos · Arco de contrapeso

- Origem: Capture, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma lâmina grande e duas pequenas equilibram o emblema central, comunicando maestria e peso sem dano.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: slash em 0s (origem) → lance em 0.3s (origem) → sigil em 0.65s (origem).

#### `ht_ctrl_invisibilidade` · Invisibilidade · Cortina de sombra

- Origem: Capture, posição 8/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Arcos escuros se cruzam diante da postura; o contorno se quebra em fragmentos cada vez menores até sumir.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: cage em 0s (origem) → shards em 0.3s (origem) → echo em 0.6s (origem).

#### `ht_mag_flecha_arcana` · Flecha Arcana · Espiral rúnica

- Origem: Arcane Archer, posição 1/8, tipo `damage`, forma `single`, elemento `sem elemento`.
- Descrição/prompt visual: A flecha atravessa dois aros de foco e chega acompanhada por uma curva sagrada, não por uma cauda reta.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: wave em 0s (origem) → arrow em 0.22s (percurso) → moon em 0.55s (alvo).

#### `ht_mag_flecha_ignea` · Flecha Ígnea · Fênix breve

- Origem: Arcane Archer, posição 2/8, tipo `damage`, forma `single`, elemento `fire`.
- Descrição/prompt visual: Penas de fogo se prendem à haste durante o voo e abrem uma pequena asa no impacto.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: feather em 0.1s (percurso) → arrow em 0.25s (percurso) → feather em 0.6s (alvo).

#### `ht_mag_flecha_glacial` · Flecha Glacial · Corda congelada

- Origem: Arcane Archer, posição 3/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: Fios azuis acompanham a flecha; ao tocar o alvo eles viram uma pequena cúpula de gelo recortada.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: drain em 0s (percurso) → arrow em 0.2s (percurso) → cage em 0.55s (alvo).

#### `ht_mag_flecha_trovao` · Flecha de Trovão · Duplo condutor

- Origem: Arcane Archer, posição 4/8, tipo `damage`, forma `single`, elemento `lightning`.
- Descrição/prompt visual: Duas pontas elétricas cercam a trajetória e fecham um arco horizontal no contato, sem raio vertical.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: arrow em 0.12s (percurso) → bolt em 0.4s (percurso) → wave em 0.65s (alvo).

#### `ht_mag_chuva_mistica` · Chuva Mística · Leque astral

- Origem: Arcane Archer, posição 5/8, tipo `damage`, forma `aoe`, elemento `sem elemento`.
- Descrição/prompt visual: Penas grandes se abrem sobre a área e lançam pequenas pontas luminosas; cada contato desenha um aro de estrela.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: feather em 0s (alvo) → lance em 0.35s (alvo) → wave em 0.7s (alvo).

#### `ht_mag_flecha_espectral` · Flecha Espectral · Costela fantasma

- Origem: Arcane Archer, posição 6/8, tipo `damage`, forma `single`, elemento `shadow`.
- Descrição/prompt visual: Uma gaiola estreita se adianta ao tiro; a flecha atravessa suas costelas e se desfaz atrás da presa.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: cage em 0s (alvo) → arrow em 0.3s (percurso) → shards em 0.65s (alvo).

#### `ht_mag_vagalume` · Vagalume de Fogo · Pólen de brasa

- Origem: Arcane Archer, posição 7/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: Um botão de fogo abre pétalas no chão e libera focos minúsculos que seguem um circuito baixo pela área.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: feather em 0s (alvo) → wave em 0.3s (alvo) → motes em 0.55s (alvo).

#### `ht_mag_tempestade` · Tempestade do Caçador · Coroa da caçada

- Origem: Arcane Archer, posição 8/8, tipo `damage`, forma `aoe`, elemento `mixed`.
- Descrição/prompt visual: Uma coroa elemental cerca o alvo; flechas cruzam a distância e ativam geada, trovão e brasa em setores distintos.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crown em 0s (alvo) → arrow em 0.22s (percurso) → bolt em 0.55s (alvo) → rift em 0.8s (alvo).

## V3

### Thegn Knight

#### `tk_fis_force_wave` · Force Wave · Punho rúnico

- Origem: Físico ofensivo, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Um pequeno selo se comprime no punho e imprime sua forma no alvo; a pressão termina numa lasca de bronze.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: sigil em 0s (origem) → mark em 0.25s (alvo) → beam em 0.45s (alvo) → shards em 0.6s (alvo).

#### `tk_fis_atk_descuidado` · Atk Descuidado · Coração descoberto

- Origem: Físico ofensivo, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma faixa de proteção se parte diante do peito; o núcleo exposto pulsa vermelho e alimenta uma coroa de ataque.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: shield em 0s (origem) → shards em 0.22s (origem) → orb em 0.4s (origem) → crown em 0.65s (origem).

#### `tk_fis_mestre_dual` · Mestre Dual · Nó de combate

- Origem: Físico ofensivo, posição 3/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Fios de aço tecem um nó simétrico entre duas marcas; o domínio de duas armas aparece como equilíbrio, não golpe.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: drain em 0s (origem) → mark em 0.3s (origem) → motes em 0.65s (origem).

#### `tk_fis_death_stab` · Death Stab · Túnel de lâminas

- Origem: Físico ofensivo, posição 4/8, tipo `damage`, forma `line`, elemento `physical`.
- Descrição/prompt visual: Arcos curtos abrem um corredor de perfuração; a estocada atravessa o túnel e deixa um corte seco na saída.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: cage em 0s (percurso) → lance em 0.3s (percurso) → slash em 0.65s (alvo).

#### `tk_fis_fury` · Fury · Coroa dos berserkers

- Origem: Físico ofensivo, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Dentes de brasa formam uma coroa baixa; pequenos ecos da postura vibram ao ritmo acelerado dos golpes.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: crown em 0s (origem) → echo em 0.25s (origem) → embers em 0.6s (origem).

#### `tk_fis_increase_critical` · Increase Critical · Selo do ponto fraco

- Origem: Físico ofensivo, posição 6/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um selo mínimo recolhe três pontas para o centro, deixando apenas a aresta brilhante que marca a precisão passiva.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: sigil em 0s (origem) → arrow em 0.3s (origem) → mark em 0.65s (origem).

#### `tk_fis_earthquake` · Earthquake · Sino de pedra

- Origem: Físico ofensivo, posição 7/8, tipo `damage`, forma `aoe`, elemento `earth`.
- Descrição/prompt visual: Um arco rochoso aparece acima da área e cai como um sino; o solo responde com rachaduras e uma onda larga.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: cage em 0s (alvo) → rock em 0.3s (alvo) → rift em 0.6s (alvo) → wave em 0.85s (alvo).

#### `tk_fis_fire_burst` · Fire Burst · Mangual solar

- Origem: Físico ofensivo, posição 8/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: Uma corrente curva acompanha um núcleo de fogo que gira em arco; a cabeça do mangual abre um corte circular de brasa.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: orb em 0s (origem) → chain em 0.2s (percurso) → orb em 0.4s (percurso) → slash em 0.7s (alvo) → embers em 0.95s (alvo).

#### `tk_ctrl_shield` · Shield · Guarda rúnica

- Origem: Defensivo, posição 1/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um selo sobe dos pés e se dobra numa placa única diante do torso, com um brilho curto na borda externa.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: sigil em 0s (origem) → shield em 0.3s (origem) → mark em 0.6s (origem).

#### `tk_ctrl_resistance` · Resistance · Anéis do carvalho

- Origem: Defensivo, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Círculos grossos se assentam um dentro do outro ao redor dos pés, enquanto um fluxo quente sustenta o corpo.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: wave em 0s (origem) → heal em 0.3s (origem) → rock em 0.65s (origem).

#### `tk_ctrl_taunt` · Taunt · Elmo retumbante

- Origem: Defensivo, posição 3/8, tipo `damage`, forma `aoe`, elemento `physical`.
- Descrição/prompt visual: Um eco ampliado da postura se ergue atrás do cavaleiro; a marca de desafio alcança a presa num único pulso.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: echo em 0s (origem) → wave em 0.28s (origem) → mark em 0.6s (alvo).

#### `tk_ctrl_imunity` · Imunity · Rosácea de proteção

- Origem: Defensivo, posição 4/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pétalas claras giram junto à armadura e apararam símbolos arcanos; fragmentos saem sempre para longe do corpo.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: feather em 0s (origem) → mark em 0.3s (origem) → shards em 0.65s (origem).

#### `tk_ctrl_parry` · Parry · Porta entreaberta

- Origem: Defensivo, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Dois painéis formam uma abertura estreita; o golpe se desvia pela lacuna e deixa uma cauda clara de ricochete.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: shield em 0s (origem) → arrow em 0.28s (origem) → slash em 0.55s (origem).

#### `tk_ctrl_sustain` · Sustain · Forja reparadora

- Origem: Defensivo, posição 6/8, tipo `heal`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um pequeno selo aquece o chão; placas de luz retornam ao corpo e selam juntas abertas com partículas vitais.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: sigil em 0s (origem) → shield em 0.25s (origem) → heal em 0.6s (origem).

#### `tk_ctrl_fear` · Fear · Eclipse do guerreiro

- Origem: Defensivo, posição 7/8, tipo `damage`, forma `aoe`, elemento `shadow`.
- Descrição/prompt visual: Uma lua negra cobre a marca do cavaleiro; ondas sombrias alcançam o alvo e deixam uma silhueta hesitante.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: moon em 0s (origem) → wave em 0.3s (origem) → echo em 0.65s (alvo).

#### `tk_ctrl_divine_armor` · Divine Armor · Asas de metal

- Origem: Defensivo, posição 8/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Arcos dourados sustentam pequenas placas atrás dos ombros. A armadura passiva termina numa assinatura discreta de asas.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: moon em 0s (origem) → shield em 0.3s (origem) → feather em 0.65s (origem).

#### `tk_mag_lamina_energia` · Lâmina de Energia · Corte de inscrição

- Origem: Mágico, posição 1/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Uma inscrição dourada se desenha no percurso e se parte em gumes pequenos, todos orientados para o mesmo alvo.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: rift em 0s (percurso) → arrow em 0.28s (percurso) → shards em 0.6s (alvo).

#### `tk_mag_campo_gelo` · Campo de Gelo · Ampulheta de neve

- Origem: Mágico, posição 2/8, tipo `damage`, forma `aoe`, elemento `ice`.
- Descrição/prompt visual: Gotas frias descem sobre um selo e param no ar; cristais baixos demarcam a borda do campo congelante.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: motes em 0s (alvo) → sigil em 0.25s (alvo) → crystal em 0.6s (alvo).

#### `tk_mag_mana_burn` · Mana Burn · Coroa faminta

- Origem: Mágico, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma coroa de fogo consome pequenas partículas azuis, enquanto fios quentes assentam sobre os braços.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: crown em 0s (origem) → motes em 0.25s (origem) → drain em 0.55s (origem).

#### `tk_mag_moon_ray` · Moon Ray · Raio de plenilúnio

- Origem: Mágico, posição 4/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Anéis concêntricos focam a luz do alto; um feixe estreito atravessa o centro e deixa uma cratera dourada luminosa.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crown em 0s (alvo) → beam em 0.35s (alvo) → sigil em 0.65s (alvo).

#### `tk_mag_poison_stab` · Poison Stab · Serpente na lâmina

- Origem: Mágico, posição 5/8, tipo `damage`, forma `single`, elemento `poison`.
- Descrição/prompt visual: Um fio venenoso enrola a estocada e se desprende como uma pequena serpente ao redor da marca.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: drain em 0s (percurso) → lance em 0.25s (percurso) → vortex em 0.55s (alvo).

#### `tk_mag_fire_slash` · Fire Slash · Roda da forja

- Origem: Mágico, posição 6/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: Uma roda incandescente toca o solo e risca a área em setores; cada setor apaga em aparas quentes.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: wave em 0s (alvo) → rift em 0.28s (alvo) → shards em 0.65s (alvo).

#### `tk_mag_death_stab` · Death Stab · Sentença partida

- Origem: Mágico, posição 7/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Uma marca de luz se divide em duas metades; a estocada central junta ambas num clarão de corte, não numa explosão.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: moon em 0s (alvo) → lance em 0.35s (percurso) → slash em 0.7s (alvo).

#### `tk_mag_circulo_morte` · Circulo da Morte · Cúpula do veredito

- Origem: Mágico, posição 8/8, tipo `damage`, forma `aoe`, elemento `holy`.
- Descrição/prompt visual: Arcos de julgamento fecham uma cúpula sobre a área e se recolhem num selo final, coroado por lâminas menores.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: cage em 0s (alvo) → crown em 0.3s (alvo) → lance em 0.6s (alvo) → sigil em 0.95s (alvo).

### Frost Maiden

#### `fm_fis_impacto_longinquo` · Impacto Longínquo · Pedra de pressão

- Origem: Física, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma lasca de ar endurecido gira na ida e quebra ao tocar; a maga ataca com massa visual, sem fogo ou gelo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: crystal em 0s (origem) → orb em 0.2s (percurso) → shards em 0.55s (alvo).

#### `fm_fis_olho_falcao` · Olho de Falcão · Constelação do falcão

- Origem: Física, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Três estrelas desenham o olho acima da postura; arcos laterais ampliam a sensação de campo de visão.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0s (origem) → moon em 0.3s (origem) → mark em 0.6s (origem).

#### `fm_fis_furia_combate` · Fúria de Combate · Corda de combate

- Origem: Física, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Fios quentes apertam a postura como uma corda de arco; um par de lâminas curtas se arma junto às mãos.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: drain em 0s (origem) → lance em 0.3s (origem) → wave em 0.6s (origem).

#### `fm_fis_guarda_solida` · Guarda Sólida · Quartzo suspenso

- Origem: Física, posição 4/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pedras cristalinas gravitam próximas ao corpo e se encaixam em uma cinta de defesa, com espaços entre as placas.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: rock em 0s (origem) → mark em 0.3s (origem) → shield em 0.65s (origem).

#### `fm_fis_conversao_vital` · Conversão Vital · Rosácea circulatória

- Origem: Física, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma roseta azul se abre nos pés e transforma fragmentos frios em pétalas douradas que retornam à silhueta.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: sigil em 0s (origem) → shards em 0.25s (origem) → feather em 0.5s (origem) → heal em 0.8s (origem).

#### `fm_fis_mestre_arco` · Mestre do Arco · Flecha em repouso

- Origem: Física, posição 6/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma flecha repousa dentro de um anel de foco, apoiada por duas penas de luz; não há disparo de combate.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: arrow em 0s (origem) → wave em 0.3s (origem) → feather em 0.6s (origem).

#### `fm_fis_ponto_critico` · Ponto Crítico · Inscrição cirúrgica

- Origem: Física, posição 7/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Linhas retas delimitam uma marca estreita e uma pequena lança de luz aparece no centro da postura de precisão.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: rift em 0s (origem) → mark em 0.3s (origem) → lance em 0.65s (origem).

#### `fm_fis_negacao_vida` · Negação de Vida · Sino do silêncio

- Origem: Física, posição 8/8, tipo `damage`, forma `aoe`, elemento `shadow`.
- Descrição/prompt visual: Uma coroa escura se forma sobre a área; o feixe central apaga em pó enquanto círculos negros permanecem baixos.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: crown em 0s (alvo) → beam em 0.3s (alvo) → wave em 0.6s (alvo) → dust em 0.95s (alvo).

#### `fm_ctrl_cura` · Cura · Faixa reparadora

- Origem: White Mage, posição 1/8, tipo `heal`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Faixas de ouro costuram a silhueta em duas voltas suaves, terminando numa pequena coroa sobre o peito.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: drain em 0s (origem) → heal em 0.3s (origem) → crown em 0.6s (origem).

#### `fm_ctrl_julgamento` · Julgamento Sagrado · Agulha de verdade

- Origem: White Mage, posição 2/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Uma ponta clara desce dentro de um selo curto; o alvo é atingido de cima, com um brilho que não se espalha.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: sigil em 0s (alvo) → lance em 0.28s (alvo) → motes em 0.6s (alvo).

#### `fm_ctrl_bencao` · Bênção · Refúgio dourado

- Origem: White Mage, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Três arcos leves se inclinam sobre a maga e deixam um selo protetor nos pés, mais abrigo que armadura.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: cage em 0s (origem) → sigil em 0.3s (origem) → heal em 0.6s (origem).

#### `fm_ctrl_purificacao` · Purificação · Sopro de alvorada

- Origem: White Mage, posição 4/8, tipo `heal`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma asa branca varre as partículas escuras para fora; gotas claras ocupam o espaço limpo e sobem em direção ao corpo.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: feather em 0s (origem) → wave em 0.3s (origem) → motes em 0.5s (origem) → heal em 0.75s (origem).

#### `fm_ctrl_lanca_luz` · Lança de Luz · Cristal consagrado

- Origem: White Mage, posição 5/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Uma haste de quartzo dourado se forma no ar e se afila durante o voo; o contato deixa uma única marca sagrada.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crystal em 0s (origem) → lance em 0.25s (percurso) → mark em 0.6s (alvo).

#### `fm_ctrl_vontade_divina` · Vontade Divina · Lâmpada interior

- Origem: White Mage, posição 6/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um núcleo branco ilumina a silhueta por dentro; penas curtas acompanham os ombros e deixam clara a origem benigna.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0s (origem) → feather em 0.3s (origem) → wave em 0.65s (origem).

#### `fm_ctrl_castigo` · Castigo Celestial · Corte do firmamento

- Origem: White Mage, posição 7/8, tipo `damage`, forma `single`, elemento `holy`.
- Descrição/prompt visual: Duas luas estreitas abrem um corredor no alto; um gume vertical atravessa o alvo e fragmenta o selo no solo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: moon em 0s (alvo) → slash em 0.3s (alvo) → shards em 0.65s (alvo) → sigil em 0.9s (alvo).

#### `fm_ctrl_graca_ceu` · Graça do Céu · Espiral de ascensão

- Origem: White Mage, posição 8/8, tipo `damage`, forma `aoe`, elemento `holy`.
- Descrição/prompt visual: Luz sobe da área em vez de cair: uma espiral clara carrega fragmentos e termina numa coroa aberta de graça.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: sigil em 0s (alvo) → heal em 0.25s (alvo) → vortex em 0.5s (alvo) → crown em 0.9s (alvo).

#### `fm_mag_esfera_ignea` · Esfera Ígnea · Botão de fogo

- Origem: Maga negra, posição 1/8, tipo `damage`, forma `single`, elemento `fire`.
- Descrição/prompt visual: Uma flor fechada de brasa atravessa o percurso e abre suas pétalas numa pequena erupção inclinada.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0.1s (percurso) → feather em 0.42s (alvo) → wave em 0.65s (alvo).

#### `fm_mag_lanca_glacial` · Lança Glacial · Flecha de estalactite

- Origem: Maga negra, posição 2/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: Um cristal cai sobre a linha de tiro e se quebra em uma lança horizontal; a ponta deixa três pequenas lascas no alvo.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: crystal em 0s (origem) → lance em 0.3s (percurso) → shards em 0.65s (alvo).

#### `fm_mag_choque_vital` · Choque Vital · Mandala nervosa

- Origem: Maga negra, posição 3/8, tipo `damage`, forma `single`, elemento `lightning`.
- Descrição/prompt visual: Uma marca elétrica aparece na presa antes da descarga; três arcos curtos percorrem suas bordas e fecham no centro.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: mark em 0s (alvo) → bolt em 0.3s (alvo) → wave em 0.65s (alvo).

#### `fm_mag_picada` · Picada Peçonhenta · Bomba de esporos

- Origem: Maga negra, posição 4/8, tipo `damage`, forma `single`, elemento `poison`.
- Descrição/prompt visual: Um núcleo verde viaja fechado e libera esporos contidos na presa; um ferrão luminoso mantém a leitura do golpe inicial.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: orb em 0.05s (percurso) → lance em 0.38s (alvo) → leaves em 0.65s (alvo).

#### `fm_mag_tempestade_brasa` · Tempestade de Brasa · Coroa de vulcão

- Origem: Maga negra, posição 5/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: Uma coroa de rochas abre respiradouros na área e lança pequenas colunas de fogo em sequência.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: rock em 0s (alvo) → beam em 0.3s (alvo) → embers em 0.55s (alvo) → rift em 0.85s (alvo).

#### `fm_mag_sombra_corrosiva` · Sombra Corrosiva · Espinho de eclipse

- Origem: Maga negra, posição 6/8, tipo `damage`, forma `single`, elemento `shadow`.
- Descrição/prompt visual: Uma lua escura concentra veneno num único espinho; ele perfura a marca e continua gotejando sombra.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: moon em 0s (alvo) → lance em 0.3s (percurso) → motes em 0.65s (alvo).

#### `fm_mag_nevasca` · Nevasca · Catedral de inverno

- Origem: Maga negra, posição 7/8, tipo `damage`, forma `aoe`, elemento `ice`.
- Descrição/prompt visual: Arcos de gelo crescem entre agulhas frias; a neve escorre por dentro da estrutura e assenta numa neblina baixa.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: cage em 0s (alvo) → crystal em 0.3s (alvo) → motes em 0.55s (alvo) → dust em 0.9s (alvo).

#### `fm_mag_colapso` · Colapso Elemental · Ampulheta dos mundos

- Origem: Maga negra, posição 8/8, tipo `damage`, forma `aoe`, elemento `mixed`.
- Descrição/prompt visual: Fogo e gelo convergem de cima e de baixo; a cintura do efeito estrangula a luz e libera quatro cortes elementais.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: beam em 0s (alvo) → crystal em 0.25s (alvo) → vortex em 0.45s (alvo) → slash em 0.8s (alvo).

### Beast Master

#### `bm_fis_lobo_guerreiro` · Lobo Guerreiro · Lobo de geada

- Origem: Nature, posição 1/8, tipo `transform`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma geada fina revela a silhueta lupina; o contorno deixa o corpo humano através de um véu de ar frio.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: motes em 0s (origem) → echo em 0.2s (origem) → wolf em 0.45s (origem).

#### `bm_fis_couro_fera` · Couro de Fera · Anéis de chifre

- Origem: Nature, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pontas de chifre se assentam como costelas ao redor do corpo e deixam um selo de resistência natural.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: cage em 0s (origem) → lance em 0.3s (origem) → sigil em 0.65s (origem).

#### `bm_fis_furia_selvagem` · Fúria Selvagem · Rugido de outono

- Origem: Nature, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma onda de folhas quentes parte do peito e forma dois riscos de garra no ar, antes de voltar aos punhos.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: wave em 0s (origem) → leaves em 0.25s (origem) → claw em 0.6s (origem).

#### `bm_fis_investida` · Investida Bestial · Sombra predadora

- Origem: Nature, posição 4/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: O corpo projeta uma fera translúcida à frente; a imagem abre uma garra no contato e some com o pó levantado.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: echo em 0s (percurso) → claw em 0.35s (alvo) → dust em 0.65s (alvo).

#### `bm_fis_garra_brutal` · Garra Brutal · Corte de rocha viva

- Origem: Nature, posição 5/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Placas finas surgem sobre a presa e são rasgadas por uma garra pesada, com lascas bem separadas no ar.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: rock em 0s (alvo) → claw em 0.3s (alvo) → shards em 0.65s (alvo).

#### `bm_fis_ursao` · Ursão Ancião · Urso da noite

- Origem: Nature, posição 6/8, tipo `transform`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um arco lunar ampara a transformação; o urso surge em silhueta azul-escura com apenas as bordas acesas.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: moon em 0s (origem) → bear em 0.35s (origem) → motes em 0.75s (origem).

#### `bm_fis_presas_aco` · Presas de Aço · Ferraria feral

- Origem: Nature, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pequenas placas se fecham sobre duas pontas luminosas, evocando presas reforçadas sem mostrar um ataque.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: shield em 0s (origem) → lance em 0.3s (origem) → embers em 0.6s (origem).

#### `bm_fis_tita` · Titã Primordial · Titã do magma

- Origem: Nature, posição 8/8, tipo `transform`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Fendas incandescentes alimentam uma forma colossal de basalto; brasas escapam das juntas enquanto o corpo assenta.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: rift em 0s (origem) → titan em 0.35s (origem) → embers em 0.65s (origem) → crown em 0.95s (origem).

#### `bm_mag_dardo_igneo` · Dardo Ígneo · Dente da salamandra

- Origem: Element, posição 1/8, tipo `damage`, forma `single`, elemento `fire`.
- Descrição/prompt visual: Uma pequena presa de fogo surge da mão e deixa dois gumes curtos na direção do tiro ao tocar a presa.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: moon em 0s (origem) → lance em 0.25s (percurso) → claw em 0.6s (alvo).

#### `bm_mag_fenda_glacial` · Fenda Glacial · Crista subterrânea

- Origem: Element, posição 2/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: Um aro azul marca a presa e se quebra em três lâminas de gelo que irrompem do chão em alturas diferentes.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: wave em 0s (alvo) → lance em 0.3s (alvo) → shards em 0.65s (alvo).

#### `bm_mag_escarpa` · Escarpa Sísmica · Círculo de menires

- Origem: Element, posição 3/8, tipo `damage`, forma `aoe`, elemento `earth`.
- Descrição/prompt visual: Menires pequenos cercam o centro e se inclinam após o abalo; a poeira passa entre as pedras, preservando o contorno.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: sigil em 0s (alvo) → rock em 0.3s (alvo) → wave em 0.55s (alvo) → dust em 0.8s (alvo).

#### `bm_mag_voz_trovao` · Voz do Trovão · Tambor do céu

- Origem: Element, posição 4/8, tipo `damage`, forma `single`, elemento `lightning`.
- Descrição/prompt visual: Um selo elevado recebe uma descarga curta e a transmite pelo chão como uma onda elétrica grossa.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crown em 0s (alvo) → bolt em 0.3s (alvo) → wave em 0.6s (alvo).

#### `bm_mag_manto` · Manto Elemental · Casca prismática

- Origem: Element, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Placas elementais translúcidas se sobrepõem nos ombros; pequenos focos de água e fogo circulam pelas juntas.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: shield em 0s (origem) → orb em 0.3s (origem) → motes em 0.6s (origem).

#### `bm_mag_corrente_agua` · Corrente de Água · Catarata invertida

- Origem: Element, posição 6/8, tipo `damage`, forma `aoe`, elemento `water`.
- Descrição/prompt visual: Gotas sobem de uma fissura circular e se reúnem numa coluna líquida; no ápice o fluxo se abre em pétalas.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: rift em 0s (alvo) → heal em 0.25s (alvo) → beam em 0.5s (alvo) → feather em 0.85s (alvo).

#### `bm_mag_muralha` · Muralha de Rocha · Carapaça mineral

- Origem: Element, posição 7/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Placas de basalto fecham uma defesa rente ao corpo; uma única coroa de raízes ancora a proteção no chão.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: shield em 0s (origem) → crown em 0.35s (origem) → rift em 0.7s (origem).

#### `bm_mag_furia_quatro` · Fúria dos Quatro · Ritual dos quatro ventos

- Origem: Element, posição 8/8, tipo `damage`, forma `aoe`, elemento `mixed`.
- Descrição/prompt visual: Quatro arcos conduzem os elementos para um núcleo comum; o ritual encerra com fragmentos e um sopro circular.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: cage em 0s (alvo) → orb em 0.25s (alvo) → shards em 0.55s (alvo) → wave em 0.85s (alvo) → rock em 1s (alvo).

#### `bm_ctrl_condor` · Invocar Condor · Constelação alada

- Origem: Summon, posição 1/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Pontos dourados desenham a envergadura antes do condor aparecer; penas finas permanecem presas à borda das asas.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: motes em 0s (origem) → condor em 0.3s (origem) → feather em 0.65s (origem).

#### `bm_ctrl_lobo` · Invocar Lobo · Lobo do crepúsculo

- Origem: Summon, posição 2/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Duas luas estreitas se afastam para revelar a fera; um fio escuro prende a invocação ao selo do mestre.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: moon em 0s (origem) → wolf em 0.3s (origem) → drain em 0.65s (origem).

#### `bm_ctrl_chamado_boss` · Chamado do Boss · Pacto da coroa

- Origem: Summon, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um selo no chão e uma coroa no alto ligam o mestre à fera por um único fio claro de comando.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: sigil em 0s (origem) → crown em 0.3s (alvo) → chain em 0.6s (percurso).

#### `bm_ctrl_urso` · Invocar Urso · Urso da nascente

- Origem: Summon, posição 4/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Água envolve a forma do guardião e cai quando ele se materializa; pequenos cristais marcam seu lugar de chegada.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: wave em 0s (origem) → bear em 0.3s (origem) → crystal em 0.7s (origem).

#### `bm_ctrl_tigre` · Invocar Tigre · Tigre do eclipse

- Origem: Summon, posição 5/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma sombra redonda se rasga em listras e revela a fera; o último corte de luz desenha olhos e presas.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: moon em 0s (origem) → tiger em 0.35s (origem) → slash em 0.7s (origem).

#### `bm_ctrl_dragao` · Invocar Dragão · Dragão do bosque

- Origem: Summon, posição 6/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Galhos luminosos formam um ninho e revelam a silhueta alada; folhas quentes se desprendem das asas ao abrir.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: cage em 0s (origem) → dragon em 0.3s (origem) → leaves em 0.7s (origem) → crown em 0.95s (origem).

#### `bm_ctrl_vinculo` · Vínculo Vital · Constelação partilhada

- Origem: Summon, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Marcas idênticas aparecem sobre mestre e fera; partículas transitam entre ambas num ritmo calmo de vínculo passivo.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: crown em 0s (origem) → crown em 0s (alvo) → motes em 0.3s (percurso) → drain em 0.65s (percurso).

#### `bm_ctrl_exercito` · Exército Primordial · Procissão ancestral

- Origem: Summon, posição 8/8, tipo `summon`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: As feras chegam por fendas sucessivas, com contornos espectrais diferentes unidos pelo mesmo selo de invocação.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: rift em 0s (origem) → wolf em 0.25s (origem) → tiger em 0.4s (percurso) → condor em 0.6s (alvo) → sigil em 0.95s (origem).

### Huntress

#### `ht_fis_tiro_certeiro` · Tiro Certeiro · Ponta silenciosa

- Origem: Survival, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Um fio de vento antecede uma lança curta; apenas um aro fino assinala o contato certeiro.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: drain em 0s (percurso) → lance em 0.25s (percurso) → wave em 0.6s (alvo).

#### `ht_fis_pes_ligeiros` · Pés Ligeiros · Asas nos tornozelos

- Origem: Survival, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Penas pequenas se prendem aos pés e se soltam num arco baixo, sem eco de corpo nem explosão.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: feather em 0s (origem) → moon em 0.3s (origem) → leaves em 0.6s (origem).

#### `ht_fis_mira_aguia` · Mira de Águia · Lente do horizonte

- Origem: Survival, posição 3/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Dois aros de mira se sobrepõem à frente dos olhos e recebem um pequeno núcleo de foco dourado.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: mark em 0s (origem) → orb em 0.3s (origem) → motes em 0.6s (origem).

#### `ht_fis_tiro_congelante` · Tiro Congelante · Prego de geada

- Origem: Survival, posição 4/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: Um cristal afiado viaja com a ponta da flecha e fixa uma marca fria; neve fina escorre da ferida.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: lance em 0.12s (percurso) → mark em 0.45s (alvo) → dust em 0.7s (alvo).

#### `ht_fis_sentinela` · Sentinela · Penas do vigia

- Origem: Survival, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma coroa de penas baixas abre ao redor da cabeça; os pequenos focos laterais mantêm o efeito atento e defensivo.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: crown em 0s (origem) → feather em 0.3s (origem) → orb em 0.65s (origem).

#### `ht_fis_flecha_rasante` · Flecha Rasante · Corte horizontal

- Origem: Survival, posição 6/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma flecha larga avança por uma fenda de vento e corta o alvo numa faixa horizontal, enfatizando velocidade e alcance.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: rift em 0s (percurso) → arrow em 0.28s (percurso) → slash em 0.65s (alvo).

#### `ht_fis_instinto` · Instinto de Caça · Dente da perseguição

- Origem: Survival, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um pequeno dente de luz paira sobre uma marca isolada; partículas periféricas desaparecem antes de tocar o centro.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: lance em 0s (alvo) → mark em 0.3s (alvo) → motes em 0.65s (alvo).

#### `ht_fis_rapid_hit` · Rapid Hit · Cadência em espiral

- Origem: Survival, posição 8/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma espiral curta organiza a saraivada e lança pontas em ritmo fechado; a presa recebe marcas sucessivas, não um clarão único.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: vortex em 0s (origem) → arrow em 0.25s (percurso) → mark em 0.55s (alvo) → shards em 0.9s (alvo).

#### `ht_ctrl_garra` · Garra Cortante · Fio serrilhado

- Origem: Capture, posição 1/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Um corte serrilhado corre pelo flanco do alvo e arranca fragmentos grossos, mantendo a leitura de contato físico.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas.
- Sequência: rift em 0s (alvo) → claw em 0.28s (alvo) → shards em 0.6s (alvo).

#### `ht_ctrl_mais_um_golpe` · Mais Um Golpe · Arco rearmado

- Origem: Capture, posição 2/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um arco luminoso se tensiona duas vezes ao redor do pulso; pequenas pontas se alinham para a próxima sequência.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: moon em 0s (origem) → arrow em 0.25s (origem) → crown em 0.6s (origem).

#### `ht_ctrl_presa_ferida` · Presa Ferida · Marca farpada

- Origem: Capture, posição 3/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma marca irregular crava pequenas farpas e deixa um fio rubro no chão, comunicando uma ferida que persiste.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: mark em 0s (alvo) → lance em 0.28s (alvo) → drain em 0.6s (alvo).

#### `ht_ctrl_dodge` · Dodge · Nó de ar

- Origem: Capture, posição 4/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Fitas claras se cruzam onde estaria o golpe e deixam o centro vazio, uma assinatura abstrata da esquiva passiva.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: drain em 0s (origem) → wave em 0.3s (origem) → shards em 0.65s (origem).

#### `ht_ctrl_rugido` · Rugido Selvagem · Coração da caça

- Origem: Capture, posição 5/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um núcleo quente cresce no peito e abre um leque de gumes, reforçando a ofensiva sem lançar um ataque à distância.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0s (origem) → slash em 0.3s (origem) → mark em 0.65s (origem).

#### `ht_ctrl_roubo_vital` · Roubo Vital · Agulha de retorno

- Origem: Capture, posição 6/8, tipo `damage`, forma `single`, elemento `physical`.
- Descrição/prompt visual: Uma ponta rubra fica presa ao alvo; o fio luminoso volta à caçadora e fecha uma pequena taça de vida.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas · CanvasTexture.
- Sequência: lance em 0.1s (alvo) → drain em 0.35s (percurso) → moon em 0.6s (origem) → heal em 0.85s (origem).

#### `ht_ctrl_duas_maos` · Poder das Duas Mãos · Selo de força

- Origem: Capture, posição 7/8, tipo `passive`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Um selo quadrado sustenta uma lâmina pesada em repouso; pequenas placas laterais equilibram a postura de duas mãos.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: mark em 0s (origem) → lance em 0.3s (origem) → shield em 0.65s (origem).

#### `ht_ctrl_invisibilidade` · Invisibilidade · Eclipse da silhueta

- Origem: Capture, posição 8/8, tipo `buff`, forma `self`, elemento `sem elemento`.
- Descrição/prompt visual: Uma lua cinzenta fecha atrás do corpo; o contorno recua e se desfaz em penas escuras, deixando apenas o selo vazio.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: moon em 0s (origem) → echo em 0.3s (origem) → feather em 0.6s (origem) → sigil em 0.9s (origem).

#### `ht_mag_flecha_arcana` · Flecha Arcana · Lacre luminoso

- Origem: Arcane Archer, posição 1/8, tipo `damage`, forma `single`, elemento `sem elemento`.
- Descrição/prompt visual: Um pequeno selo acompanha a ponta como um lacre; ele se imprime sobre o alvo e racha em partículas claras.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: sigil em 0s (origem) → arrow em 0.25s (percurso) → shards em 0.6s (alvo).

#### `ht_mag_flecha_ignea` · Flecha Ígnea · Rastro de fornalha

- Origem: Arcane Archer, posição 2/8, tipo `damage`, forma `single`, elemento `fire`.
- Descrição/prompt visual: Uma flecha incandescente arrasta uma corrente de calor e deixa um núcleo de fogo apertado no contato.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: chain em 0s (percurso) → arrow em 0.25s (percurso) → orb em 0.6s (alvo).

#### `ht_mag_flecha_glacial` · Flecha Glacial · Prisma perfurante

- Origem: Arcane Archer, posição 3/8, tipo `damage`, forma `single`, elemento `ice`.
- Descrição/prompt visual: Um prisma guia a haste e se fragmenta em duas luas frias ao atingir, com lascas que preservam o sentido do voo.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: crystal em 0s (origem) → lance em 0.25s (percurso) → moon em 0.6s (alvo) → shards em 0.8s (alvo).

#### `ht_mag_flecha_trovao` · Flecha de Trovão · Ponta de tempestade

- Origem: Arcane Archer, posição 4/8, tipo `damage`, forma `single`, elemento `lightning`.
- Descrição/prompt visual: Uma pequena coroa elétrica se arma no alvo antes da flecha; a chegada ativa uma única descarga central.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: crown em 0s (alvo) → arrow em 0.25s (percurso) → bolt em 0.6s (alvo).

#### `ht_mag_chuva_mistica` · Chuva Mística · Roda de meteoros

- Origem: Arcane Archer, posição 5/8, tipo `damage`, forma `aoe`, elemento `sem elemento`.
- Descrição/prompt visual: Núcleos claros aparecem numa roda acima da área e se alongam em lanças cadentes, terminando num selo estrelado.
- Técnica escolhida: Three.js · geometria animada · shader GLSL.
- Sequência: orb em 0s (alvo) → lance em 0.35s (alvo) → sigil em 0.75s (alvo).

#### `ht_mag_flecha_espectral` · Flecha Espectral · Agulha do vazio

- Origem: Arcane Archer, posição 6/8, tipo `damage`, forma `single`, elemento `shadow`.
- Descrição/prompt visual: Um olho escuro se abre na presa e puxa a flecha para dentro; o rastro é engolido pela espiral final.
- Técnica escolhida: Three.js · geometria animada.
- Sequência: mark em 0s (alvo) → lance em 0.25s (percurso) → vortex em 0.6s (alvo).

#### `ht_mag_vagalume` · Vagalume de Fogo · Lanternas selvagens

- Origem: Arcane Archer, posição 7/8, tipo `damage`, forma `aoe`, elemento `fire`.
- Descrição/prompt visual: Pequenas lanternas de brasa pendem sobre marcas no chão e se apagam em cascata, liberando fagulhas como insetos.
- Técnica escolhida: Three.js · geometria animada · shader GLSL · partículas instanciadas · CanvasTexture.
- Sequência: mark em 0s (alvo) → orb em 0.25s (alvo) → embers em 0.55s (alvo) → feather em 0.85s (alvo).

#### `ht_mag_tempestade` · Tempestade do Caçador · Eclipse elemental

- Origem: Arcane Archer, posição 8/8, tipo `damage`, forma `aoe`, elemento `mixed`.
- Descrição/prompt visual: Uma lua de fogo enquadra a área enquanto lanças de gelo caem; água e trovão fecham a tempestade numa espiral recortada.
- Técnica escolhida: Three.js · geometria animada · partículas instanciadas.
- Sequência: moon em 0s (alvo) → lance em 0.3s (alvo) → vortex em 0.55s (alvo) → bolt em 0.8s (alvo) → shards em 1s (alvo).
