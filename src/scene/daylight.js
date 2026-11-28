import { SEA_LEVEL } from '../world/time.js?v=reverie-11';

// Layered cloud motion and restrained optical effects, informed by:
// https://www.weather.gov.sg/learn-optical-effects/
// Thin ice clouds favour halos; small, similarly sized droplets can diffract
// sunlight into local pastel fringes. This remains a fictional coastal view.
export const daylightSource = `
float headlandHeight(float x) {
  float hill = ${SEA_LEVEL} + 0.012 + noise(vec2(x * 3.5 + 28.0, 9.0)) * 0.025;
  hill += noise(vec2(x * 11.0, 4.0)) * 0.014;
  hill *= 0.99 + sin(x * 2.1) * 0.01;
  // The headland descends geometrically into the sea. Its material is opaque,
  // including its shallow left edge; distant haze is a colour, not transparency.
  return ${SEA_LEVEL} + max(hill - ${SEA_LEVEL}, 0.0) * smoothstep(-0.12, 0.35, x);
}
float headlandMask(vec2 p) {
  if (p.y > ${SEA_LEVEL} + 0.065) return 0.0;
  float pixel = max(0.00065, 0.70 / uResolution.y);
  return 1.0 - smoothstep(headlandHeight(p.x) - pixel, headlandHeight(p.x) + pixel, p.y);
}
float directSourceVisibility(vec2 source) {
  return smoothstep(-0.010, 0.013, source.y - headlandHeight(source.x));
}
float waterSourceVisibility(vec2 source, float depth) {
  // A foreground water patch sees a lower ridge angle than the distant water
  // at its foot. Do not switch the whole sea off when the observer loses the sun.
  float ridge = headlandHeight(source.x) - ${SEA_LEVEL};
  float distanceFactor = mix(1.0, 0.42, smoothstep(0.005, 0.18, depth));
  return smoothstep(-0.010, 0.012, source.y - ${SEA_LEVEL} - ridge * distanceFactor);
}
vec2 lowCloudCoordinates(vec2 p, float h) {
  return vec2(p.x / (h * 0.6 + 0.18), 1.0 / (h * 0.7 + 0.12)) * 1.4 * uCloudForm.xy + uCloudOffset;
}
vec2 highCloudLayer(vec2 p, float h) {
  // A separate, faster upper wind stretches translucent ice-cloud feathers.
  // Integer wind multipliers respect the wrapped, shared cloud clock.
  vec2 q = vec2(p.x * 2.2 + h * 0.6, h * 7.5 - p.x * 0.45);
  q += uCloudOffset * vec2(2.0, 1.0) + vec2(43.0, 18.0);
  float field = noise(q) * 0.66 + noise(q * 2.0 + 17.0) * 0.34;
  float feather = noise(q * vec2(2.0, 12.0) + field * 1.8);
  float ice = (0.20 + uWeather.w * 0.46) * (1.0 - smoothstep(0.58, 0.91, uWeather.x));
  float veil = smoothstep(0.43, 0.77, field) * (0.45 + feather * 0.55);
  veil *= ice * smoothstep(0.12, 0.34, h) * 0.63;
  return vec2(veil, feather);
}
vec3 daylightOptics(vec2 p, vec2 sun, float cirrus, vec3 tint) {
  if (uWorld.x < 0.005 || uSun.z < 0.025) return vec3(0.0);
  float clearAir = (1.0 - uWeather.y * 0.86) * (1.0 - uSkyFlow.x * 0.90);
  float broken = smoothstep(0.16, 0.34, uWeather.x) * (1.0 - smoothstep(0.58, 0.80, uWeather.x));
  vec2 fromSun = p - sun;
  float radius = length(fromSun);
  vec3 light = vec3(0.0);
  // Individual shafts fall through broken cloud, with a finite, local fan.
  if (broken > 0.001 && fromSun.y < 0.0 && radius < 0.70) {
    float a = atan(fromSun.x, -fromSun.y + 0.035);
    float gaps = noise(vec2(a * 12.0 + uCloudOffset.x, 31.0 + uCloudOffset.y));
    float rays = pow(smoothstep(0.43, 0.80, gaps), 2.0);
    float fan = exp(-square(a * 2.0)) * exp(-radius * 3.0);
    fan *= smoothstep(0.025, 0.095, radius) * (1.0 - smoothstep(0.51, 0.70, radius));
    light += tint * rays * fan * broken * 0.090;
  }
  // Twenty-two-degree halos are suggested by a soft, incomplete inner-red ring.
  // They favour a thin, humid veil instead of appearing on every clear day.
  float iceWeather = smoothstep(0.53, 0.83, uWeather.w) * (1.0 - smoothstep(0.44, 0.68, uWeather.x));
  iceWeather *= smoothstep(0.37, 0.68, uCloudForm.w);
  if (iceWeather > 0.001 && radius > 0.14 && radius < 0.25) {
    vec3 ring = vec3(exp(-square((radius - 0.186) / 0.0055)),
      exp(-square((radius - 0.190) / 0.0065)), exp(-square((radius - 0.194) / 0.0080)));
    float arc = 0.25 + min(cirrus * 4.5, 0.75);
    light += ring * iceWeather * arc * 0.070;
    float lowSun = 1.0 - smoothstep(0.35, 0.78, uSun.z);
    float sundog = exp(-square(fromSun.y / 0.014)) * exp(-square((abs(fromSun.x) - 0.190) / 0.018));
    light += vec3(0.14, 0.10, 0.065) * sundog * lowSun * iceWeather;
  }
  return light * uWorld.x * clearAir;
}
vec3 lunarHalo(vec2 p, vec2 moon) {
  if (uWorld.y < 0.01 || uMoon.w < 0.04) return vec3(0.0);
  float phase = 0.5 - 0.5 * cos(uMoon.z);
  float thinCloud = smoothstep(0.08, 0.25, uWeather.x) * (1.0 - smoothstep(0.50, 0.72, uWeather.x));
  float ice = smoothstep(0.57, 0.86, uWeather.w) * smoothstep(0.35, 0.70, uCloudForm.w);
  float ring = exp(-square((length(p - moon) - 0.185) / 0.0075));
  return vec3(0.25, 0.31, 0.34) * ring * phase * phase * thinCloud * ice * uWorld.y * (1.0 - uWeather.y) * 0.12;
}
float seaCloudShadow(vec2 p, float depth, float aspect) {
  if (uWorld.x < 0.005 || uWeather.x < 0.10) return 1.0;
  float projectedH = 0.15 + depth * 1.7;
  vec2 projected = vec2(p.x + (uSun.x - 0.5) * aspect * 0.25, 0.0);
  vec2 q = lowCloudCoordinates(projected, projectedH);
  float field = fbm(q) + noise(q * 3.0) * 0.10;
  float threshold = 0.76 - uWeather.x * 0.50;
  float cloud = smoothstep(threshold - 0.045, threshold + uCloudForm.z + 0.025, field);
  return 1.0 - cloud * uWorld.x * (0.18 + uWeather.x * 0.09);
}
`;
