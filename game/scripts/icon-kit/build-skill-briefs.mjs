import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const gameDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const result = await build({ entryPoints: [path.join(gameDir, "src/data/classes/class-definitions.ts")], bundle: true, write: false, format: "esm", platform: "node" });
const mod = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const skills = ["TK", "FM", "BM", "HT"].flatMap((classId) => {
  const def = mod.CLASSES[classId];
  return def.treeOrder.flatMap((tree) => def.trees[tree].map((skill, index) => ({ ...skill, classId, className: def.name, tree, tier: index + 1 })));
});
const element = { physical: "steel-white kinetic force", holy: "warm gold-white sacred radiance", fire: "ember orange and scarlet flame", ice: "glacial cyan frost", lightning: "electric cobalt and pale gold arcs", poison: "acid green venom", shadow: "deep violet shadow mist", earth: "ochre stone and dust", water: "clear turquoise water", mixed: "interwoven multicolor elemental energy" };
const stat = { attack: "a raised weapon wrapped in a focused attack aura", attackSpeed: "several overlapping weapon afterimages showing rapid strikes", defense: "a layered iron-and-gold protective ward", maxHp: "a glowing ruby heart enclosed by a protective ring", mpToHp: "blue mana streams transforming into red healing light", magicResist: "a luminous ward repelling arcane bolts", evasion: "a nimble silhouette slipping past a curved incoming strike", crit: "a precise bright impact point on a steel target", magicPower: "a brilliant arcane core intensifying into a spell aura", summonPower: "a commanding beast spirit surrounded by allied animal silhouettes", moveSpeed: "a swift figure leaving a clean wind trail", stealth: "a hunter fading into transparent dark-blue shimmer" };
const motifs = {
  tk_fis_atk_descuidado: "a reckless berserker blade breaking through a cracked guard, with a red attack flare and a visibly weakened shield",
  tk_fis_mestre_dual: "two crossed swords beside paired battle gauntlets, unmistakable dual-wield mastery",
  tk_fis_increase_critical: "a needle-point sword strike hitting the tiny glowing weak point of a steel target",
  tk_ctrl_taunt: "a stern knight shouting through a horn-shaped battle cry, nearby foes turning toward him",
  tk_ctrl_fear: "a terrified monster face recoiling from a dark spectral visage and spreading shadow ripples",
  tk_ctrl_parry: "a sword catching an incoming blade at a sharp deflection angle with bright metal sparks",
  tk_ctrl_divine_armor: "a knight inside a radiant golden plate armor shell deflecting dark damage shards",
  fm_fis_olho_falcao: "a hawk eye above a hunter silhouette sidestepping an incoming arrow",
  fm_fis_guarda_solida: "a firmly planted shield braced against a heavy descending hammer",
  fm_fis_mestre_arco: "an elegant longbow with a taut string and a sharp golden arrow, bow mastery emblem",
  fm_fis_ponto_critico: "a focused crosshair over one bright weak point on a distant armored target",
  fm_ctrl_purificacao: "a clear water droplet washing black corruption away from a ruby heart",
  fm_ctrl_bencao: "a holy hand placing a gold-edged blessing sigil on an iron shield",
  bm_fis_lobo_guerreiro: "a warrior silhouette becoming a muscular grey wolf under a crescent of leaves",
  bm_fis_ursao: "a tiny guardian bear growing into an enormous ancient bear silhouette",
  bm_fis_tita: "a beast master transforming into a towering primal titan with stone-and-leaf armor",
  bm_fis_presas_aco: "a pair of polished steel wolf fangs framing a focused critical strike spark",
  bm_ctrl_vinculo: "a luminous green bond connecting a beast paw and a warrior heart",
  ht_fis_pes_ligeiros: "light hunter footprints streaking around an incoming attack with a clean wind trail",
  ht_fis_instinto: "a lone hunter eye tracking one isolated prey silhouette through forest leaves",
  ht_ctrl_dodge: "a nimble hunter silhouette leaning past a clearly visible incoming spear",
  ht_ctrl_invisibilidade: "a hooded huntress fading into transparent midnight-blue shimmer, with one sharp eye remaining visible",
  ht_ctrl_roubo_vital: "a clean hunter strike drawing a thin crimson life thread from a target into a heart",
};
const animal = { condor: "a sweeping golden-feathered condor", lobo: "a lean silver wolf", urso: "a massive brown guardian bear", tigre: "a striped amber tiger", dragao: "a small emerald dragon", army: "a formation of primal animal spirits" };
const normalized = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
function visual(s) {
  if (s.id.startsWith("book_")) return { book_hp: "An open ivory spellbook releasing a vivid ruby heart and restorative red-gold light", book_gold: "An open dark leather spellbook with a cascading stream of bright gold coins", book_xp: "An open indigo spellbook releasing a rising blue-violet constellation of experience stars", book_cd: "An open bronze spellbook with a glowing hourglass and a circular arcane clock" }[s.id];
  const motif = normalized(s.name);
  if (s.kind === "summon") return `A sharply silhouetted ${animal[s.summon?.id] || animal.army} emerging from a carved primal summoning sigil; ${motif} motif, polished fantasy game icon, isolated object`;
  if (s.kind === "transform") return `A dramatic primal transformation emblem showing a distinct beast warrior silhouette, ${motif} motif, coiling nature energy and readable animal features, isolated fantasy game icon`;
  if (s.kind === "heal") return `A bright restorative spell focal object with a ruby heart and healing light, ${motif} motif, clear healing rays and a distinct silhouette, isolated fantasy game icon`;
  if (s.kind === "buff" || s.kind === "passive") {
    if (motifs[s.id]) return `A sharply readable ${normalized(s.name)} emblem showing ${motifs[s.id]}; crisp central silhouette, restrained magical glow, isolated fantasy game icon`;
    const effect = stat[s.buff?.stat || s.passive?.id] || "a focused magical enhancement aura";
    return `A distinct ${motif} emblem built around the actual effect: ${effect}; incorporate the skill name as a recognizable object or action motif, crisp readable silhouette, isolated fantasy game icon`;
  }
  const hue = element[s.element] || "bright arcane energy";
  const geometry = s.shape === "line" ? "a straight piercing beam crossing multiple small target silhouettes" : s.shape === "aoe" ? "a compact circular burst with several tiny enemy silhouettes around its edge" : "a focused projectile or blade striking one clear target";
  return `A vivid ${motif} spell icon, ${hue} forming ${geometry}; class ${s.classId} fantasy art direction, one strong central silhouette, isolated object, no frame`;
}
const output = skills.concat(mod.BOOK_SKILLS.map((skill) => ({ ...skill, classId: "BOOK", className: "Skill Books", tree: "books", tier: skill.index + 1 }))).map((s) => ({ id: s.id, name: s.name, category: "skills", visual: visual(s) }));
if (output.length !== 100 || new Set(output.map((s) => s.id)).size !== 100 || output.some((s) => !s.visual || s.visual.includes("undefined"))) throw new Error("Expected 100 unique complete skill briefs.");
const outDir = path.join(gameDir, "art/icon-kit");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "skill-briefs.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${output.length} specific skill briefs.`);
