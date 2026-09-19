# UAIDZIN

RPG de farm/autofarm 3D para navegador (Three.js + Vite + TypeScript).

## Conteúdo

| Pasta / arquivo | O que é |
|---|---|
| `01`–`30` | GDD (fonte da prosa) |
| `plano de implementação/` | Fases e decisões de design |
| `game/` | Código do jogo |
| `GDD.html` | GDD visual gerado (`build.bat`) |
| `visual/` | Diagramas do GDD |

## Rodar o jogo

```powershell
cd game
npm install
npm run dev
```

`http://127.0.0.1:5173/`

```powershell
npm run smoke   # testes Playwright
npm run build   # produção em game/dist
```

## Rebuild do GDD.html

```powershell
build.bat
```

## Branch

`main` — código do jogo e documentação.
