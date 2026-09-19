# Plano — Builder HTML do GDD UAIDZIN

## Contexto

O GDD está em `UAIDZIN/` como 31 arquivos `.md` (`00` a `30`), em português, sem imagens e sem mermaid hoje. Estrutura consistente: `# UAIDZIN` → `## Título do capítulo` → seções `##`/`###`, listas (ordenadas e não ordenadas), uma tabela no índice e bloco de pendências em vários capítulos. Node disponível; sem dependências externas no builder (mesmo princípio do Bestiary).

Após pull de `origin/main` (`14d5f1c`), os capítulos 02, 09, 10, 12, 21 e 30 ganharam conteúdo (pilares de build/especialização/autofarm, 8 dungeons, árvores de skills, reset/glossário). O parser cobre o mesmo subconjunto; listas numeradas passaram a ser mais relevantes (00 e 28).

Fonte de verdade permanece o Markdown. O HTML é artefato gerado e recompilado a cada mudança de texto. Saída: **`GDD.html`** (não `index.html`).

## Objetivo

1. Script que lê todos os `.md` numéricos e gera um `GDD.html` único.
2. Layout: índice à esquerda (capítulos + seções), conteúdo à direita.
3. Recompilar quando qualquer `.md` mudar.
4. Saída autocontida: CSS, JS, imagens e diagramas embutidos no arquivo.

## Direção visual

- Âncora: documento de design de jogo — legível em sessão longa, tom técnico, não marketing.
- Paleta (dark):
  - fundo `#0f1218`
  - painel/sidebar `#161b24`
  - texto `#e8ecf2`
  - texto secundário `#9aa3b2`
  - acento âmbar `#d4a017` (progressão/loot)
  - borda `#2a3140`
  - destaque pendência `#c45c26`
- Tipografia: `Inter, Segoe UI, system-ui` no corpo; `ui-monospace, Consolas` em números de capítulo e códigos.
- Contraste alto no corpo; sidebar mais escura e compacta.
- Selo visual nas seções `Pendências` (borda esquerda âmbar/laranja) para achar rápido o que ainda está aberto.

## Arquitetura do builder

```
UAIDZIN/
  00-…30-….md          ← fonte (edite só aqui)
  assets/              ← imagens/SVGs referenciados nos MDs
  build/
    build.js           ← pipeline Node, zero deps
    style.css          ← layout e tema
    app.js             ← TOC, scroll-spy, busca, colapsar sidebar
  build.bat            ← wrapper Windows
  GDD.html             ← GERADO (não editar à mão)
  PLAN-builder.md      ← este plano
```

### Pipeline (`build/build.js`)

1. Lista `*.md` na raiz, ordena por prefixo numérico (`00`…`30`). Ignora `Teste.txt` e `PLAN-*`.
2. Para cada arquivo: extrai capítulo (`##` do título), seções (`##`/`###`).
3. Converte MD → HTML com parser próprio (sem marked):
   - headings `#`–`###` (geram `id` slug estáveis em pt-BR)
   - parágrafos, `**negrito**`, `*itálico*`, `` `code` ``
   - listas `-` e `1.`
   - tabelas GitHub (usadas no índice)
   - blocos cercados ` ``` `
   - links internos `[texto](02-….md#secao)` → âncoras no HTML gerado
4. Coleta `assets/` referenciados: `![alt](assets/...)` vira `<img>` com `src="data:...;base64,..."`.
5. Blocos ` ```mermaid ` → bloco de fallback + warning no build se não houver SVG equivalente em `assets/diagrams/`.
6. Monta shell: sidebar + main, injeta CSS/JS inline, embute os corpos.
7. Escreve `GDD.html` na raiz. Log: nº de capítulos, seções, assets embutidos, warnings.

### Layout do HTML gerado

```
┌─────────────┬────────────────────────────────┐
│ sidebar     │ main (scroll)                  │
│             │                                │
│ UAIDZIN     │ Visão Geral                    │
│ 01 Visão…   │ ── seções ──                   │
│ 02 Pilares… │ Core Gameplay                  │
│  …          │ ── seções ──                   │
│ 30 Glossário│ …                              │
└─────────────┴────────────────────────────────┘
```

- Sidebar fixa (~280px), scroll próprio, capítulos numerados, H2/H3 aninhados.
- `scroll-spy` com `IntersectionObserver`: item ativo com acento âmbar.
- Busca simples no topo da sidebar (filtra capítulos/seções).
- Âncoras profundas via `location.hash`.
- Responsivo: em telas estreitas, sidebar vira drawer com botão.
- Rodapé no main: data do build + contagem de capítulos.

### Comportamento de atualização

| Situação | Ação |
|---|---|
| Editou um `.md` | `node build/build.js` ou `build.bat` |
| Adicionou capítulo `31-….md` | entra sozinho na próxima compilação |
| Removeu um `.md` | sai do índice na próxima compilação |
| Adicionou imagem em `assets/` + `![…](assets/…)` no MD | embutida em base64 |
| Editou `GDD.html` à mão | será sobrescrito no próximo build |

## Passos de implementação

1. Criar `build/style.css` e `build/app.js`.
2. Escrever `build/build.js`.
3. Criar `build.bat`.
4. Criar pasta `assets/`.
5. Rodar o build e validar (capítulos, tabela, OL, H3, pendências, âncoras, arquivo único).
6. Abrir `GDD.html` e revisar visual.
7. Commit local de `UAIDZIN/` (sem push).

## Fora de escopo (v1)

- i18n / content JSON (padrão Bestiary) — UAIDZIN é só pt-BR nos `.md`.
- Watch automático.
- Export PDF.
- Servidor local.
- Render mermaid no build (fallback documentado).

## Verificação final

- `node build/build.js` completa sem erro.
- `GDD.html` abre offline e mostra todos os capítulos.
- Editar um `.md`, recompilar, confirmar que o texto novo aparece.
- Commit apenas da pasta `UAIDZIN/`.
