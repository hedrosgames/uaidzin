# UAIDZIN

RPG de farm/autofarm 3D para navegador (Three.js + Vite + TypeScript).

**Comece pelo [`INDEX.md`](INDEX.md)** — documentação ativa, execução e onde cada coisa está.  
Material antigo/concluído: [`backup/README.md`](backup/README.md).

## Resumo

| O quê | Onde |
|---|---|
| Regras de design (grill) | [`DECISOES-DESIGN.md`](DECISOES-DESIGN.md) |
| Plano + grill de execução | [`PLAN-DEV-GRILL.md`](PLAN-DEV-GRILL.md) |
| Tarefas abertas | [`TAREFAS-ABERTAS.md`](TAREFAS-ABERTAS.md) |
| Aceite por cena | [`CHECKLIST-CENAS.md`](CHECKLIST-CENAS.md) |
| GDD (prosa) | `00`–`32` + [`00-GDD-INDEX.md`](00-GDD-INDEX.md) |
| Código | [`game/`](game/) |
| UI / protótipos | [`visual/`](visual/) |
| Backup | [`backup/`](backup/) |

## Rodar o jogo

```powershell
cd game
npm install
npm run dev
```

`http://127.0.0.1:5173/`

```powershell
npm run typecheck
npm run smoke
npm run build
```

## GDD.html

```powershell
build.bat
```

## Idioma e regras

Prosa e respostas em **pt-BR**. Regras de código/UI em [`AGENTS.md`](AGENTS.md).  
Em conflito GDD × grill de design → **`DECISOES-DESIGN.md` prevalece**.
