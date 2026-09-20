import {
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type WebGLProgramParametersWithUniforms,
} from "three";

const CACHE_KEY = "uaidzin-city-ground-v1";

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

export function makeCityFloorMaterial(halfSize: number): MeshStandardMaterial {
  const texture = new TextureLoader().load("/textures/city-floor.webp");
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.repeat.set(7, 7);
  const mat = new MeshStandardMaterial({ map: texture, roughness: 0.92, metalness: 0 });
  const edgeStart = halfSize * 0.58;
  const edgeEnd = halfSize * 0.97;

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
  float large = groundFbm( vGroundPos * 0.09 );
  float fine = groundFbm( vGroundPos * 0.55 + vec2( 11.0, 4.0 ) );
  float tone = mix( 0.72, 1.1, large ) * mix( 0.9, 1.06, fine );
  vec3 hue = mix( vec3( 0.93, 0.94, 1.02 ), vec3( 1.06, 1.0, 0.9 ), large );
  float edge = smoothstep( ${edgeStart.toFixed(2)}, ${edgeEnd.toFixed(2)}, max( abs( vGroundPos.x ), abs( vGroundPos.y ) ) );
  tone *= mix( 1.0, 0.62, edge );
  diffuseColor.rgb *= tone * hue;
}
`,
    );
  };
  mat.customProgramCacheKey = () => CACHE_KEY;
  return mat;
}
