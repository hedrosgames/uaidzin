import { describe, expect, it } from "vitest";
import { SAVE_VERSION } from "./SaveTypes";
import { migrateSave, normalizeBootCharacter, normalizeSavePayload } from "./migrations";

function rawSave(patch: Record<string, unknown> = {}) {
  return {
    saveVersion: 3,
    meta: { profileId: "admin:slot:0", userId: "admin", slotIndex: 0, updatedAt: 1 },
    character: {
      name: "Herói",
      classId: "TK",
      level: 3,
      evolution: "Mortal",
      xp: 10,
      unspentAttributePoints: 0,
      resetsInEvolution: 0,
      bonusAttributePoints: 0,
      attributes: { FOR: 8, DES: 5, CONS: 5, INT: 5 },
      hp: 40,
    },
    skills: {
      classId: "TK",
      levels: {},
      eighthTree: null,
      specialization: { controle: 0, magia: 0, fisica: 0 },
      skillPoints: 1,
      specPoints: 2,
    },
    inventory: { gold: 12, items: [] },
    ...patch,
  };
}

describe("normalizeSavePayload", () => {
  it("completa especialização parcial e mantém o ponto informado", () => {
    const out = migrateSave(
      rawSave({
        skills: {
          classId: "TK",
          levels: {},
          eighthTree: null,
          specialization: { fisica: 2 },
          skillPoints: 1,
          specPoints: 4,
        },
      }),
      "admin:slot:0",
    );
    expect(out).not.toBeNull();
    expect(out?.skills.specialization).toEqual({ controle: 0, magia: 0, fisica: 2 });
    expect(out?.skills.specPoints).toBe(4);
    expect(out?.saveVersion).toBe(SAVE_VERSION);
  });

  it("zera ouro NaN, Infinity e negativo", () => {
    for (const gold of [Number.NaN, Number.POSITIVE_INFINITY, -8]) {
      const out = normalizeSavePayload(rawSave({ inventory: { gold, items: [] } }), "admin:slot:0");
      expect(out.inventory.gold).toBe(0);
    }
  });

  it("troca classId inválido por TK", () => {
    const out = normalizeSavePayload(
      rawSave({
        character: {
          name: "Herói",
          classId: "XX",
          level: 1,
          evolution: "Mortal",
          attributes: { FOR: 5, DES: 5, CONS: 5, INT: 5 },
          hp: 100,
        },
        skills: { classId: "XX", specialization: {}, skillPoints: 0, specPoints: 0, levels: {} },
      }),
      "admin:slot:0",
    );
    expect(out.character.classId).toBe("TK");
    expect(out.skills.classId).toBe("TK");
  });

  it("preenche atributos ausentes com 5/5/5/5", () => {
    const out = normalizeSavePayload(
      rawSave({
        character: {
          name: "Herói",
          classId: "TK",
          level: 1,
          evolution: "Mortal",
          hp: 100,
        },
      }),
      "admin:slot:0",
    );
    expect(out.character.attributes).toEqual({ FOR: 5, DES: 5, CONS: 5, INT: 5 });
  });

  it("não deixa specPoints NaN", () => {
    const out = normalizeSavePayload(
      rawSave({
        skills: {
          classId: "TK",
          levels: {},
          eighthTree: null,
          specialization: { fisica: "nope" },
          skillPoints: Number.NaN,
          specPoints: Number.NaN,
        },
      }),
      "admin:slot:0",
    );
    expect(out.skills.specPoints).toBe(0);
    expect(out.skills.skillPoints).toBe(0);
    expect(out.skills.specialization.fisica).toBe(0);
    expect(Number.isFinite(out.skills.specialization.controle)).toBe(true);
  });
});

describe("normalizeSavePayload idempotente e base", () => {
  it("normalizar duas vezes dá o mesmo resultado", () => {
    const once = normalizeSavePayload(rawSave({ inventory: { gold: Number.NaN, items: [] } }), "admin:slot:0");
    const twice = normalizeSavePayload(once, "admin:slot:0");
    expect(twice).toEqual(once);
  });

  it("evolução inválida vira Mortal", () => {
    const out = normalizeSavePayload(
      rawSave({
        character: {
          name: "Herói",
          classId: "TK",
          level: 1,
          evolution: "Deus",
          attributes: { FOR: 5, DES: 5, CONS: 5, INT: 5 },
          hp: 100,
        },
      }),
      "admin:slot:0",
    );
    expect(out.character.evolution).toBe("Mortal");
  });

  it("atributo abaixo da base vira base", () => {
    const out = normalizeSavePayload(
      rawSave({
        character: {
          name: "Herói",
          classId: "TK",
          level: 1,
          evolution: "Mortal",
          attributes: { FOR: 0, DES: 3, CONS: 9, INT: -2 },
          hp: 100,
        },
      }),
      "admin:slot:0",
    );
    expect(out.character.attributes).toEqual({ FOR: 5, DES: 5, CONS: 9, INT: 5 });
  });
});

describe("normalizeBootCharacter", () => {
  it("ignora gold, level e attrs do boot", () => {
    const out = normalizeBootCharacter({
      id: "admin:slot:0",
      name: "Lab",
      classId: "TK",
      level: 999,
      gold: Number.POSITIVE_INFINITY,
      attrs: { FOR: 40, DES: 1, CONS: 1, INT: 1 },
    });
    expect(out).not.toBeNull();
    expect(out?.name).toBe("Lab");
    expect(out?.classId).toBe("TK");
    expect(out?.id).toBe("admin:slot:0");
    expect(out?.level).toBe(1);
    expect(out?.gold).toBe(0);
    expect(out?.attrs).toEqual({ FOR: 5, DES: 5, CONS: 5, INT: 5 });
  });

  it("ignora especialização, evolução e resets do boot", () => {
    const out = normalizeBootCharacter({
      id: "admin:slot:0",
      name: "Lab",
      classId: "TK",
      evolution: "Cele",
      resets: 9,
      spec: { fisica: 20 },
      trees: { magia: 3 },
    });
    expect(out?.evolution).toBe("Mortal");
    expect(out?.resets).toBe(0);
    expect(out?.spec).toEqual({ controle: 0, magia: 0, fisica: 0 });
    expect(out?.trees).toEqual({ controle: 0, magia: 0, fisica: 0 });
  });

  it("recusa classId inválido", () => {
    expect(normalizeBootCharacter({ id: "a", name: "Lab", classId: "XX", level: 1 })).toBeNull();
  });
});
