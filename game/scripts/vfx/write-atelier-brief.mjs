import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v1 } from "../../vfx/lab/proposals-v1.js";
import { v2 } from "../../vfx/lab/proposals-v2.js";
import { v3 } from "../../vfx/lab/proposals-v3.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const skills = JSON.parse(fs.readFileSync(path.join(root, "vfx/skills-manifest.json"), "utf8"));
const rows = [
  "# Atelier VFX — fichas autorais",
  "",
  "X7 · 96 skills × 3 conceitos. Estudos de VFX no lab; nenhuma alteração de balance ou comportamento do jogo.",
  "Fonte mecânica: manifest extraído diretamente de `CLASSES`. Fonte criativa: descrições autorais em `lab/proposals-v1.js`, `proposals-v2.js` e `proposals-v3.js`.",
  "Ordem de produção: V1 completa, V2 completa, V3 completa. O master original fornece apenas a estrutura de navegação. As receitas antigas e texturas de packs não alimentam estas propostas.",
  "Direção solicitada: cartoon estilizado de alto acabamento. Qualidade artística ainda depende da validação do Felipe; invocações usam silhuetas espectrais de estudo, não modelos finais de criaturas.",
  "Tempos, tamanhos e quantidades nas receitas são parâmetros visuais provisórios do laboratório, não números de balance. Passivas exibem um estudo de estado, nunca um cast real.",
  "Regenerar após editar as fontes: `node scripts/vfx/write-atelier-brief.mjs`.",
  "",
];
for (const [version, entries] of Object.entries({ V1:v1, V2:v2, V3:v3 })) {
  rows.push(`## ${version}`, "");
  let lastClass = "";
  for (const skill of skills) {
    const entry = entries.find((p) => p.id === skill.id);
    if (!entry) throw new Error(`Ficha ausente: ${skill.id} ${version}`);
    if (skill.classId !== lastClass) { rows.push(`### ${skill.className}`, ""); lastClass = skill.classId; }
    rows.push(`#### \`${skill.id}\` · ${skill.name} · ${entry.title}`, "",
      `- Origem: ${skill.treeLabel}, posição ${skill.tier}/8, tipo \`${skill.kind}\`, forma \`${skill.shape}\`, elemento \`${skill.element ?? "sem elemento"}\`.`,
      `- Descrição/prompt visual: ${entry.description}`,
      `- Técnica escolhida: ${entry.technique}.`,
      `- Sequência: ${entry.layers.map((l) => `${l.type} em ${l.delay}s (${l.anchor === "s" ? "origem" : l.anchor === "t" ? "alvo" : "percurso"})`).join(" → ")}.`,
      "");
  }
}
const output = rows.join("\n");
const file = path.join(root, "vfx/skills-vfx-brief.md");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(file, "utf8") !== output) throw new Error("Fichas desatualizadas.");
} else fs.writeFileSync(file, output);
