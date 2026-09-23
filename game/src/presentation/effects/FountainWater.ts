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

const CACHE_KEY = "uaidzin-fountain-water-v19";
const WATER_UV_CENTER = { u: 0.59, v: 0.75 };
const WATER_UV_INNER = 0.195;
const WATER_UV_OUTER = 0.255;

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

    mat.roughness = 0.12;
    mat.metalness = 0.08;

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
  vec2 flowA = vec2( uTime * 0.42, uTime * -0.28 );
  vec2 flowB = vec2( uTime * -0.34, uTime * 0.38 );
  float n1 = waterFbm( vMapUv * 8.5 + flowA );
  float n2 = waterFbm( vMapUv * 16.0 - flowB );
  float n3 = waterFbm( vMapUv * 28.0 + flowA.yx * 1.6 );
  float warp = waterM * ( 0.1 + 0.08 * n3 );
  waterUv += vec2( n1 - 0.5, n2 - 0.5 ) * warp;
  waterUv += vec2( n2 - 0.5, n3 - 0.5 ) * warp * 0.55;
  vec4 sampledDiffuseColor = texture2D( map, waterUv );
  float wave = sin( dot( vMapUv, vec2( 36.0, 28.0 ) ) - uTime * 4.2 + n1 * 5.0 );
  float wave2 = sin( dot( vMapUv, vec2( -22.0, 40.0 ) ) + uTime * 3.1 + n2 * 4.0 );
  float rim = smoothstep( 0.12, 0.55, waterM ) * ( 1.0 - smoothstep( 0.55, 0.95, waterM ) );
  float crest = waterFbm( vMapUv * 11.0 + vec2( uTime * 1.1, -uTime * 0.85 ) );
  vec3 deep = vec3( 0.05, 0.16, 0.28 );
  vec3 mid = vec3( 0.14, 0.38, 0.52 );
  vec3 shallow = vec3( 0.28, 0.52, 0.58 );
  vec3 wet = mix( sampledDiffuseColor.rgb, mix( deep, mid, n1 * 0.65 + 0.2 ), waterM * 0.72 );
  wet = mix( wet, shallow, rim * 0.45 );
  wet += max( wave, 0.0 ) * waterM * vec3( 0.14, 0.24, 0.28 );
  wet -= max( -wave, 0.0 ) * waterM * vec3( 0.08, 0.1, 0.09 );
  wet += max( wave2, 0.0 ) * waterM * vec3( 0.08, 0.14, 0.18 );
  float foam = clamp( rim * 0.55 + smoothstep( 0.42, 0.7, crest ) * 0.5, 0.0, 1.0 ) * waterM;
  wet = mix( wet, vec3( 0.82, 0.92, 0.98 ), foam * 0.55 );
  float sparkle = smoothstep( 0.62, 0.9, n2 * 0.35 + n3 * 0.65 );
  wet += vec3( 0.35, 0.55, 0.7 ) * sparkle * waterM * 0.28;
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
    float fres = pow( 1.0 - clamp( abs( dot( vDir, nDir ) ), 0.0, 1.0 ), 2.0 );
    float glint = waterFbm( vViewPosition.xy * 0.7 + vec2( uTime * 1.1, -uTime * 0.85 ) );
    float rimE = smoothstep( 0.12, 0.55, waterM ) * ( 1.0 - smoothstep( 0.55, 0.95, waterM ) );
    totalEmissiveRadiance += vec3( 0.04, 0.1, 0.16 ) * waterM * ( fres * 0.7 + glint * 0.22 );
    totalEmissiveRadiance += vec3( 0.35, 0.5, 0.62 ) * rimE * 0.22;
  }
}
`,
      );
    };
    mat.customProgramCacheKey = () => CACHE_KEY;
    mat.needsUpdate = true;
  }
}
