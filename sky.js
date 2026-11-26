import { SEA_LEVEL } from './world.js?v=reverie-3';
import { atmosphereSource } from './atmosphere.js?v=reverie-3';

export const fragmentSource = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution, uPointer, uDrift, uCloudOffset, uGalaxy;
uniform float uTime, uMotion;
uniform vec3 uRipple, uSun;
uniform vec4 uMoon, uWorld, uWeather, uWaves, uCosmos, uPhenomena, uSkyFlow, uCloudForm;

float hash(vec2 p) {
  vec2 cell = mod(p, 256.0);
  float n = mod(cell.x * 37.0 + cell.y * 57.0, 256.0);
  return mod(n * n * 17.0 + n * 131.0, 1021.0) / 1021.0;
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float value = 0.0, amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += noise(p) * amplitude;
    p = mat2(2.0, -1.0, 1.0, 2.0) * p + 13.0;
    amplitude *= 0.5;
  }
  return value;
}
mat2 rotation(float a) { return mat2(cos(a), sin(a), -sin(a), cos(a)); }
${atmosphereSource}
vec3 sunlight() {
  // Longer optical path at low solar altitude removes more short wavelengths.
  float mass = 1.0 / max(0.09, sin(max(uSun.z, 0.0)) + 0.08);
  return exp(-vec3(0.15, 0.32, 0.70) * mass * 0.22);
}
vec3 sky(vec2 p, float aspect) {
  float h = clamp((p.y - ${SEA_LEVEL}) / (1.0 - ${SEA_LEVEL}), 0.0, 1.0);
  float day = uWorld.x, night = uWorld.y, dusk = uWorld.z;
  vec2 sun = vec2((uSun.x - 0.5) * aspect, uSun.y);
  vec3 tint = sunlight();
  vec3 nightSky = mix(vec3(0.014, 0.032, 0.050), vec3(0.004, 0.010, 0.024), pow(h, 0.6));
  vec3 daySky = mix(vec3(0.66, 0.79, 0.84), vec3(0.075, 0.32, 0.59), pow(h, 0.48));
  vec3 color = mix(nightSky, daySky, day);
  float sunset = dusk * exp(-h * 3.1);
  float towardSun = exp(-pow((p.x - sun.x) * 1.3, 2.0));
  color = mix(color, vec3(0.52, 0.32, 0.38), dusk * pow(h * (1.0 - h) * 4.0, 2.0) * 0.28);
  color += vec3(0.78, 0.30, 0.12) * sunset * (0.25 + towardSun * 0.75);

  // A luminous stellar disk with dust lanes, not an image painted on the sky.
  float stellarVisibility = night * (1.0 - smoothstep(0.65, 0.90, uWeather.x)) * (1.0 - smoothstep(0.42, 0.68, uWeather.y));
  if (stellarVisibility > 0.001) {
  vec2 q = rotation(-uGalaxy.x - uCosmos.x) * (p + uDrift + uPointer * vec2(0.010, 0.006) - vec2(0.0, 0.52)) + vec2(0.0, 0.52);
  float spine = q.y - 0.48 - q.x * 0.42 - sin(q.x * 2.1 + uCosmos.z) * 0.045;
  vec2 flow = vec2(sin(uGalaxy.y) * 0.8, cos(uGalaxy.y) * 0.5);
  float dust = fbm(q * 6.0 + flow + vec2(7.0, 2.0));
  float grain = noise(q * 49.0 + flow * 2.0 + dust * 2.0);
  float band = exp(-pow(abs(spine + (dust - 0.5) * 0.13) * 7.7 / uCosmos.y, 1.4));
  float rift = 1.0 - smoothstep(0.008, 0.050, abs(spine + (dust - 0.5) * 0.11));
  vec3 stellar = mix(vec3(0.15, 0.27, 0.30), vec3(0.39, 0.30, 0.19), smoothstep(-0.45, 0.65, q.x + uCosmos.z));
  color += stellar * band * (0.3 + dust) * (0.4 + grain * 0.7) * (1.0 - rift * 0.73) * stellarVisibility * 1.4;

  // An original distant spiral: older warm core, cooler arms, differential flow.
  vec2 g = rotation(0.28 + uCosmos.x) * (q - vec2(0.40 + uCosmos.z, 0.74 + uCosmos.x * 0.3)) / uCosmos.y;
  g.y *= 2.8;
  float r = length(g);
  float a = atan(g.y, g.x);
  float arms = pow(0.5 + 0.5 * cos(a * 3.0 - log(r + 0.018) * (4.6 + uCosmos.w * 0.8) - uGalaxy.y), 7.0);
  float disk = exp(-r * 12.0);
  color += (vec3(0.11, 0.18, 0.22) * arms * disk * 0.55 + vec3(0.34, 0.28, 0.18) * exp(-r * 65.0) * 0.5) * stellarVisibility;
  }

  color += atmosphericLight(p);

  float sunDistance = length(p - sun);
  float sunVisible = smoothstep(-0.11, 0.01, uSun.z);
  color += tint * (exp(-sunDistance * 9.0) * 0.17 + exp(-sunDistance * 45.0) * 0.38) * sunVisible;
  color = mix(color, tint * 1.1, (1.0 - smoothstep(0.010, 0.012, sunDistance)) * sunVisible);

  vec2 moon = vec2((uMoon.x - 0.5) * aspect, uMoon.y);
  vec2 m = (p - moon) / 0.010;
  float mr = length(m);
  if (mr < 1.0 && uMoon.w > -0.02) {
    float z = sqrt(max(0.0, 1.0 - mr * mr));
    float lit = max(0.0, dot(vec3(m, z), vec3(sin(uMoon.z), 0.0, -cos(uMoon.z))));
    vec3 moonColor = vec3(0.68, 0.73, 0.71) * (0.07 + lit * 0.85);
    float lunarOpacity = (1.0 - smoothstep(0.89, 1.0, mr)) * (night * 0.94 + (1.0 - night) * lit * 0.34);
    color = mix(color, max(color, moonColor), lunarOpacity);
  }

  vec2 cloudUV = vec2(p.x / (h * 0.6 + 0.18), 1.0 / (h * 0.7 + 0.12)) * 1.4 * uCloudForm.xy + uCloudOffset;
  float body = fbm(cloudUV);
  float detail = noise(cloudUV * 3.0);
  float threshold = 0.76 - uWeather.x * 0.50;
  float clouds = smoothstep(threshold, threshold + uCloudForm.z, body + detail * 0.1) * smoothstep(0.0, 0.055, h);
  float shade = smoothstep(0.20, 0.75, body);
  vec3 cloudDay = mix(vec3(0.91, 0.92, 0.89), vec3(0.45, 0.53, 0.59), shade * (0.4 + uWeather.x * 0.6));
  cloudDay *= 0.86 + uCloudForm.w * 0.17;
  cloudDay += mix(vec3(-0.012, 0.004, 0.020), vec3(0.025, 0.012, -0.005), uCloudForm.w) * (1.0 - shade);
  vec3 cloudNight = mix(vec3(0.045, 0.065, 0.087), vec3(0.016, 0.030, 0.045), shade);
  cloudNight *= 0.88 + uCloudForm.w * 0.20 + max(0.0, sin(uMoon.w)) * (0.5 - 0.5 * cos(uMoon.z)) * 0.28;
  vec3 cloudColor = mix(cloudNight, cloudDay, day);
  cloudColor += tint * dusk * towardSun * (1.0 - shade) * 0.58;
  float cloudFlash = uSkyFlow.y * exp(-pow((p.x - 0.36) * 2.4, 2.0));
  cloudColor += vec3(0.40, 0.45, 0.57) * cloudFlash;
  color = mix(color, cloudColor, clouds * 0.95);
  if (uPhenomena.w > 0.001) color += rainbowLight(p, aspect) * (1.0 - clouds * 0.5);
  color *= 1.0 - uWeather.x * day * 0.10;

  // Receding headlands share the sky's light and disappear into moist air.
  float hill = ${SEA_LEVEL} + 0.012 + noise(vec2(p.x * 3.5 + 28.0, 9.0)) * 0.025 + noise(vec2(p.x * 11.0, 4.0)) * 0.014;
  hill *= 0.99 + sin(p.x * 2.1) * 0.01;
  float land = (1.0 - smoothstep(hill - 0.001, hill + 0.001, p.y)) * smoothstep(-0.12, 0.35, p.x);
  vec3 mountain = mix(vec3(0.012, 0.027, 0.039), vec3(0.30, 0.45, 0.47), day);
  color = mix(color, mountain, land * 0.75);
  float mist = 1.0 - exp(-uWeather.y * 5.0 * exp(-h * 8.0) * (0.75 + detail * 0.25));
  vec3 mistColor = mix(vec3(0.075, 0.105, 0.13), vec3(0.64, 0.72, 0.73), day);
  mistColor += tint * dusk * 0.12;
  return mix(color, mistColor, mist * 0.92);
}
void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
  float horizon = ${SEA_LEVEL};
  vec3 color;
  if (uv.y >= horizon) color = sky(p, aspect);
  else {
    float depth = horizon - uv.y;
    vec2 water = vec2(p.x * 3.2 / (depth + 0.075), 0.65 / (depth + 0.028));
    float swell = noise(water * vec2(0.55, 0.24) + uWaves.xy * vec2(1.4, 1.1));
    float small = noise(water * vec2(1.7, 0.8) + uWaves.zw * 0.9);
    float angle = water.y * 2.1 + swell * 5.8 + (sin(water.x * 0.7) * uWaves.y + cos(water.x * 0.7) * uWaves.x) * 0.55;
    float wave = sin(angle) * uWaves.y - cos(angle) * uWaves.x;
    float crest = pow(max(wave, 0.0), 15.0);
    float fineAngle = water.y * 5.3 + small * 5.0;
    float fine = pow(max(sin(fineAngle) * uWaves.w - cos(fineAngle) * uWaves.z, 0.0), 22.0);
    color = mix(vec3(0.008, 0.021, 0.033), vec3(0.085, 0.28, 0.32), uWorld.x);
    color += mix(vec3(0.05, 0.11, 0.15), vec3(0.12, 0.27, 0.30), uWorld.x) * (crest * 0.45 + fine * 0.18) * (0.65 + uWeather.z * 0.55) * (0.3 + uMotion * 0.7);
    float sunX = (uSun.x - 0.5) * aspect + (swell - 0.5) * depth * 0.7;
    float reflection = exp(-pow((p.x - sunX) / (0.018 + depth * 0.88), 2.0));
    color += sunlight() * reflection * (crest * 0.7 + fine * 0.32) * exp(-depth * 4.0) * smoothstep(-0.08, 0.12, uSun.z);
    float moonX = (uMoon.x - 0.5) * aspect + (swell - 0.5) * depth * 0.5;
    float lunar = exp(-pow((p.x - moonX) / (0.02 + depth * 0.75), 2.0));
    color += vec3(0.23, 0.29, 0.30) * lunar * (crest * 0.45 + fine * 0.15) * uWorld.y * max(0.0, sin(uMoon.w)) * (0.5 - 0.5 * cos(uMoon.z));
    color += vec3(0.32, 0.14, 0.055) * uWorld.z * exp(-depth * 4.0) * 0.25;
    if (uPhenomena.z > 0.001) {
      float bloom = noise(water * vec2(0.18, 0.09) + uSkyFlow.zw * 0.3);
      float livingFoam = (crest * 0.75 + fine * 0.65) * smoothstep(0.32, 0.67, bloom);
      color += vec3(0.015, 0.33, 0.48) * livingFoam * uPhenomena.z * smoothstep(0.012, 0.10, depth);
    }
    float age = uTime - uRipple.z;
    if (age >= 0.0 && age < 5.0) {
      vec2 center = vec2((uRipple.x - 0.5) * aspect, uRipple.y);
      float radius = length((p - center) * vec2(1.0, 1.7));
      float ring = max(sin((radius - age * 0.13) * 100.0), 0.0);
      float envelope = exp(-pow((radius - age * 0.13) * 19.0, 2.0)) * exp(-age * 1.1);
      color += mix(vec3(0.13, 0.22, 0.24), vec3(0.31, 0.45, 0.43), uWorld.x) * ring * envelope * 0.4;
    }
    color *= 0.45 + 0.55 * smoothstep(0.0, 0.15, uv.y);
    float mist = 1.0 - exp(-uWeather.y * 4.0 * exp(-depth * 10.0));
    color = mix(color, mix(vec3(0.07, 0.10, 0.13), vec3(0.60, 0.70, 0.72), uWorld.x), mist);
    color += mix(vec3(0.06, 0.11, 0.14), vec3(0.21, 0.36, 0.39), uWorld.x) * exp(-depth * 85.0);
  }
  float edge = pow(abs(uv.x - 0.5) * 1.35, 2.0);
  color *= 1.0 - edge * 0.26;
  gl_FragColor = vec4(color, 1.0);
}
`;
