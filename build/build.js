/**
 * Build do GDD UAIDZIN: MDs + visual/ -> GDD.html
 * Uso: node build/build.js | build.bat
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "GDD.html");
const VISUAL = path.join(ROOT, "visual");
const MANIFEST = path.join(VISUAL, "manifest.json");
const ASSETS = path.join(ROOT, "assets");
const warnings = [];

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(text) {
  const s = String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return s || "sec";
}

function uniqueSlug(base, used) {
  let s = base;
  let i = 2;
  while (used.has(s)) s = base + "-" + i++;
  used.add(s);
  return s;
}

// Capítulos que existem no repo mas não entram no documento publicado
const EXCLUDED_MD = new Set(["00-GDD-INDEX.md", "31-estilo-de-escrita.md", "32-auditoria-e-cobertura.md"]);

function loadVisualIndex() {
  const index = new Map();
  if (!fs.existsSync(MANIFEST)) {
    warnings.push("manifest visual ausente: visual/manifest.json");
    return index;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch (e) {
    warnings.push("manifest visual invalido: " + e.message);
    return index;
  }
  const items = data.items || [];
  items.forEach(function (item) {
    if (!item || !item.section || !item.file) return;
    const abs = path.join(VISUAL, item.file);
    if (!fs.existsSync(abs)) {
      warnings.push("SVG ausente: " + item.file + " (" + item.section + ")");
      return;
    }
    let svg = fs.readFileSync(abs, "utf8");
    // ensure single root absorbs width
    if (!/width=/.test(svg.split(">", 2)[0] || "")) {
      svg = svg.replace(/<svg([^>]*)>/, '<svg$1 width="100%" style="max-width:100%;display:block">');
    }
    index.set(item.section, {
      kind: item.kind || "diagram",
      title: item.title || "",
      source: item.source || "",
      svg: svg,
      hideBody: item.hideBody !== false,
      hideFollowingH3: !!item.hideFollowingH3,
    });
  });
  return index;
}

function visualFor(slug, visualIndex) {
  const item = visualIndex.get(slug);
  if (!item) return "";
  visualUsed += 1;
  const cap = item.title
    ? "<figcaption>" + esc(item.title) + (item.source ? " · " + esc(item.source) : "") + "</figcaption>"
    : "";
  return (
    '<figure class="viz" data-kind="' +
    esc(item.kind) +
    '">' +
    item.svg +
    cap +
    "</figure>"
  );
}

let visualUsed = 0;

function listMdFiles() {
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isFile() && /^\d{2}-.*\.md$/i.test(e.name) && !EXCLUDED_MD.has(e.name))
    .map((e) => e.name)
    .sort();
}

function mimeFor(ext) {
  const map = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
  };
  return map[String(ext).toLowerCase()] || "application/octet-stream";
}

function embedAsset(rel) {
  const cleaned = rel.split(/[?#]/)[0];
  const abs = path.resolve(ROOT, cleaned);
  const rootAbs = path.resolve(ROOT);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) {
    warnings.push("asset fora da pasta do GDD: " + rel);
    return null;
  }
  if (!fs.existsSync(abs)) {
    warnings.push("asset nao encontrado: " + rel);
    return null;
  }
  const buf = fs.readFileSync(abs);
  const mime = mimeFor(path.extname(abs));
  return "data:" + mime + ";base64," + buf.toString("base64");
}

function inlineMarkdown(text, ctx) {
  text = text.replace(/```([\w-]*)\n([\s\S]*?)```/g, function (_m, lang, code) {
    if (lang === "mermaid") {
      const diagramKey = slugify(code.split("\n")[0] || "diagrama");
      const svgPath = path.join(ASSETS, "diagrams", diagramKey + ".svg");
      if (fs.existsSync(svgPath)) {
        const svg = fs.readFileSync(svgPath, "utf8");
        return '<figure class="diagram">' + svg + "</figure>";
      }
      warnings.push("mermaid sem SVG em assets/diagrams/: " + diagramKey);
      return (
        '<div class="mermaid-fallback"><strong>Diagrama (mermaid)</strong>' +
        "<p>Compile o bloco para SVG em <code>assets/diagrams/" +
        esc(diagramKey) +
        ".svg</code> ou embuta a imagem no Markdown.</p><pre>" +
        esc(code) +
        "</pre></div>"
      );
    }
    return "<pre><code>" + esc(code) + "</code></pre>";
  });

  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (_m, alt, src, title) {
    let url = src;
    if (!/^(https?:|data:)/i.test(src)) {
      const embedded = embedAsset(src);
      if (!embedded) {
        warnings.push("imagem ignorada (inexistente): " + src);
        return "*[imagem faltando: " + esc(src) + "]*";
      }
      url = embedded;
    }
    const t = title ? ' title="' + esc(title) + '"' : "";
    return '<img src="' + url + '" alt="' + esc(alt) + '"' + t + ' loading="lazy">';
  });

  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_m, label, href) {
    if (/^(https?:|mailto:|#)/i.test(href)) {
      return '<a href="' + esc(href) + '">' + label + "</a>";
    }
    const m = href.match(/^(\d{2}-[^#\s]*\.md)(?:#(.+))?$/i);
    if (m && ctx.slugByFile[m[1].toLowerCase()]) {
      const chId = ctx.slugByFile[m[1].toLowerCase()];
      if (m[2]) {
        const sec = ctx.sectionIds[chId] && ctx.sectionIds[chId][slugify(m[2])];
        return '<a href="#' + (sec || chId) + '">' + label + "</a>";
      }
      return '<a href="#' + chId + '">' + label + "</a>";
    }
    return '<a href="' + esc(href) + '">' + label + "</a>";
  });

  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  return text;
}

function parseBlocks(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^```/.test(line)) {
      const buf = [line];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) buf.push(lines[i++]);
      blocks.push({ type: "raw", text: buf.join("\n") });
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      blocks.push({ type: "table", rows });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: buf.join("\n") });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^\|/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^```/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    if (buf.length) blocks.push({ type: "p", text: buf.join(" ").trim() });
  }
  return blocks;
}

function renderBlocks(blocks, ctx) {
  return blocks
    .map(function (b) {
      if (b.type === "raw") return inlineMarkdown(b.text, ctx);
      if (b.type === "p") return "<p>" + inlineMarkdown(b.text, ctx) + "</p>";
      if (b.type === "quote") return "<blockquote>" + inlineMarkdown(b.text, ctx) + "</blockquote>";
      if (b.type === "ul" || b.type === "ol") {
        const tag = b.type;
        return (
          "<" +
          tag +
          ">" +
          b.items
            .map(function (it) {
              return "<li>" + inlineMarkdown(it, ctx) + "</li>";
            })
            .join("") +
          "</" +
          tag +
          ">"
        );
      }
      if (b.type === "table") {
        const rows = b.rows.filter(function (r) {
          return !/^\|?\s*:?-{3,}/.test(r);
        });
        const parsed = rows.map(function (r) {
          return r
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map(function (c) {
              return c.trim();
            });
        });
        if (!parsed.length) return "";
        const head = parsed[0];
        const body = parsed.slice(1);
        return (
          '<div class="table-wrap"><table><thead><tr>' +
          head
            .map(function (c) {
              return "<th>" + inlineMarkdown(c, ctx) + "</th>";
            })
            .join("") +
          "</tr></thead><tbody>" +
          body
            .map(function (row) {
              return (
                "<tr>" +
                row
                  .map(function (c) {
                    return "<td>" + inlineMarkdown(c, ctx) + "</td>";
                  })
                  .join("") +
                "</tr>"
              );
            })
            .join("") +
          "</tbody></table></div>"
        );
      }
      return "";
    })
    .join("\n");
}

function extractSections(mdRaw, usedSlugs, chapterSlug) {
  const fences = [];
  const text = mdRaw.replace(/\r\n/g, "\n").replace(/```[\s\S]*?```/g, function (m) {
    fences.push(m);
    return "\n FENCE" + (fences.length - 1) + "\n";
  });
  const lines = text.split("\n");
  const titleMatch = mdRaw.match(/^##\s+(.+)$/m);
  const chapterTitle = titleMatch ? titleMatch[1].trim() : chapterSlug;
  let seenH1 = false;
  let seenChapterH2 = false;
  const sections = [];
  let current = null;
  function pushCurrent() {
    if (current) sections.push(current);
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const title = h[2].trim();
      if (level === 1 && !seenH1) {
        seenH1 = true;
        continue;
      }
      if (level === 2 && !seenChapterH2) {
        seenChapterH2 = true;
        continue;
      }
      if (level <= 3) {
        pushCurrent();
        const slug = uniqueSlug(chapterSlug + "--" + slugify(title), usedSlugs);
        current = {
          level: level,
          title: title,
          slug: slug,
          pending: /^pend[eê]ncias$/i.test(title),
          lines: [],
        };
        continue;
      }
    }
    if (current) current.lines.push(line);
  }
  pushCurrent();
  function restore(s) {
    return s.replace(/ FENCE(\d+)/g, function (_m, idx) {
      return fences[Number(idx)] || "";
    });
  }
  sections.forEach(function (sec) {
    sec.body = restore(sec.lines.join("\n"));
  });
  return { chapterTitle: chapterTitle, sections: sections };
}

function build() {
  const visualIndex = loadVisualIndex();
  const files = listMdFiles();
  if (!files.length) {
    console.error("Nenhum MD numerico encontrado em", ROOT);
    process.exit(1);
  }
  const usedSlugs = new Set();
  const chapters = [];
  const slugByFile = {};
  const sectionIds = {};
  let sectionCount = 0;

  files.forEach(function (file) {
    const num = file.slice(0, 2);
    const raw = fs.readFileSync(path.join(ROOT, file), "utf8");
    const chapterSlug = uniqueSlug("ch-" + num, usedSlugs);
    slugByFile[file.toLowerCase()] = chapterSlug;
    const extracted = extractSections(raw, usedSlugs, chapterSlug);
    const chapterTitle = extracted.chapterTitle;
    const sections = extracted.sections;
    sectionIds[chapterSlug] = {};
    sections.forEach(function (s) {
      sectionIds[chapterSlug][slugify(s.title)] = s.slug;
    });
    const ctx = { slugByFile: slugByFile, sectionIds: sectionIds };
    let hideRestH3 = false;
    const sectionHtml = sections
      .map(function (s) {
        sectionCount++;
        const item = visualIndex.get(s.slug);
        const viz = visualFor(s.slug, visualIndex);
        const cls = "section" + (s.pending ? " is-pending" : "");
        const hTag = s.level === 3 ? "h3" : "h2";
        let bodyHtml = renderBlocks(parseBlocks(s.body), ctx);
        if (item && item.hideBody && viz) {
          hideRestH3 = !!item.hideFollowingH3;
          bodyHtml = bodyHtml.trim() ? '<div class="viz-suppressed" hidden>' + bodyHtml + "</div>" : "";
        } else if (hideRestH3 && s.level === 3 && !viz) {
          // child steps already covered by the parent flow diagram
          bodyHtml = "";
        } else if (s.level === 2) {
          hideRestH3 = false;
        }
        return (
          '<section class="' + cls + '" id="' + s.slug + '"><' + hTag + ">" +
          esc(s.title) + "</" + hTag + ">\n" + viz + bodyHtml + "</section>"
        );
      })
      .join("\n");
    chapters.push({
      num: num,
      file: file,
      slug: chapterSlug,
      title: chapterTitle,
      sections: sections,
      html: sectionHtml,
    });
  });

  const assetsEmbedded = chapters.reduce(function (n, ch) {
    return n + (ch.html.match(/<img /g) || []).length;
  }, 0);

  const tocHtml = chapters
    .map(function (ch) {
      const searchBlob = [ch.num, ch.title]
        .concat(
          ch.sections.map(function (s) {
            return s.title;
          })
        )
        .join(" ");
      const items = ch.sections
        .map(function (s) {
          const sub = s.level === 3 ? " is-sub" : "";
          return (
            '<li><a class="' + sub.trim() + '" href="#' + s.slug + '" data-search="' +
            esc(s.title) + '">' + esc(s.title) + "</a></li>"
          );
        })
        .join("");
      return (
        '<div class="toc-chapter" data-target="' + ch.slug + '" data-search="' + esc(searchBlob) + '">' +
        '<button type="button" class="toc-chapter-btn">' +
        '<span class="toc-num">' + ch.num + "</span>" +
        '<span class="toc-label">' + esc(ch.title) + "</span>" +
        "</button>" +
        (items ? '<ul class="toc-sections">' + items + "</ul>" : "") +
        "</div>"
      );
    })
    .join("\n");

  const mainHtml = chapters
    .map(function (ch) {
      return (
        '<article class="chapter" id="' + ch.slug + '" data-file="' + esc(ch.file) + '">' +
        '<header class="chapter-head"><span class="chapter-num">' + ch.num +
        "</span><h1>" + esc(ch.title) + "</h1></header>\n" + ch.html + "</article>"
      );
    })
    .join("\n");

  const css =
    fs.readFileSync(path.join(__dirname, "style.css"), "utf8") +
    "\n/* viz v2 */\n.section .viz{margin:0 0 18px;padding:14px 12px 10px;border:1px solid var(--border);border-radius:10px;background:var(--panel);}\n" +
    ".section .viz svg{width:100%;height:auto;display:block;}\n" +
    ".section .viz figcaption{margin-top:10px;font-size:12px;color:var(--ink-2);font-family:var(--mono);line-height:1.4;}\n";
  const js = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

  const html =
    "<!DOCTYPE html>\n" +
    '<html lang="pt-BR">\n' +
    "<head>\n" +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta name="description" content="UAIDZIN — Documento de Design do Jogo">\n' +
    "<title>UAIDZIN — GDD</title>\n" +
    "<style>\n" + css + "\n</style>\n" +
    "</head>\n" +
    "<body>\n" +
    '<div class="overlay" id="overlay" hidden></div>\n' +
    '<div class="app">\n' +
    '  <aside class="sidebar" id="sidebar" aria-label="Índice do GDD">\n' +
    '    <div class="sidebar-head">\n' +
    '      <div class="brand">\n' +
    '        <span class="brand-mark">GDD</span>\n' +
    '        <div class="brand-title">UAIDZIN</div>\n' +
    "      </div>\n" +
    '      <div class="search-wrap">\n' +
    '        <svg class="search-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">\n' +
    '          <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/>\n' +
    '          <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>\n' +
    "        </svg>\n" +
    '        <input id="search" type="search" placeholder="Buscar no índice…  ( / )" autocomplete="off" spellcheck="false">\n' +
    "      </div>\n" +
    "    </div>\n" +
    '    <nav class="toc" id="toc">\n' +
    tocHtml + "\n" +
    '      <div class="toc-empty" id="toc-empty">Nenhum capítulo encontrado.</div>\n' +
    "    </nav>\n" +
    "  </aside>\n" +
    '  <main class="main" id="main">\n' +
    '    <div class="topbar">\n' +
    '      <button type="button" class="menu-btn" id="menu-btn" aria-label="Abrir índice">\n' +
    '        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">\n' +
    '          <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>\n' +
    "        </svg>\n" +
    "      </button>\n" +
    "      <strong>UAIDZIN — GDD</strong>\n" +
    "    </div>\n" +
    '    <header class="doc-header">\n' +
    '      <p class="doc-kicker">Documento de Design do Jogo</p>\n' +
    "      <h1>UAIDZIN</h1>\n" +
    "      <p>RPG de farm e autofarm 3D para navegador.</p>\n" +
    "    </header>\n" +
    mainHtml + "\n" +
    "  </main>\n" +
    "</div>\n" +
    "<script>\n" + js + "\n</script>\n" +
    "</body>\n" +
    "</html>\n";

  fs.writeFileSync(OUT, html, "utf8");
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(
    "GDD.html gerado: " +
      chapters.length +
      " capitulos, " +
      sectionCount +
      " secoes, " +
      visualUsed +
      " visual(is), " +
      kb +
      " KB"
  );
  if (warnings.length) {
    console.log("Avisos (" + warnings.length + "):");
    warnings.forEach(function (w) {
      console.log("  - " + w);
    });
  }
}

build();

