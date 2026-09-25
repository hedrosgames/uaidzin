const compositions = new Map();

export function registerSkillComposition(skillId, version, factory) {
  if (!skillId || !version || typeof factory !== "function") {
    throw new TypeError("registerSkillComposition(skillId, version, factory)");
  }
  let versions = compositions.get(skillId);
  if (!versions) {
    versions = new Map();
    compositions.set(skillId, versions);
  }
  versions.set(version, factory);
}

export function getSkillComposition(skillId, version) {
  return compositions.get(skillId)?.get(version);
}

export function listSkillCompositions() {
  return [...compositions.entries()].flatMap(([skillId, versions]) =>
    [...versions.keys()].map((version) => ({ skillId, version })),
  );
}

export function validateSkillCompositions(skillIds, version) {
  const expected = new Set(skillIds);
  const registered = listSkillCompositions().filter((entry) => entry.version === version);
  const missing = skillIds.filter((skillId) => !registered.some((entry) => entry.skillId === skillId));
  const unknown = registered.filter((entry) => !expected.has(entry.skillId)).map((entry) => entry.skillId);
  if (missing.length || unknown.length) {
    throw new Error(`Composições inválidas. Ausentes: ${missing.join(", ") || "nenhuma"}. Desconhecidas: ${unknown.join(", ") || "nenhuma"}.`);
  }
  return { total: registered.length, missing, unknown };
}
