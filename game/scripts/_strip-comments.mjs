import fs from "fs";
import path from "path";

const targetDirs = [path.resolve("src")];
const extensions = [".ts", ".js", ".mjs", ".css", ".html"];

function stripCommentsFromString(content, ext) {
  if (ext === ".html") {
    return content.replace(/<!--[\s\S]*?-->/g, "");
  }
  let result = "";
  let i = 0;
  const len = content.length;
  let inString = null;
  let inBlockComment = false;
  let inLineComment = false;

  while (i < len) {
    const char = content[i];
    const next = content[i + 1];

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        result += char;
      }
      i++;
      continue;
    }

    if (inString) {
      result += char;
      if (char === "\\" && i + 1 < len) {
        result += next;
        i += 2;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      i++;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      inString = char;
      result += char;
      i++;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }

    if (char === "/" && next === "/") {
      if (content.slice(i).startsWith("/// <reference")) {
        const nextNewline = content.indexOf("\n", i);
        if (nextNewline === -1) {
          result += content.slice(i);
          break;
        } else {
          result += content.slice(i, nextNewline + 1);
          i = nextNewline + 1;
          continue;
        }
      }
      inLineComment = true;
      i += 2;
      continue;
    }

    result += char;
    i++;
  }

  return result;
}

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        const orig = fs.readFileSync(full, "utf8");
        const stripped = stripCommentsFromString(orig, ext);
        if (stripped !== orig) {
          fs.writeFileSync(full, stripped, "utf8");
        }
      }
    }
  }
}

for (const dir of targetDirs) {
  processDir(dir);
}
