import {
  BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  type IUniform,
  type WebGLProgramParametersWithUniforms,
} from "three";

type WaterUniforms = {
  uTime: IUniform<number>;
};

const CACHE_KEY = "uaidzin-fountain-water-v18";
const WATER_UV_CENTER = { u: 0.59, v: 0.75 };
const WATER_UV_INNER = 0.2;
const WATER_UV_OUTER = 0.245;

const WATER_GLSL = `
float waterHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float waterNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = waterHash(i);
  float b = waterHash(i + vec2(1.0, 0.0));
  float c = waterHash(i + vec2(0.0, 1.0));
  float d = waterHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float waterFbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * waterNoise(p);
    p = p * 2.05 + vec2(5.2, 1.7);
    a *= 0.5;
  }
  return v;
}
`;

function paintWaterMaskAttribute(mesh: Mesh): void {
  const geo = mesh.geometry;
  const uv = geo.getAttribute("uv");
  if (!uv) return;
  const data = new Float32Array(uv.count);
  for (let i = 0; i < uv.count; i++) {
    const du = uv.getX(i) - WATER_UV_CENTER.u;
    const dv = uv.getY(i) - WATER_UV_CENTER.v;
    const d = Math.hypot(du, dv);
    if (d <= WATER_UV_INNER) data[i] = 1;
    else if (d >= WATER_UV_OUTER) data[i] = 0;
    else data[i] = 1 - (d - WATER_UV_INNER) / (WATER_UV_OUTER - WATER_UV_INNER);
  }
  const attr = new BufferAttribute(data, 1);
  attr.needsUpdate = true;
  geo.setAttribute("aWaterMask", attr);
}

export class FountainWater {
  private readonly uniforms: WaterUniforms[] = [];
  private time = 0;
  private attached = false;

