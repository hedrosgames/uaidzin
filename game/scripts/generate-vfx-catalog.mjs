import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { v1 } from "../vfx/lab/proposals-v1.js";
import { v2 } from "../vfx/lab/proposals-v2.js";
import { v3 } from "../vfx/lab/proposals-v3.js";

const SKILL_PROPOSALS = { v1, v2, v3 };

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gameDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(gameDir, "..");
const planosRoot = path.join(repoRoot, "Planos", "VFX Skills");
const outputPath = path.join(gameDir, "vfx", "uaidzin_skill_catalog.js");
const moduleCache = new Map();

const DEFAULT_PALETTE = {
  primary: "#d4a017",
  secondary: "#c45c26",
  emissive: "#fff3cc",
};

const MOTIF_PALETTES = {
  fire: { primary: "#ff4500", secondary: "#ffa500", emissive: "#ffffff" },
  ice: { primary: "#38bdf8", secondary: "#0284c7", emissive: "#ffffff" },
  "moon-ray": { primary: "#60a5fa", secondary: "#1d4ed8", emissive: "#ffffff" },
  holy: { primary: "#f6dfae", secondary: "#d4a017", emissive: "#ffffff" },
  water: { primary: "#22d3ee", secondary: "#0284c7", emissive: "#e0f2fe" },
  earth: { primary: "#8c6239", secondary: "#d4a017", emissive: "#f4d080" },
  poison: { primary: "#22c55e", secondary: "#15803d", emissive: "#bbf7d0" },
  shadow: { primary: "#7c3aed", secondary: "#4c1d95", emissive: "#e9d5ff" },
  wind: { primary: "#94a3b8", secondary: "#64748b", emissive: "#e2e8f0" },
  arrow: { primary: "#c084fc", secondary: "#7e22ce", emissive: "#ffffff" },
  restoration: { primary: "#86efac", secondary: "#d4a017", emissive: "#ffffff" },
  physical: { primary: "#d4a017", secondary: "#c45c26", emissive: "#fff3cc" },
};

function walkMarkdownFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdownFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") out.push(full);
  }
  return out;
}

