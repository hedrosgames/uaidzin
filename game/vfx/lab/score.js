export const PALETTE = {
  physical: "#df9b55", holy: "#ffe6a0", fire: "#ff762c", ice: "#89dfff",
  lightning: "#d7b7ff", poison: "#a3d944", shadow: "#9564b7", earth: "#c59157",
  water: "#5ccce4", mixed: "#efd06b", leaf: "#79b98a", wind: "#cde7dc",
};

export const PRIMITIVES = new Set([
  "sigil", "wave", "slash", "claw", "arrow", "lance", "orb", "beam", "bolt",
  "embers", "shards", "dust", "leaves", "motes", "heal", "shield", "cage",
  "crown", "vortex", "rift", "crystal", "rock", "chain", "feather", "mark",
  "moon", "drain", "echo", "wolf", "bear", "tiger", "condor", "dragon", "titan",
]);

export function proposal(id, title, description, score) {
  const layers = score.split(" ").map((token) => {
    const [type, anchor = "t", delay = "0.2", size = "1", count = "1", tint] = token.split(":");
    if (!PRIMITIVES.has(type) || !["s", "t", "m"].includes(anchor)) {
      throw new Error(`Camada inválida: ${id}: ${token}`);
    }
    const layer = { type, anchor, delay: Number(delay), size: Number(size), count: Number(count), tint };
    if (![layer.delay, layer.size, layer.count].every(Number.isFinite) ||
      layer.delay < 0 || layer.size <= 0 || layer.count < 1 || layer.count > 80 ||
      (tint && !PALETTE[tint])) throw new Error(`Parâmetros inválidos: ${token}`);
    return layer;
  });
  const techniques = ["Three.js · geometria animada"];
  if (layers.some((l) => ["orb", "slash", "claw"].includes(l.type))) techniques.push("shader GLSL");
  if (layers.some((l) => ["embers", "dust", "motes", "heal", "shards", "leaves"].includes(l.type))) techniques.push("partículas instanciadas");
  if (layers.some((l) => ["embers", "dust", "motes", "heal"].includes(l.type))) techniques.push("CanvasTexture");
  return { id, title, description, layers, technique: techniques.join(" · ") };
}
