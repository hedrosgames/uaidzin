export const CITY_SURFACE_GLSL = `
float cityHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float cityNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(cityHash(cell), cityHash(cell + vec2(1.0, 0.0)), u.x),
    mix(cityHash(cell + vec2(0.0, 1.0)), cityHash(cell + vec2(1.0)), u.x), u.y);
}
float cityFbm(vec2 p) {
  return cityNoise(p) * 0.57 + cityNoise(p * 2.03 + 7.1) * 0.28
    + cityNoise(p * 4.07 + 19.3) * 0.15;
}
vec3 cityRelief(vec3 surfaceNormal, vec3 viewPosition, float height) {
  vec3 dx = dFdx(viewPosition);
  vec3 dy = dFdy(viewPosition);
  vec3 r1 = cross(dy, surfaceNormal);
  vec3 r2 = cross(surfaceNormal, dx);
  float determinant = dot(dx, r1);
  return normalize(abs(determinant) * surfaceNormal
    - sign(determinant) * (dFdx(height) * r1 + dFdy(height) * r2));
}
`;