function parsePlanosBrief(markdown) {
  const direction = markdown.match(/Direção autoral:\s*\*\*([^*]+)\*\*\.\s*([^\n]+)/);
  const forma = markdown.match(/Forma-chave:\s*\*\*([^*]+)\*\*/);
  const sequence = markdown.match(/Sequência autoral inicial:\s*\*\*([^*]+)\*\*/);
  const heading = markdown.match(/^#\s+(.+?)\s+—/m);
  const bookDirection = markdown.match(/## DIREÇÃO VISUAL\r?\n\r?\n([^\r\n]+)/);
  const paletteBlock = markdown.match(/Paleta:\r?\n((?:- .+\r?\n)+)/);
  const paletteLabels = paletteBlock
    ? paletteBlock[1]
        .split(/\r?\n/)
        .map((line) => line.replace(/^- /, "").replace(/;$/, "").trim())
        .filter(Boolean)
    : [];
  return {
    artTitle: direction?.[1]?.trim() ?? heading?.[1]?.trim() ?? null,
    brief:
      (forma?.[1] ?? direction?.[2] ?? bookDirection?.[1] ?? "").trim() || null,
    sequence: sequence?.[1]?.replace(/\.\s*$/, "").trim() || null,
    paletteLabels,
  };
}

function loadPlanosBriefs() {
  const map = new Map();
  for (const file of walkMarkdownFiles(planosRoot)) {
    const id = path.basename(file, ".md");
    const parsed = parsePlanosBrief(fs.readFileSync(file, "utf8"));
    map.set(id, {
      ...parsed,
      relativePath: path.relative(planosRoot, file).split(path.sep).join("/"),
    });
  }
  return map;
}

const PLANOS_BRIEFS = loadPlanosBriefs();

function paletteFor(skill, motif) {
  return MOTIF_PALETTES[motif] ?? MOTIF_PALETTES[skill.element] ?? DEFAULT_PALETTE;
}

function timelineFromPlanos(brief, skill) {
  if (brief?.sequence) {
    return {
      cast: "Abertura conforme brief em Planos/VFX Skills.",
      action: brief.sequence,
      impact: "Impacto/estado no âncora mecânica correta.",
      fade: "Dissipação limpa sem emissão contínua.",
    };
  }
  return {
    cast: "Concentração do efeito no caster.",
    action: `Aplicação ${skill.kind}/${skill.shape}.`,
    impact: "Resposta visual no alvo ou na área.",
    fade: "Dissipação controlada dos elementos residuais.",
  };
}

function resolveTypeScriptModule(basePath) {
  const candidates = [basePath, `${basePath}.ts`, path.join(basePath, "index.ts")];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Módulo TypeScript não encontrado: ${basePath}`);
}

function loadTypeScriptModule(filePath) {
  const resolved = resolveTypeScriptModule(filePath);
  if (moduleCache.has(resolved)) return moduleCache.get(resolved);
  const source = fs.readFileSync(resolved, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: resolved,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    const message = errors
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
      .join("\n");
    throw new Error(`Falha ao carregar ${resolved}:\n${message}`);
  }
  const module = { exports: {} };
  moduleCache.set(resolved, module.exports);
  const localRequire = (specifier) => {
    if (!specifier.startsWith(".")) {
      throw new Error(`Import externo não suportado em ${resolved}: ${specifier}`);
    }
    const target = resolveTypeScriptModule(path.resolve(path.dirname(resolved), specifier));
    return loadTypeScriptModule(target);
  };
  const execute = new Function(
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
    result.outputText,
  );
  execute(localRequire, module, module.exports, resolved, path.dirname(resolved));
  moduleCache.set(resolved, module.exports);
  return module.exports;
}

const motifRules = [
  [/fire|flame|fogo|brasa|igne|queimadura/, "fire"],
  [/ice|frost|glacial|gelo|neve|nevasca/, "ice"],
  [/moon|raio|lightning|thunder|trov[aã]o/, "moon-ray"],
  [/holy|divin|sacrad|b[eê]n[cç]|julgamento|gra[cç]a|luz|c[eé]u|armor/, "holy"],
  [/water|[aá]gua|corrente/, "water"],
  [/earth|terra|rocha|esc[aâ]rpa|earthquake/, "earth"],
  [/poison|venen|pe[cç]onh/, "poison"],
  [/shadow|sombra|invis|furtiv/, "shadow"],
  [/dragon|drag[aã]o/, "dragon"],
  [/tiger|tigre/, "tiger"],
  [/bear|urso/, "bear"],
  [/wolf|lobo/, "wolf"],
  [/condor/, "condor"],
  [/summon|invoc|ex[eé]rcito|matilha|fera/, "beast"],
  [/arrow|flecha|tiro/, "arrow"],
  [/shield|escudo|muralha|armor/, "shield"],
  [/heal|cura|sustain|convers[aã]o|purifica/, "restoration"],
  [/trap|armadilha|presa|capture|marca|rede/, "snare"],
  [/speed|ligei|dodge|evas[aã]o|passo/, "wind"],
  [/taunt|provoc|desafio/, "taunt"],
  [/critical|crit|precis|mira/, "precision"],
  [/guard|guarda|defens|resist|postura|couro|anchor|[aâ]ncora/, "guard"],
];

function inferMotif(skill) {
  const value = `${skill.id} ${skill.name}`.toLocaleLowerCase("pt-BR");
  for (const [pattern, motif] of motifRules) {
    if (pattern.test(value)) return motif;
  }
  return skill.element ?? (skill.power === "magic" ? "arcane" : "physical");
}

function inferArchetype(skill) {
  if (skill.kind === "passive") return "passive";
  if (skill.kind === "heal") return "heal";
  if (skill.kind === "transform") return "transform";
  if (skill.kind === "summon") return "summon";
  if (skill.enemy?.tauntSec) return "taunt";
  if (skill.shape === "aoe") return "area";
  if (skill.shape === "line") return "line";
  if (skill.hits && skill.hits > 1) return "multi-hit";
  if (skill.id === "tk_fis_death_stab" || skill.id === "tk_mag_death_stab") return "pierce";
  if (skill.kind === "damage" && inferMotif(skill) === "arrow") return "arrow";
  if (skill.kind === "damage" && skill.power === "weapon") return "strike";
  if (skill.kind === "damage") return "projectile";
  return "buff";
}

function implementationState(skill) {
  if (skill.id === "tk_fis_fire_burst") return "integrated-experimental";
  if (skill.id === "tk_mag_moon_ray") return "runtime-reference-placeholder";
  if (skill.kind === "passive") return "passive-preview";
  return "concept";
}

function makeVersions(skillId) {
  const planos = PLANOS_BRIEFS.get(skillId);
  const definitions = [
    {
      id: "v1",
      name: "Direta",
      strategy: "Núcleo legível, trajetória única e impacto compacto.",
      trajectory: "linear",
      pattern: "single-core",
      impact: "single",
      density: "low",
    },
    {
      id: "v2",
      name: "Orbital",
      strategy: "Trilha dupla em arco, partículas satellite e dispersão no impacto.",
      trajectory: "arc",
      pattern: "orbital-pair",
      impact: "fan",
      density: "medium",
    },
    {
      id: "v3",
      name: "Ritual",
      strategy: "Carga previa, múltiplos eixos, sigilo no solo e impacto em três tempos.",
      trajectory: "curved-multi",
      pattern: "ritual-layered",
      impact: "shockwave",
      density: "high",
    },
  ];
  return definitions.map((definition) => {
    const proposal = SKILL_PROPOSALS[definition.id].find((entry) => entry.id === skillId);
    if (proposal) {
      return {
        ...definition,
        artTitle: proposal.title,
        brief: proposal.description,
        technique: proposal.technique,
        layers: proposal.layers,
      };
    }
    if (!planos?.brief && !planos?.artTitle) {
      throw new Error(`Brief VFX ausente para versão: ${skillId} ${definition.id}`);
    }
    return {
      ...definition,
      artTitle: planos.artTitle ?? skillId,
      brief: planos.brief ?? "Estudo visual do brief em Planos/VFX Skills.",
      technique: "Three.js · geometria animada · partículas instanciadas",
      layers: [],
    };
  });
}

const { CLASSES } = loadTypeScriptModule(
  path.join(gameDir, "src", "data", "classes", "class-definitions.ts"),
);

const classes = {};
const skills = [];

for (const [classId, classDef] of Object.entries(CLASSES)) {
  classes[classId] = {
    id: classId,
    name: classDef.name,
    treeOrder: classDef.treeOrder,
    treeLabels: classDef.treeLabels,
  };
  for (const tree of classDef.treeOrder) {
    const treeSkills = classDef.trees[tree];
    treeSkills.forEach((skill, index) => {
      const motif = inferMotif(skill);
      const archetype = inferArchetype(skill);
      skills.push({
        id: skill.id,
        name: skill.name,
        classId,
        className: classDef.name,
        tree,
        treeLabel: classDef.treeLabels[tree],
        index,
        kind: skill.kind,
        shape: skill.shape,
        auto: skill.auto,
        element: skill.element ?? null,
        power: skill.power,
        range: skill.range,
        radius: skill.radius ?? null,
        damageMultiplier: skill.damageMultiplier,
        cooldown: skill.cooldown,
        mp: skill.mp,
        maxTargets: skill.maxTargets ?? null,
        hits: skill.hits ?? null,
        pierce: skill.pierce ?? null,
        lifesteal: skill.lifesteal ?? null,
        healRatio: skill.healRatio ?? null,
        cleanse: skill.cleanse ?? false,
        executeBelow: skill.executeBelow ?? null,
        executeBonus: skill.executeBonus ?? null,
        buff: skill.buff ?? null,
        extraBuff: skill.extraBuff ?? null,
        enemy: skill.enemy ?? null,
        passive: skill.passive ?? null,
        summon: skill.summon ?? null,
        pack: skill.pack ?? null,
        transform: skill.transform ?? null,
        weaponAny: skill.weaponAny ?? null,
        description: null,
        visual: (() => {
          const planos = PLANOS_BRIEFS.get(skill.id);
          return {
            archetype,
            motif,
            state: implementationState(skill),
            artTitle: planos?.artTitle ?? skill.name,
            brief: planos?.brief ?? "Brief ausente em Planos/VFX Skills.",
            palette: paletteFor(skill, motif),
            timeline: timelineFromPlanos(planos, skill),
            sourceBrief: planos?.relativePath
              ? `Planos/VFX Skills/${planos.relativePath}`
              : `Planos/VFX Skills/${skill.id}.md`,
            versions: makeVersions(skill.id),
          };
        })(),
        gameplay: {
          projectile:
            skill.kind === "damage" &&
            skill.shape !== "aoe" &&
            (skill.power === "magic" || skill.range >= 5),
          impact: skill.kind === "damage",
          continuous: ["buff", "heal", "transform", "summon", "passive"].includes(skill.kind),
          area: skill.shape === "aoe",
          multiTarget: skill.shape === "line" || skill.kind === "summon" || Boolean(skill.pack),
        },
      });
    });
  }
}

const skillIds = new Set(skills.map((skill) => skill.id));
const missingPlanosIds = [...skillIds].filter((id) => !PLANOS_BRIEFS.has(id));
if (missingPlanosIds.length > 0) {
  throw new Error(`Brief VFX ausente em Planos/VFX Skills: ${missingPlanosIds.join(", ")}`);
}

const counts = {
  classes: Object.keys(classes).length,
  skills: skills.length,
  active: skills.filter((skill) => skill.kind !== "passive").length,
  passive: skills.filter((skill) => skill.kind === "passive").length,
  versions: skills.length * 3,
};

const catalog = {
  schemaVersion: 1,
  source: "game/src/data/classes/class-definitions.ts",
  visualSource: "Planos/VFX Skills",
  counts,
  classes,
  skills,
};

fs.writeFileSync(
  outputPath,
  `window.UAIDZIN_SKILL_CATALOG=${JSON.stringify(catalog)};\n`,
  "utf8",
);

console.log(
  `[vfx:catalog] ${counts.skills} skills, ${counts.active} ativas, ${counts.passive} passivas, ${counts.versions} versões -> ${outputPath}`,
);
