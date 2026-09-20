import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wireRoot = path.resolve(__dirname, "../visual/telas");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
};

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function wireUiPlugin(): Plugin {
  return {
    name: "uaidzin-wire-ui",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/wire")) return next();
        try {
          const raw = req.url.split("?")[0] || "/wire";
          let rel = decodeURIComponent(raw.replace(/^\/wire\/?/, "/"));
          if (rel === "/" || rel === "") rel = "/03-wire-paineis-cidade.html";
          const file = path.normalize(path.join(wireRoot, rel));
          if (!file.startsWith(wireRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            return next();
          }
          const ext = path.extname(file).toLowerCase();
          res.statusCode = 200;
          res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
          fs.createReadStream(file).pipe(res);
        } catch {
          next();
        }
      });
    },
    closeBundle() {
      const out = path.resolve(__dirname, "dist/wire");
      if (!fs.existsSync(wireRoot)) {
        throw new Error(
          `UI não encontrada em ${wireRoot}. Essa pasta contém a interface do jogo (visual/telas) e o build não pode publicá-lo sem ela.`,
        );
      }
      copyDir(wireRoot, out);
    },
  };
}

export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 650,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
    watch: {
      ignored: [
        "**/scripts/_tk-work/**",
        "**/scripts/_char-work/**",
        "**/public/models/**",
      ],
    },
  },
  plugins: [wireUiPlugin()],
});