  attach(root: Object3D): void {
    if (this.attached) return;
    root.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const next: MeshStandardMaterial[] = [];
      for (const mat of mats) {
        if (!mat || !(mat instanceof MeshStandardMaterial)) continue;
        if (!mat.map) continue;
        paintWaterMaskAttribute(mesh);
        const cloned = mat.clone();
        this.hookMaterial(cloned);
        next.push(cloned);
      }
      if (next.length === 0) return;
      mesh.material = next.length === 1 ? next[0]! : next;
    });
    this.attached = this.uniforms.length > 0;
  }

  update(dt: number): void {
    if (!this.attached) return;
    this.time += dt;
    for (const u of this.uniforms) u.uTime.value = this.time;
  }

  dispose(): void {
    this.uniforms.length = 0;
    this.attached = false;
    this.time = 0;
  }

  private hookMaterial(mat: MeshStandardMaterial): void {
    const local: WaterUniforms = {
      uTime: { value: this.time },
    };
    this.uniforms.push(local);

    mat.roughness = 0.18;
    mat.metalness = 0.05;

    mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uTime = local.uTime;

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>
attribute float aWaterMask;
varying float vWaterMask;
`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vWaterMask = aWaterMask;
`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
varying float vWaterMask;
`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        `uniform float uTime;
${WATER_GLSL}
void main() {`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
#ifdef USE_MAP
  vec2 waterUv = vMapUv;
  float waterM = clamp(vWaterMask, 0.0, 1.0);
  vec2 flowA = vec2( uTime * 0.85, uTime * -0.62 );
  vec2 flowB = vec2( uTime * -0.7, uTime * 0.78 );
  float n1 = waterFbm( vMapUv * 11.0 + flowA );
  float n2 = waterFbm( vMapUv * 22.0 - flowB );
  float n3 = waterFbm( vMapUv * 38.0 + flowA.yx * 2.4 );
  float warp = waterM * ( 0.16 + 0.14 * n3 );
  waterUv += vec2( n1 - 0.5, n2 - 0.5 ) * warp;
  waterUv += vec2( n2 - 0.5, n3 - 0.5 ) * warp * 0.85;
  vec4 sampledDiffuseColor = texture2D( map, waterUv );
  float wave = sin( dot( vMapUv, vec2( 48.0, 36.0 ) ) - uTime * 7.2 + n1 * 8.0 );
  float wave2 = sin( dot( vMapUv, vec2( -28.0, 54.0 ) ) + uTime * 5.4 + n2 * 6.0 );
  float scroll = fract( vMapUv.x * 18.0 + vMapUv.y * 12.0 - uTime * 1.35 + n1 * 0.8 );
  float foamLane = smoothstep( 0.0, 0.12, scroll ) * smoothstep( 0.38, 0.18, scroll );
  float streak = waterNoise( vec2( vMapUv.x * 70.0 + uTime * 3.0, vMapUv.y * 7.0 - uTime * 2.1 ) );
  float crest = waterFbm( vMapUv * 14.0 + vec2( uTime * 2.0, -uTime * 1.55 ) );
  vec3 deep = vec3( 0.03, 0.14, 0.3 );
  vec3 mid = vec3( 0.1, 0.4, 0.6 );
  vec3 wet = mix( sampledDiffuseColor.rgb, mix( deep, mid, n1 ), waterM * 0.62 );
  wet += max( wave, 0.0 ) * waterM * vec3( 0.22, 0.38, 0.45 );
  wet -= max( -wave, 0.0 ) * waterM * vec3( 0.12, 0.16, 0.14 );
  wet += max( wave2, 0.0 ) * waterM * vec3( 0.14, 0.26, 0.32 );
  wet -= max( -wave2, 0.0 ) * waterM * vec3( 0.08, 0.11, 0.1 );
  float foam = clamp(
    foamLane * 0.75
    + smoothstep( 0.3, 0.55, crest ) * 0.7
    + smoothstep( 0.5, 0.75, streak ) * 0.9,
    0.0, 1.0
  ) * waterM;
  wet = mix( wet, vec3( 0.9, 0.97, 1.0 ), foam * 0.88 );
  float sparkle = smoothstep( 0.5, 0.88, n2 * 0.4 + n3 * 0.6 );
  wet += vec3( 0.4, 0.7, 0.9 ) * sparkle * waterM * 0.55;
  sampledDiffuseColor.rgb = wet;
  diffuseColor *= sampledDiffuseColor;
#endif
`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
{
  float waterM = clamp(vWaterMask, 0.0, 1.0);
  if ( waterM > 0.08 ) {
    vec3 nDir = normalize( normal );
    vec3 vDir = normalize( vViewPosition );
    float fres = pow( 1.0 - clamp( abs( dot( vDir, nDir ) ), 0.0, 1.0 ), 1.7 );
    float glint = waterFbm( vViewPosition.xy * 0.85 + vec2( uTime * 1.8, -uTime * 1.35 ) );
    float scrollE = fract( vMapUv.x * 18.0 + vMapUv.y * 12.0 - uTime * 1.35 );
    float foamLaneE = smoothstep( 0.0, 0.12, scrollE ) * smoothstep( 0.38, 0.18, scrollE );
    float streakE = waterNoise( vec2( vMapUv.x * 70.0 + uTime * 3.0, vMapUv.y * 7.0 - uTime * 2.1 ) );
    float crestE = waterFbm( vMapUv * 14.0 + vec2( uTime * 2.0, -uTime * 1.55 ) );
    float foamE = clamp( foamLaneE * 0.75 + smoothstep( 0.3, 0.55, crestE ) * 0.7 + smoothstep( 0.5, 0.75, streakE ) * 0.9, 0.0, 1.0 ) * waterM;
    totalEmissiveRadiance += vec3( 0.06, 0.16, 0.26 ) * waterM * ( fres * 0.85 + glint * 0.35 );
    totalEmissiveRadiance += vec3( 0.55, 0.78, 0.95 ) * foamE * 0.55;
  }
}
`,
      );
    };
    mat.customProgramCacheKey = () => CACHE_KEY;
    mat.needsUpdate = true;
  }
}
