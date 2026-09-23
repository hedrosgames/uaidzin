import {
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type WebGLProgramParametersWithUniforms,
} from "three";

const CACHE_KEY = "uaidzin-city-ground-v2";

const GROUND_GLSL = `
float groundHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float groundNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = groundHash(i);
  float b = groundHash(i + vec2(1.0, 0.0));
  float c = groundHash(i + vec2(0.0, 1.0));
  float d = groundHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float groundFbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * groundNoise(p);
    p = p * 2.1 + vec2(3.7, 1.3);
    a *= 0.5;
  }
  return v;
}
`;

export function makeCityFloorMaterial(halfSize: number, plazaRadius = 5.5): MeshStandardMaterial {
  const texture = new TextureLoader().load("/textures/city-floor.webp");
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.repeat.set(7, 7);
  const mat = new MeshStandardMaterial({ map: texture, roughness: 0.92, metalness: 0 });
  const edgeStart = halfSize * 0.58;
  const edgeEnd = halfSize * 0.97;
  const plazaInner = plazaRadius * 0.72;
  const plazaOuter = plazaRadius * 1.08;

  mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
varying vec2 vGroundPos;
`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <worldpos_vertex>",
      `#include <worldpos_vertex>
{
  vec4 gp = modelMatrix * vec4( transformed, 1.0 );
  vGroundPos = gp.xz;
}
`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
varying vec2 vGroundPos;
${GROUND_GLSL}
`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
{
  float r = length( vGroundPos );
  float plaza = 1.0 - smoothstep( ${plazaInner.toFixed(2)}, ${plazaOuter.toFixed(2)}, r );
  float large = groundFbm( vGroundPos * mix( 0.12, 0.07, plaza ) );
  float fine = groundFbm( vGroundPos * mix( 0.72, 0.42, plaza ) + vec2( 11.0, 4.0 ) );
  float tone = mix( 0.7, 1.08, large ) * mix( 0.88, 1.05, fine );
  vec3 hueOuter = mix( vec3( 0.9, 0.9, 0.96 ), vec3( 1.04, 0.98, 0.88 ), large );
  vec3 hueCenter = mix( vec3( 1.02, 0.98, 0.9 ), vec3( 1.12, 1.04, 0.86 ), large * 0.6 + 0.2 );
  vec3 hue = mix( hueOuter, hueCenter, plaza );
  tone *= mix( 1.0, 1.12, plaza );
  float edge = smoothstep( ${edgeStart.toFixed(2)}, ${edgeEnd.toFixed(2)}, max( abs( vGroundPos.x ), abs( vGroundPos.y ) ) );
  tone *= mix( 1.0, 0.62, edge * ( 1.0 - plaza * 0.85 ) );
  float ring = smoothstep( ${plazaInner.toFixed(2)}, ${plazaRadius.toFixed(2)}, r )
    * ( 1.0 - smoothstep( ${plazaRadius.toFixed(2)}, ${plazaOuter.toFixed(2)}, r ) );
  hue = mix( hue, vec3( 1.08, 1.0, 0.82 ), ring * 0.35 );
  diffuseColor.rgb *= tone * hue;
}
`,
    );
  };
  mat.customProgramCacheKey = () => CACHE_KEY;
  return mat;
}

export function makeCityPlazaMaterial(plazaRadius: number): MeshStandardMaterial {
  const texture = new TextureLoader().load("/textures/city-floor.webp");
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.repeat.set(3.2, 3.2);
  const mat = new MeshStandardMaterial({
    map: texture,
    roughness: 0.86,
    metalness: 0.02,
    color: 0xf0e6d0,
  });
  const inner = plazaRadius * 0.15;
  const mid = plazaRadius * 0.55;
  const outer = plazaRadius * 0.98;

  mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
varying vec2 vPlazaPos;
`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <worldpos_vertex>",
      `#include <worldpos_vertex>
{
  vec4 gp = modelMatrix * vec4( transformed, 1.0 );
  vPlazaPos = gp.xz;
}
`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
varying vec2 vPlazaPos;
${GROUND_GLSL}
`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
{
  float r = length( vPlazaPos );
  float large = groundFbm( vPlazaPos * 0.18 );
  float fine = groundFbm( vPlazaPos * 0.9 + vec2( 2.0, 7.0 ) );
  float tone = mix( 0.92, 1.14, large ) * mix( 0.94, 1.06, fine );
  float bowl = 1.0 - smoothstep( ${inner.toFixed(2)}, ${mid.toFixed(2)}, r );
  float rim = smoothstep( ${mid.toFixed(2)}, ${outer.toFixed(2)}, r );
  vec3 warm = vec3( 1.08, 1.0, 0.86 );
  vec3 cool = vec3( 0.94, 0.95, 1.02 );
  vec3 hue = mix( cool, warm, bowl * 0.7 + ( 1.0 - rim ) * 0.3 );
  tone *= mix( 1.08, 0.9, rim );
  diffuseColor.rgb *= tone * hue;
}
`,
    );
  };
  mat.customProgramCacheKey = () => `${CACHE_KEY}-plaza`;
  return mat;
}
