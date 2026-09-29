import { describe, expect, it } from "vitest";
import { Box3, BoxGeometry, Bone, Group, Mesh } from "three";
import { applyModelFit, fitModelToHeight, measureModel } from "./ModelFit";

function meshWithBonesAboveFeet(): Group {
  const root = new Group();
  const geo = new BoxGeometry(1, 2, 1);
  geo.translate(0, 1, 0);
  const mesh = new Mesh(geo);
  root.add(mesh);
  const hip = new Bone();
  hip.position.y = 1.2;
  const tip = new Bone();
  tip.position.y = 0.8;
  hip.add(tip);
  root.add(hip);
  return root;
}

describe("ModelFit", () => {
  it("usa a malha para minY mesmo com ossos mais altos", () => {
    const root = meshWithBonesAboveFeet();
    const fit = measureModel(root);
    expect(fit).not.toBeNull();
    expect(fit!.minY).toBeCloseTo(0, 3);
    expect(fit!.height).toBeGreaterThan(0.5);
  });

  it("assenta a malha no chão após applyModelFit", () => {
    const root = meshWithBonesAboveFeet();
    const fit = fitModelToHeight(root, 1.5);
    expect(fit).not.toBeNull();
    applyModelFit(root, fit!);
    const world = new Box3().setFromObject(root, false);
    expect(world.min.y).toBeCloseTo(0, 2);
    expect(world.max.y).toBeGreaterThan(1);
  });

  it("coloca patas abaixo dos ossos no chão", () => {
    const root = meshWithBonesAboveFeet();
    const before = measureModel(root)!;
    expect(before.minY).toBeLessThan(1.2);
    const fit = fitModelToHeight(root, 1.2)!;
    applyModelFit(root, fit);
    const world = new Box3().setFromObject(root, false);
    expect(world.min.y).toBeCloseTo(0, 2);
  });
});
