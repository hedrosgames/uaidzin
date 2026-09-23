# Catálogo de animações (Mixamo → GLB)

Autoridade de arquivos convertidos: `public/models/anims/{human,mutant}/`.  
Manifest gerado: `assets-source/organized/manifest.json` (`node scripts/mixamo-organize.mjs`).

## Rig e público

| Rig | Ossos | Quem usa |
|-----|-------|----------|
| **Human** | esqueleto Mixamo padrão (~66 ossos, `mixamorig*`) | TK, FM, BM, HT em forma humana; NPCs humanoides |
| **Mutant** | esqueleto Mixamo mutant (~34 ossos) | Formas do BM (lobo, urso, titã, éden), monstros não humanoides |

Idle de cada classe fica no GLB do personagem (`public/models/player/{TK,FM,BM,HT}/*.glb`).  
TK já usa **Breathing Idle** retargetado (`mixamo-retarget-idle.py`). Demais classes: mesmo pipeline quando quiser trocar o idle.

## Loop de combate (humano)

Clips em `public/models/anims/human/` salvo exceção abaixo.

| Arquivo | Origem Mixamo | Uso no jogo |
|---------|---------------|-------------|
| `run.glb` | Run With Sword | Locomoção quando `PlayerView` está em movimento |
| `attack.glb` | Sword And Shield Slash | Ataque padrão: machado+escudo, espada+escudo |
| `attack_1h.glb` | One Hand Sword Combo | Espadas duplas, machados duplos |
| `attack_2h.glb` | Heavy Weapon Swing | Cajadão, cajado+escudo (golpe corpo a corpo) |
| `attack_greatsword.glb` | Great Sword Slash | Espadão |
| `attack_bow.glb` | Standing Aim Recoil | Arco |
| `attack_unarmed.glb` | Punching | Soco (reserva / skills sem arma) |
| `attack_swipe.glb` | Mutant Swiping (rig human) | Garras (`dual-gloves`) |
| `attack_kick.glb` | Kicking | Reserva para skills de chute |
| `cast.glb` | Magic Spell Casting | Cast genérico |
| `cast_fire.glb` | Fireball | Skills de fogo |
| `cast_heal.glb` | Magic Heal | Skills de cura |
| `hit_gut.glb` | Rib Hit | Reação alternada (hit A) |
| `hit_right.glb` | Standing React Small From Left | Reação alternada (hit B) |
| `block.glb` | Blocking | Parry / block (quando ligar no combate) |
| `idle_2h.glb` | 2hand Idle | Idle opcional com arma 2H (cajados) |
| `idle_greatsword.glb` | Great Sword Idle | Idle opcional com espadão |

**Morte humana:** ainda `public/models/player/shared/anims/death.glb` (clip antigo). Não havia dying humano no pacote do Drive; trocar quando houver FBX humano equivalente.

Seleção de ataque por conjunto de armas: `PlayerAnimCatalog.attackClipForWeapon` + `PlayerView`.

## Mutant (BM transform + monstros)

Clips em `public/models/anims/mutant/` (Creature Pack).

| Arquivo | Origem | Uso |
|---------|--------|-----|
| `idle.glb` | mutant breathing idle | Parado em forma transformada |
| `run.glb` | mutant run | Correr em forma transformada |
| `attack.glb` | mutant swiping | Golpe principal |
| `attack_punch.glb` | mutant punch | Golpe alternativo / skill |
| `death.glb` | mutant dying | Morte em rig mutant |
| `roar.glb` | mutant roaring | Entrada de transform / intimidar |

Malhas de referência (Tripo, ainda sem bind no runtime):  
`assets-source/organized/meshes/{lobo,urso,tita,eden}/`.  
**Éden:** pasta reservada; nenhum zip no Drive na importação atual.

Mapa lógico forma BM → mesh → anim:

| Forma (skill) | Pasta mesh | Rig anim |
|---------------|------------|----------|
| Lobisomem | `meshes/lobo` | mutant |
| Urso | `meshes/urso` | mutant |
| Titã | `meshes/tita` | mutant |
| Éden | `meshes/eden` | mutant |

## O que foi descartado

Regras em `scripts/mixamo-organize.mjs` (`DROP`): turnos, strafe, walk side, jump, taunt, flex, looking around, duplicatas `(1)`, `Running.fbx`, `Run Forward`, variantes mutant redundantes. Log: `assets-source/_discarded/_log.txt`.

Não usamos animação de virada lateral nem walk cycle separado: rotação e blend atuais do personagem permanecem.

## Pipeline

1. FBX novos em `assets-source/mixamo-incoming/` (não versionado).
2. `node scripts/mixamo-organize.mjs` — copia canônicos, descarta gordura, exporta GLB via Blender (`mixamo-export-anim.py`), retarget idle TK (`mixamo-retarget-idle.py`).
3. Atualizar esta tabela e `manifest.json` se entrar clip novo.

## Próximos passos (código)

- `PlayerView`: trocar mesh + `MUTANT_ANIM_ROOT` quando `FormState` ativo no BM (malhas em `meshes/`).
- Skills: escolher `cast_fire` / `cast_heal` / `attack_kick` por id de skill.
- Inimigos: reutilizar `human/` ou `mutant/` conforme rig do modelo.
