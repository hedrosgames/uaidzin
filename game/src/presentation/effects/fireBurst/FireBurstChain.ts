import { ConeGeometry, Group, MeshStandardMaterial, TorusGeometry, Vector3 } from "three";
import { createHelixCurve } from "../vfxKit/curveTrajectory";
import { LinkProjectile } from "../vfxKit/linkProjectile";
import { type FireBurstFlightSystems } from "./FireBurstParticleSystems";

export interface FireBurstChainResources {
  chainGeometry: TorusGeometry;
  chainMaterial: MeshStandardMaterial;
  tipGeometry: ConeGeometry;
  tipMaterial: MeshStandardMaterial;
}

export class FireBurstChain extends LinkProjectile {
  constructor(
    root: Group,
    resources: FireBurstChainResources,
    readonly systems: FireBurstFlightSystems,
    origin: Vector3,
    target: Vector3,
    phase: number,
    spacing: number,
    maxLinks: number,
  ) {
    super(
      root,
      {
        linkGeometry: resources.chainGeometry,
        linkMaterial: resources.chainMaterial,
        tipGeometry: resources.tipGeometry,
        tipMaterial: resources.tipMaterial,
      },
      createHelixCurve(origin, target, phase, {
        radiusFactor: 0.16 + Math.sin(phase * 1.7) * 0.025,
        radiusJitter: 0.012,
        maxRadius: 0.95,
        turns: 0.38,
        turnsJitter: 0.035,
        lateralFactor: 0.58,
        verticalFactor: 0.32,
        peak: 0.46,
      }),
      phase,
      systems.all,
      {
        objectName: "fire-burst-chain",
        tipName: "fire-burst-tip",
        spacing,
        maxLinks,
        spinSpeed: 24,
      },
    );
  }
}
