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
        radiusFactor: 0.05 + Math.random() * 0.42,
        radiusJitter: 0.04,
        maxRadius: 2.8,
        turns: (Math.random() < 0.5 ? 1 : -1) * (0.15 + Math.random() * 1.7),
        turnsJitter: 0.15,
        lateralFactor: 0.25 + Math.random() * 1.05,
        verticalFactor: (Math.random() * 2 - 0.85) * (0.35 + Math.random() * 0.9),
        peak: 0.22 + Math.random() * 0.56,
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
