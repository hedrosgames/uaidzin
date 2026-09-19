import { MathUtils, PerspectiveCamera, Vector3 } from "three";

export class GameCamera {
  readonly camera: PerspectiveCamera;

  private readonly offset = new Vector3(8, 10, 12);
  private readonly lookAt = new Vector3();
  private readonly desired = new Vector3();
  private readonly currentLook = new Vector3(0, 0.5, 0);
  private readonly smooth = 6;

  constructor(aspect = 1) {
    this.camera = new PerspectiveCamera(50, aspect, 0.1, 200);
    this.camera.position.copy(this.offset);
    this.camera.lookAt(0, 0.5, 0);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  snapTo(x: number, z: number): void {
    this.lookAt.set(x, 0.5, z);
    this.desired.set(x + this.offset.x, this.offset.y, z + this.offset.z);
    this.camera.position.copy(this.desired);
    this.currentLook.copy(this.lookAt);
    this.camera.lookAt(this.currentLook);
  }

  follow(x: number, z: number, dt: number): void {
    this.desired.set(x + this.offset.x, this.offset.y, z + this.offset.z);
    this.lookAt.set(x, 0.5, z);
    const t = 1 - Math.exp(-this.smooth * dt);
    this.camera.position.lerp(this.desired, MathUtils.clamp(t, 0, 1));
    this.currentLook.lerp(this.lookAt, MathUtils.clamp(t, 0, 1));
    this.camera.lookAt(this.currentLook);
  }

  toWorldMove(screenX: number, screenZ: number): { x: number; z: number } {
    const len = Math.hypot(this.offset.x, this.offset.z);
    if (len < 1e-6) return { x: screenX, z: screenZ };
    const fx = -this.offset.x / len;
    const fz = -this.offset.z / len;
    const rx = -fz;
    const rz = fx;
    const along = -screenZ;
    return {
      x: screenX * rx + along * fx,
      z: screenX * rz + along * fz,
    };
  }
}
