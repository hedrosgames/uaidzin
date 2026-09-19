import fs from 'fs';
import path from 'path';

const roots = [
  'C:/FelipeProjects/_privatedocuments/UAIDZIN/game/src',
  'C:/FelipeProjects/_privatedocuments/UAIDZIN/visual/telas',
];
const skipDir = new Set(['node_modules', 'dist']);
const exts = new Set(['.ts', '.js', '.css', '.html']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (skipDir.has(name)) continue;
    if (/\.(png|jpg|jpeg|webp|gif|ico)$/i.test(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (exts.has(path.extname(name))) out.push(p);
  }
  return out;
}

function stripCode(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let state = 'code';
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (state === 'code') {
      if (c === "'") { state = 'sq'; out += c; i++; continue; }
      if (c === '"') { state = 'dq'; out += c; i++; continue; }
      if (c === '`') { state = 'bq'; out += c; i++; continue; }
      if (c === '/' && c2 === '/' && src[i + 2] !== '/') { state = 'line'; i += 2; continue; }
      if (c === '/' && c2 === '*') { state = 'block'; i += 2; continue; }
      if (c === '/') {
        const prev = out.replace(/\s+$/, '');
        const last = prev[prev.length - 1];
        if (last && '=([,:;!&|?{;}\n'.includes(last)) {
          state = 'regex'; out += c; i++; continue;
        }
      }
      out += c; i++; continue;
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c; }
      i++; continue;
    }
    if (state === 'block') {
      if (c === '*' && c2 === '/') { state = 'code'; i += 2; continue; }
      if (c === '\n') out += c;
      i++; continue;
    }
    if (state === 'sq' || state === 'dq') {
      out += c;
      if (c === '\\') { out += c2 || ''; i += 2; continue; }
      if ((state === 'sq' && c === "'") || (state === 'dq' && c === '"')) state = 'code';
      i++; continue;
    }
    if (state === 'bq') {
      out += c;
      if (c === '\\') { out += c2 || ''; i += 2; continue; }
      if (c === '`') state = 'code';
      i++; continue;
    }
    if (state === 'regex') {
      out += c;
      if (c === '\\') { out += c2 || ''; i += 2; continue; }
      if (c === '/') state = 'code';
      i++; continue;
    }
    i++;
  }
  return out
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '');
}

function stripCss(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => (m.includes('\n') ? '\n' : ''));
}

function stripHtmlFile(src) {
  let s = src.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, a, css, b) => a + stripCss(css) + b);
  s = s.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, a, js, b) => {
    if (/\bsrc\s*=/.test(a)) return _;
    return a + stripCode(js) + b;
  });
  return s;
}

let changed = 0;
const files = [];
for (const r of roots) if (fs.existsSync(r)) files.push(...walk(r));

for (const f of files) {
  const ext = path.extname(f);
  const before = fs.readFileSync(f, 'utf8');
  let after;
  if (ext === '.html') after = stripHtmlFile(before);
  else if (ext === '.css') after = stripCss(before);
  else after = stripCode(before);
  if (after !== before) {
    fs.writeFileSync(f, after, 'utf8');
    changed++;
    console.log('ok', path.relative('C:/FelipeProjects/_privatedocuments/UAIDZIN', f));
  }
}
console.log('files changed', changed, 'of', files.length);
