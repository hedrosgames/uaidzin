import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as viteBuild, defineConfig, type Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = path.resolve(__dirname, "../tools/studio");
const vfxRoot = path.resolve(__dirname, "vfx");

const monstersJsonPath = path.resolve(__dirname, "src/data/monsters/monsters.json");
const dungeonsJsonPath = path.resolve(__dirname, "src/data/dungeons/dungeons.json");
const itemsJsonPath = path.resolve(__dirname, "src/data/items/items.json");
const npcsJsonPath = path.resolve(__dirname, "src/data/world/npcs.json");
const shopsJsonPath = path.resolve(__dirname, "src/data/balance/shops.json");
const composerJsonPath = path.resolve(__dirname, "src/data/composer/compose-recipes.json");
const weaponMountsJsonPath = path.resolve(__dirname, "src/data/weapons/weapon-mounts.json");

const modelsPublicRoot = path.resolve(__dirname, "public/models");
const persistenceRoot = path.resolve(__dirname, "src/persistence");
const bootStoreDir = path.resolve(__dirname, "public/boot/assets");

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

function findModels(dir: string, baseDir: string = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findModels(fullPath, baseDir));
    } else if (entry.isFile() && (entry.name.endsWith(".glb") || entry.name.endsWith(".gltf"))) {
      const rel = path.relative(path.resolve(baseDir, ".."), fullPath).replace(/\\/g, "/");
      results.push(`/${rel}`);
    }
  }
  return results;
}


function handleJsonEndpoint(
  req: { method?: string; on: (event: string, cb: (data?: unknown) => void) => void },
  res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (payload: string) => void },
  filePath: string,
  missingFallback?: unknown,
): boolean {
  if (req.method === "GET") {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(data);
    } catch {
      if (missingFallback !== undefined) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(missingFallback));
        return true;
      }
      res.statusCode = 500;
      res.end(JSON.stringify({ error: `Falha ao ler ${path.basename(filePath)}` }));
    }
    return true;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk: string | Buffer) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf-8");
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "JSON invalido" }));
      }
    });
    return true;
  }

  return false;
}

function devToolsPlugin(): Plugin {
  return {
    name: "uaidzin-dev-tools",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] || "";

        if (url === "/api/dev/monsters") {
          if (handleJsonEndpoint(req, res, monstersJsonPath)) return;
        }

        if (url === "/api/dev/dungeons") {
          if (handleJsonEndpoint(req, res, dungeonsJsonPath)) return;
        }

        if (url === "/api/dev/items") {
          if (handleJsonEndpoint(req, res, itemsJsonPath)) return;
        }

        if (url === "/api/dev/npcs") {
          if (handleJsonEndpoint(req, res, npcsJsonPath)) return;
        }

        if (url === "/api/dev/shops") {
          if (handleJsonEndpoint(req, res, shopsJsonPath)) return;
        }

        if (url === "/api/dev/composer") {
          if (handleJsonEndpoint(req, res, composerJsonPath)) return;
        }

        if (url === "/api/dev/weapon-mounts") {
          if (handleJsonEndpoint(req, res, weaponMountsJsonPath, { mounts: [] })) return;
        }

        if (url === "/api/dev/models" && req.method === "GET") {
          try {
            const models = findModels(modelsPublicRoot);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(models));
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Falha ao listar modelos" }));
          }
          return;
        }


        if (url.startsWith("/tools")) {
          try {
            let rel = decodeURIComponent(url.replace(/^\/tools\/?/, ""));
            const baseDir = studioRoot;
            if (rel === "" || rel === "/" || rel === "monsters" || rel === "dungeons" || rel === "items" || rel === "npcs" || rel === "composer" || rel === "studio") {
              rel = "index.html";
            }
            const file = path.normalize(path.join(baseDir, rel));
            if (!file.startsWith(baseDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
              return next();
            }
            const ext = path.extname(file).toLowerCase();
            res.statusCode = 200;
            res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
            fs.createReadStream(file).pipe(res);
          } catch {
            next();
          }
          return;
        }

        next();
      });
    },
  };
}


function buildBootStore(): Promise<unknown> {
  return viteBuild({
    root: __dirname,
    configFile: false,
    publicDir: false,
    logLevel: "warn",
    build: {
      outDir: bootStoreDir,
      target: "es2022",
      emptyOutDir: false,
      copyPublicDir: false,
      minify: false,
      sourcemap: false,
      lib: {
        entry: path.join(persistenceRoot, "bootEntry.ts"),
        formats: ["iife"],
        name: "UaidzinSaveBoot",
        fileName: () => "save-store.js",
      },
    },
  });
}

