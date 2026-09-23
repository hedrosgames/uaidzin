# Áudios — inventário I11

Documento de discovery. Depois de ler isto, dá para saber **BGM/SFX esperados vs o que existe**, sem abrir pastas.

**Escopo varrido:** disco (`game/public/`, `visual/`, raiz — excl. `node_modules`/`vendor`/`backup`) · `GameApp` settings · `index.html` / boot login · runtime TS (sem `Audio`/`Howl` de jogo).  
**Conflito GDD × grill:** grill vence.

**Legenda de status**

| Status | Significado |
|---|---|
| `final` | Arquivo + playback em produção |
| `placeholder` | UI/setting existe sem som |
| `falta` | Domínio esperado sem arquivo nem código |

**Contagem no disco (áudio de jogo):** **0** arquivos `.mp3` / `.ogg` / `.wav`.

---

## Resumo

| Domínio | Arquivo | Código playback | Status |
|---|---|---|---|
| BGM cidade | 0 | 0 | falta |
| BGM dungeon | 0 | 0 | falta |
| BGM login / seleção | 0 | 0 | falta |
| SFX UI (click, abrir painel) | 0 | 0 | falta |
| SFX combate (hit, morte, skill) | 0 | 0 | falta |
| SFX level up (fanfarra D7) | 0 | 0 | falta |
| Sliders volume Settings | n/a | persistem `volMusic` / `volSfx` | placeholder |

---

## 1. Controles existentes (sem áudio atrás)

| Controle | Onde | Persistência | Status |
|---|---|---|---|
| `vol-music` / `volMusic` | `game/index.html`, boot `01-login.html` | settings local | placeholder |
| `vol-sfx` / `volSfx` | idem | settings local | placeholder |

Não há `THREE.Audio`, `AudioListener` de jogo, nem loader de buffer fora do vendor Three.

---

## 2. Catálogo esperado (grill / cenas) — tudo `falta`

| Id | Tipo | Cena / gatilho | Liga |
|---|---|---|---|
| `bgm-login` | BGM | Login | L* |
| `bgm-select` | BGM | Seleção | S* |
| `bgm-city` | BGM | Hub | C* |
| `bgm-dungeon` | BGM | Run (pode variar por bioma depois) | D* · D13 |
| `sfx-ui-click` | SFX | Botões / painéis | UI |
| `sfx-ui-open-close` | SFX | Abrir/fechar C/K/I | UI |
| `sfx-hit` | SFX | Acerto | combate |
| `sfx-miss` | SFX | Erro | combate |
| `sfx-skill` | SFX | Cast skill | combate · I2 |
| `sfx-death-player` | SFX | Morte jogador | D2 |
| `sfx-death-enemy` | SFX | Morte inimigo | combate |
| `sfx-level-up` | SFX | Fanfarra | **D7** |
| `sfx-portal` | SFX | Entrar/sair dungeon | X3b |
| `sfx-drop` | SFX | Item no log | D6 |

Paths alvo sugeridos (ainda inexistentes): `game/public/audio/bgm/` · `game/public/audio/sfx/`.

---

## 3. Gaps

| Gap | Nota |
|---|---|
| Zero mídia | Nada para ligar nos sliders |
| Zero pipeline | Sem service de áudio no `game/src` |
| D7 incompleto no som | Visual/HUD ok; fanfarra sonora **falta** |
| Bioma BGM | D13 pode pedir BGM por dungeon — hoje nem genérico existe |

---

## Fontes

- Disco: varredura `.mp3/.ogg/.wav` = 0
- UI: `GameApp.ts` volume settings; `game/index.html`
- I5 (`assets.md`) já marcava áudio como `falta`
