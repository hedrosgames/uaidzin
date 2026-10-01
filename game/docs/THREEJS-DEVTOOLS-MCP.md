# Three.js DevTools MCP (UAIDZIN)

Integração opcional de **desenvolvimento** com [threejs-devtools-mcp](https://github.com/DmitriyGolub/threejs-devtools-mcp) **v0.4.1** (59 ferramentas MCP).

## Por que existe neste repo

O UAIDZIN usa **Three.js vanilla + Vite + TypeScript**, `EffectComposer` (bloom) e `AnimationMixer` no `PlayerView`. Agentes de IA editam bem TypeScript e GLB no disco, mas **não veem** a cena WebGL em execução. O MCP preenche essa lacuna: árvore de cena, skeleton, animações, materiais, FPS, screenshots e `run_js` — **sem** substituir Playwright, smoke ou Blender.

## Arquitetura

```
Agente (Cursor MCP)
    ↕ stdio
threejs-devtools-mcp (Node)
    ↕ proxy http://localhost:9222 → http://127.0.0.1:5173
Bridge injetado no HTML
    ↕
UAIDZIN (WebGL) + registerThreeDevTools (somente import.meta.env.DEV)
```

Camada de projeto: `game/src/integrations/threejs-devtools/registerThreeDevTools.ts`

Registra, em dev:

- `window.__THREE_SCENE__`, `__THREE_RENDERER__`, `__THREE_CAMERA__`
- `window.__THREE_ANIMATION_MIXERS__`
- `window.THREE`, `window.GLTFExporter` (helpers / export)
- `renderer.userData.effectComposer` (lista de passes de pós-processo)

**Motivo:** o jogo chama `EffectComposer.render()`, não `WebGLRenderer.render()` direto; o auto-detect do MCP sozinho pode falhar ou pegar câmera errada.

Produção: nenhum import do registrador fora de `installDebugApi` (já guardado por `import.meta.env.DEV`).

## Instalação

1. Dependência opcional (pin): `threejs-devtools-mcp@0.4.1` via `npx` (config do Cursor).
2. Repositório já inclui `.cursor/mcp.json` na raiz do monorepo.
3. Reinicie o Cursor ou recarregue MCP em **Settings → MCP**.

## Configuração (Cursor)

Arquivo: `/workspace/.cursor/mcp.json`

- Comando: `npx threejs-devtools-mcp@0.4.1`
- `DEV_PORT=5173`, `BROWSER=none` (abrir 9222 manualmente ou via script)
- Working directory: `game/`

Variáveis úteis (documentação upstream):

| Variável | Default | Uso |
|----------|---------|-----|
| `DEV_PORT` | auto | **5173** no UAIDZIN |
| `BRIDGE_PORT` | 9222 | Proxy |
| `BROWSER` | auto | `none` em CI/cloud |
| `PUPPETEER` / `HEADLESS` | false | Chrome headless |

## Desenvolvimento

```bash
cd game
npm run dev
```

Em outro terminal:

```bash
cd game
npm run devtools:mcp
```

Abrir **http://localhost:9222** (não pular o proxy).

Cena de teste dedicada: **http://localhost:9222/anim-lab.html** (`game/anim-lab.html` + `src/devtools/animLab.ts`).

Jogo completo: abrir proxy `/`, no console do browser ou via MCP `run_js`: `__UAIDZIN__.skipToGame()`.

## Verificar funcionamento

```bash
cd game
npm run devtools:verify
```

Sobe preview/dev conforme script, conecta ao proxy 9222, valida bridge, árvore, skeleton, animações e operações básicas via protocolo MCP.

## Agentes configurados

| Cliente | Config |
|---------|--------|
| **Cursor** | `.cursor/mcp.json` |
| Claude Desktop / Windsurf / VS Code | copiar bloco de `mcpServers` da doc upstream; `cwd` = `game`, `DEV_PORT=5173` |

Não há MCP threejs no runtime do Cloud Agent até o IDE local carregar o `mcp.json`.

## Troubleshooting

| Problema | Ação |
|----------|------|
| Bridge not connected | Manter aba 9222 aberta; reiniciar `devtools:mcp` |
| Porta errada | `set_dev_port` ou `DEV_PORT=5173` |
| Sem mixer | Carregar personagem (skipToGame) ou anim-lab |
| Helpers falham | `window.THREE` — registrado em dev |
| `scene_export` falha | `window.GLTFExporter` — registrado em dev |

## Desconectar / remover

1. Desabilitar servidor em Cursor MCP UI.
2. Remover `.cursor/mcp.json` entry (opcional).
3. Remover `registerThreeDevTools` não é necessário para produção (tree-shaken fora do caminho dev).

## Limitações neste projeto

- **React Three Fiber:** não usado; ferramentas R3F/`gltf_to_r3f` são irrelevantes para runtime do jogo (úteis só se gerar código externo).
- **IK / retargeting:** pipeline Mixamo/Blender offline; MCP não substitui.
- **Câmera:** segue `GameCamera`; MCP deve usar câmera registrada, não pass interno do composer.
- **`run_js`:** execução arbitrária no browser — só dev local confiável.
- **Boot/login:** cena principal vazia até entrar no jogo; usar skipToGame ou anim-lab.

## Skill do agente

`.cursor/skills/threejs/SKILL.md` — fluxo INSPECT → MODIFY → VERIFY e convenções UAIDZIN.

## Referências

- [Tools (59)](https://github.com/DmitriyGolub/threejs-devtools-mcp/blob/main/docs/tools.md)
- [Cursor setup](https://github.com/DmitriyGolub/threejs-devtools-mcp/blob/main/docs/cursor-setup.md)
- [Advanced (animations, composer)](https://github.com/DmitriyGolub/threejs-devtools-mcp/blob/main/docs/advanced.md)
- Animações do jogo: `game/docs/ANIMATIONS.md`