function bootStorePlugin(): Plugin {
  let command = "serve";
  return {
    name: "uaidzin-boot-store",
    config(_config, env) {
      command = env.command;
    },
    async configureServer(server) {
      await buildBootStore();
      server.watcher.on("change", (file) => {
        if (!path.resolve(file).startsWith(persistenceRoot)) return;
        buildBootStore().catch((err: unknown) => {
          server.config.logger.error(`[uaidzin-boot-store] falha ao gerar save-store.js: ${String(err)}`);
        });
      });
    },
    async buildStart() {
      if (command === "build") await buildBootStore();
    },
  };
}

function vfxStudioPlugin(): Plugin {
  return {
    name: "uaidzin-vfx-studio",
    closeBundle() {
      const out = path.resolve(__dirname, "dist/vfx");
      copyDir(path.join(vfxRoot, "libs"), path.join(out, "libs"));
      fs.copyFileSync(
        path.join(vfxRoot, "uaidzin_skill_catalog.js"),
        path.join(out, "uaidzin_skill_catalog.js"),
      );
      const localPack = process.env.UAIDZIN_VFX_LOCAL_PACK === "1";
      if (localPack) {
        fs.copyFileSync(
          path.join(vfxRoot, "uaidzin_vfx_data.js"),
          path.join(out, "uaidzin_vfx_data.js"),
        );
      } else {
        fs.writeFileSync(
          path.join(out, "uaidzin_vfx_data.js"),
          "window.CFXR_DATA=null;\n",
          "utf8",
        );
      }
      fs.writeFileSync(path.join(out, "cfxr_data.js"), "window.CFXR_DATA=null;\n", "utf8");
    },
  };
}

export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 650,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        tkGolpe: path.resolve(__dirname, "vfx/tk-golpe.html"),
        tkForceWave: path.resolve(__dirname, "vfx/tk-force-wave.html"),
        tkDeathStab: path.resolve(__dirname, "vfx/tk-death-stab.html"),
        tkInvestida: path.resolve(__dirname, "vfx/tk-investida.html"),
        tkCorte: path.resolve(__dirname, "vfx/tk-corte.html"),
        tkLaminaEnergia: path.resolve(__dirname, "vfx/tk-lamina-energia.html"),
        tkCampoGelo: path.resolve(__dirname, "vfx/tk-campo-gelo.html"),
        tkMachado: path.resolve(__dirname, "vfx/tk-machado.html"),
        tkQuebra: path.resolve(__dirname, "vfx/tk-quebra.html"),
        tkFuria: path.resolve(__dirname, "vfx/tk-furia.html"),
        tkAvalanche: path.resolve(__dirname, "vfx/tk-avalanche.html"),
        tkBencao: path.resolve(__dirname, "vfx/tk-bencao.html"),
        tkSelo: path.resolve(__dirname, "vfx/tk-selo.html"),
        tkAura: path.resolve(__dirname, "vfx/tk-aura.html"),
        tkEscudoSagrado: path.resolve(__dirname, "vfx/tk-escudo-sagrado.html"),
        tkJulgamento: path.resolve(__dirname, "vfx/tk-julgamento.html"),
        tkLuz: path.resolve(__dirname, "vfx/tk-luz.html"),
        tkPurificar: path.resolve(__dirname, "vfx/tk-purificar.html"),
        tkTribunal: path.resolve(__dirname, "vfx/tk-tribunal.html"),
        tkProvocacao: path.resolve(__dirname, "vfx/tk-provocacao.html"),
        tkPostura: path.resolve(__dirname, "vfx/tk-postura.html"),
        tkRugido: path.resolve(__dirname, "vfx/tk-rugido.html"),
        tkMuralha: path.resolve(__dirname, "vfx/tk-muralha.html"),
        tkAncora: path.resolve(__dirname, "vfx/tk-ancora.html"),
        tkDesafio: path.resolve(__dirname, "vfx/tk-desafio.html"),
        tkGuarda: path.resolve(__dirname, "vfx/tk-guarda.html"),
        tkBastiao: path.resolve(__dirname, "vfx/tk-bastiao.html"),
        fmEsferaIgnea: path.resolve(__dirname, "vfx/fm-esfera-ignea.html"),
        fmLancaGlacial: path.resolve(__dirname, "vfx/fm-lanca-glacial.html"),
        fmChoqueVital: path.resolve(__dirname, "vfx/fm-choque-vital.html"),
        skillCatalog: path.resolve(__dirname, "vfx/skill-catalog.html"),
        vfxLab: path.resolve(__dirname, "vfx/vfx_lab.html"),
        vfxMaster: path.resolve(__dirname, "vfx/vfx_master.html"),
      },
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
        "**/public/models/player/**",
        "**/public/models/city/**",
      ],
    },
  },
  plugins: [bootStorePlugin(), devToolsPlugin(), vfxStudioPlugin()],
});
