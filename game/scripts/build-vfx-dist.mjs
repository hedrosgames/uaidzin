import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gameDir = path.resolve(scriptDir, "..");
const localPack = process.argv.includes("--local-pack");
const result = spawnSync(
  process.execPath,
  [path.join(gameDir, "node_modules", "vite", "bin", "vite.js"), "build"],
  {
    cwd: gameDir,
    stdio: "inherit",
    env: {
      ...process.env,
      UAIDZIN_VFX_LOCAL_PACK: localPack ? "1" : "0",
    },
  },
);
process.exit(result.status ?? 1);
