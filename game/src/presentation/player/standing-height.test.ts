import { describe, expect, it } from "vitest";
import { AnimationClip, Bone, Group, VectorKeyframeTrack } from "three";
import { PlayerView, type PlayerGltfLoader } from "./PlayerView";

describe("Calibração da altura das classes", () => {
  it.each(["TK", "FM", "BM", "HT"])("%s mantém a altura calculada ao animar", async (classId) => {
    const scene = new Group();
    const hips = new Bone();
    hips.name = "mixamorigHips";
    const head = new Bone();
    head.name = "mixamorigHead";
    head.position.set(0, 0.01, 1);
    hips.add(head);
    scene.add(hips);
    const idle = new AnimationClip("idle", 1, [
      new VectorKeyframeTrack("mixamorigHead.position", [0, 1], [0, 1, 0, 0, 1, 0]),
    ]);
    const loader: PlayerGltfLoader = {
      loadAsync: async (url) => url.includes(`/models/player/${classId}/`)
        ? { scene, animations: [idle] }
        : { scene: new Group(), animations: [new AnimationClip("external", 1, [])] },
    };
    const view = new PlayerView(loader);
    await view.load(classId);
    expect(head.position.y * scene.scale.y).toBeCloseTo(1.72 * 1.1);
    const fittedScale = scene.scale.clone();
    view.update(0.5);
    view.setPose(0, 0, 0, true);
    view.update(0.5);
    expect(scene.scale.equals(fittedScale)).toBe(true);
  });
});
