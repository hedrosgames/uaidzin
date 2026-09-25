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
      createHelixCurve(origin, target, phase),
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
