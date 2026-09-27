import { AmbientLight, BufferGeometry, Float32BufferAttribute, Group, Mesh, PlaneGeometry, Points, ShaderMaterial } from "three";
import { CITY_SURFACE_GLSL } from "../../world/CitySurface";
import { CEMETERY_PATH_GLSL } from "../../world/CemeteryGround";

export function createCemeteryAtmosphere() {
  const group = new Group();
  group.name = "cemetery-atmosphere";
  const time = { value: 0 };
  const mistMaterial = new ShaderMaterial({
    uniforms: { uTime: time },
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec2 vGround;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vGround = world.xz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,
    fragmentShader: `uniform float uTime;
varying vec2 vGround;
${CITY_SURFACE_GLSL}
${CEMETERY_PATH_GLSL}
void main() {
  float mist = cityFbm(vGround * 0.35 + vec2(uTime * 0.035, uTime * -0.02));
  float edge = 1.0 - smoothstep(13.5, 16.0, max(abs(vGround.x), abs(vGround.y)));
  float density = smoothstep(0.42, 0.7, mist) * edge * (1.0 - cemeteryPath(vGround) * 0.6);
  gl_FragColor = vec4(0.29, 0.34, 0.38, density * 0.035);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  const mistGeometry = new PlaneGeometry(32, 32);
  for (const height of [0.18, 0.32]) {
    const mist = new Mesh(mistGeometry, mistMaterial);
    mist.rotation.x = -Math.PI / 2;
    mist.position.y = height;
    mist.name = "cemetery-ground-mist";
    mist.userData.occlusionIgnore = true;
    mist.raycast = () => {};
    group.add(mist);
  }
  const ashGeometry = new BufferGeometry();
  const positions = new Float32Array(72 * 3);
  for (let i = 0; i < 72; i++) {
    positions[i * 3] = Math.sin(i * 127.1) * 15;
    positions[i * 3 + 1] = (i * 0.6180339 % 1) * 4;
    positions[i * 3 + 2] = Math.cos(i * 311.7) * 15;
  }
  ashGeometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const ashMaterial = new ShaderMaterial({
    uniforms: { uTime: time }, transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime;
void main() {
  vec3 p = position;
  p.y = mod(p.y - uTime * 0.06 + 100.0, 4.0);
  p.x += sin(uTime * 0.25 + position.z) * 0.3;
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = clamp(38.0 / -view.z, 1.0, 2.3);
}`,
    fragmentShader: `void main() {
  float alpha = 1.0 - smoothstep(0.12, 0.5, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(0.52, 0.54, 0.52, alpha * 0.38);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  const ash = new Points(ashGeometry, ashMaterial);
  ash.name = "cemetery-ash";
  ash.userData.occlusionIgnore = true;
  ash.raycast = () => {};
  group.add(ash);
  group.add(new AmbientLight(0x9cacc4, 0.23));
  return {
    group,
    update(dt: number) { time.value += dt; },
    dispose() {
      mistGeometry.dispose();
      mistMaterial.dispose();
      ashGeometry.dispose();
      ashMaterial.dispose();
    },
  };
}
