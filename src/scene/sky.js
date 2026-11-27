import { SEA_LEVEL } from '../world/time.js?v=reverie-10';
import { atmosphereSource } from './atmosphere.js?v=reverie-10';

export const fragmentSource = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution, uPointer, uDrift, uCloudOffset, uGalaxy;
uniform float uTime, uMotion;
uniform vec3 uRipple, uSun;
uniform vec4 uMoon, uWorld, uWeather, uWaves, uCosmos, uPhenomena, uSkyFlow, uCloudForm;
uniform vec4 uBand, uBandDetail, uGalaxyShape, uGalaxyPose;

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
float square(float x) { return x * x; }

// A different remote system is framed each night. NASA's observed galaxy
// classes inform these structures; this is artistic time, not rapid evolution
// of one real galaxy. All profiles have diffuse edges and no planetary limb.
vec3 distantGalaxy(vec2 p, float aspect) {
  float scale = uGalaxyPose.z * min(1.0, aspect / 0.85);
  vec2 center = vec2((uGalaxyPose.x - 0.5) * aspect, uGalaxyPose.y);
  center += vec2(uCosmos.z * 0.12, (uCosmos.y - 1.0) * 0.06);
  vec2 g = rotation(-uGalaxyShape.w - uGalaxy.y) * (p + uDrift * 0.15 - center) / scale;
  g.y /= uGalaxyPose.w;
  float r = length(g);
  // Do no galaxy texture work outside this small area of the sky.
  if (r >= 3.0) return vec3(0.0);
  float edge = 1.0 - smoothstep(2.2, 3.0, r);
  vec2 seed = uBandDetail.xy;
  float grain = noise(g * 21.0 + seed);
  float patches = noise(g * 4.5 + seed * 0.7);
  vec3 oldStars = vec3(0.46, 0.35, 0.23);
  vec3 youngStars = mix(vec3(0.14, 0.26, 0.34), vec3(0.24, 0.31, 0.39), uBandDetail.z);
  vec3 color = vec3(0.0);

  if (uGalaxyShape.x < 0.5) {
    // A flocculent or grand-design disk: young arms and an old central bulge.
    float a = atan(g.y, g.x + 0.00001);
    float phase = a * uGalaxyShape.y - log(r + 0.18) * uGalaxyShape.z;
    float sharpness = mix(3.0, 10.0, fract(seed.x * 0.17));
    float arms = pow(0.5 + 0.5 * cos(phase), sharpness);
    float dust = pow(0.5 + 0.5 * cos(phase + 0.62), 14.0) * smoothstep(0.18, 0.55, r);
    float disk = exp(-r * 1.6);
    color = youngStars * disk * (0.10 + arms * (0.50 + patches * 0.65)) * (1.0 - dust * 0.70);
    color += oldStars * exp(-r * 5.7) * 0.64;
  } else if (uGalaxyShape.x < 1.5) {
    // Arms begin at the ends of a resolved central stellar bar.
    float a = atan(g.y, g.x + 0.00001);
    float phase = a * 2.0 - log(max(r, 0.62) / 0.62) * uGalaxyShape.z;
    float arms = pow(0.5 + 0.5 * cos(phase), 6.0) * smoothstep(0.48, 0.78, r);
    float bar = exp(-g.y * g.y * 35.0 - g.x * g.x * 2.4);
    float dust = pow(0.5 + 0.5 * cos(phase + 0.48), 16.0) * smoothstep(0.55, 0.9, r);
    color = youngStars * exp(-r * 1.45) * arms * (0.68 + patches * 0.5) * (1.0 - dust * 0.68);
    color += oldStars * (bar * 0.47 + exp(-r * 6.0) * 0.25);
  } else if (uGalaxyShape.x < 2.5) {
    // Old stars form an elongated, softly declining envelope, with no arms.
    // Resolved grain keeps this a remote star cloud rather than a solid orb.
    float envelope = exp(-pow(r * 2.8, 0.78));
    float core = exp(-r * 6.5);
    color = mix(oldStars, vec3(0.29, 0.30, 0.29), smoothstep(0.0, 1.3, r));
    color *= (envelope * 0.80 + core * 0.20) * (0.66 + grain * 0.48);
  } else {
    // An irregular system: unequal off-center star-forming clumps, no disk.
    vec2 offset = vec2(0.50 + fract(seed.x * 0.13) * 0.34, 0.24);
    float cloudA = exp(-dot(g + offset, g + offset) * 2.2);
    float cloudB = exp(-dot(g - vec2(0.42, -0.35), g - vec2(0.42, -0.35)) * 4.2);
    float cloudC = exp(-dot(g - vec2(-0.10, 0.68), g - vec2(-0.10, 0.68)) * 5.5);
    float broken = smoothstep(0.20, 0.80, patches) * (0.54 + grain * 0.68);
    color = youngStars * (cloudA * 0.56 + cloudB * 0.89 + cloudC * 0.42) * broken;
    color += vec3(0.23, 0.14, 0.18) * cloudB * pow(max(grain - 0.48, 0.0) * 1.8, 3.0) * 0.45;
  }
  return color * edge * 0.76;
}

vec3 galacticSky(vec2 p, float aspect) {
  float angle = uGalaxy.x + uCosmos.x + uBand.x;
  vec2 q = rotation(-angle) * (p + uDrift + uPointer * vec2(0.010, 0.006) - vec2(0.0, uBand.w));
  float frequency = 1.7 + mod(uBandDetail.y, 3.0);
  float bend = sin(q.x * frequency + uBandDetail.x * 0.07) * uBand.z;
  bend += sin(q.x * frequency * 0.43 + uBandDetail.y) * uBand.z * 0.35;
  float spine = q.y - bend;
  vec2 flow = vec2(sin(uGalaxy.y) * 0.45, cos(uGalaxy.y) * 0.30);
  float dust = fbm(q * vec2(4.8, 8.0) + uBandDetail.xy + flow);
  float grain = noise(q * 49.0 + uBandDetail.xy + flow * 2.0 + dust * 2.0);
  float band = exp(-pow(abs(spine) / (uBand.y * uCosmos.y), 1.4));
  float lane = spine + (dust - 0.5) * uBand.y * 0.90;
  float rift = exp(-square(lane / (0.006 + uBand.y * 0.13)));
  float split = exp(-square((lane - uBand.y * 0.46) / 0.013)) * uBandDetail.w;
  float fragments = mix(1.0, 0.20 + smoothstep(0.18, 0.75, dust) * 0.80, uBandDetail.w);
  vec3 cool = vec3(0.12, 0.23, 0.29);
  vec3 warm = vec3(0.37, 0.28, 0.19);
  float tint = clamp(uBandDetail.z * 0.65 + smoothstep(-0.65, 0.70, q.x + uCosmos.z) * 0.50, 0.0, 1.0);
  vec3 stars = mix(cool, warm, tint);
  vec3 color = stars * band * (0.32 + dust) * (0.42 + grain * 0.72) * fragments;
  // Optical dust absorbs the starlight behind it; it is not emissive striping.
  color *= (1.0 - rift * 0.82) * (1.0 - split * 0.66);
  return color * 1.45 + distantGalaxy(p, aspect);
}
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
  float towardSun = exp(-square((p.x - sun.x) * 1.3));
  color = mix(color, vec3(0.52, 0.32, 0.38), dusk * square(h * (1.0 - h) * 4.0) * 0.28);
  color += vec3(0.78, 0.30, 0.12) * sunset * (0.25 + towardSun * 0.75);

  // Extended stellar structures share the stars' cloud and fog extinction.
  float stellarVisibility = night * (1.0 - smoothstep(0.65, 0.90, uWeather.x)) * (1.0 - smoothstep(0.42, 0.68, uWeather.y));
  if (stellarVisibility > 0.001) {
    color += galacticSky(p, aspect) * stellarVisibility;
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
  float cloudFlash = uSkyFlow.y * exp(-square((p.x - 0.36) * 2.4));
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
    float reflection = exp(-square((p.x - sunX) / (0.018 + depth * 0.88)));
    color += sunlight() * reflection * (crest * 0.7 + fine * 0.32) * exp(-depth * 4.0) * smoothstep(-0.08, 0.12, uSun.z);
    float moonX = (uMoon.x - 0.5) * aspect + (swell - 0.5) * depth * 0.5;
    float lunar = exp(-square((p.x - moonX) / (0.02 + depth * 0.75)));
    color += vec3(0.23, 0.29, 0.30) * lunar * (crest * 0.45 + fine * 0.15) * uWorld.y * max(0.0, sin(uMoon.w)) * (0.5 - 0.5 * cos(uMoon.z));
    color += vec3(0.32, 0.14, 0.055) * uWorld.z * exp(-depth * 4.0) * 0.25;
    if (uPhenomena.z > 0.001) {
      float bloom = noise(water * vec2(0.18, 0.09) + uSkyFlow.zw * 0.3);
      float livingFoam = (crest * 0.75 + fine * 0.65) * (0.12 + 0.88 * smoothstep(0.32, 0.67, bloom));
      color += vec3(0.015, 0.33, 0.48) * livingFoam * uPhenomena.z * smoothstep(0.012, 0.10, depth);
    }
    float age = uTime - uRipple.z;
    if (age >= 0.0 && age < 5.0) {
      vec2 center = vec2((uRipple.x - 0.5) * aspect, uRipple.y);
      float radius = length((p - center) * vec2(1.0, 1.7));
      float ring = max(sin((radius - age * 0.13) * 100.0), 0.0);
      float envelope = exp(-square((radius - age * 0.13) * 19.0)) * exp(-age * 1.1);
      color += mix(vec3(0.13, 0.22, 0.24), vec3(0.31, 0.45, 0.43), uWorld.x) * ring * envelope * 0.4;
    }
    color *= 0.45 + 0.55 * smoothstep(0.0, 0.15, uv.y);
    float mist = 1.0 - exp(-uWeather.y * 4.0 * exp(-depth * 10.0));
    color = mix(color, mix(vec3(0.07, 0.10, 0.13), vec3(0.60, 0.70, 0.72), uWorld.x), mist);
    color += mix(vec3(0.06, 0.11, 0.14), vec3(0.21, 0.36, 0.39), uWorld.x) * exp(-depth * 85.0);
  }
  float edge = square((uv.x - 0.5) * 1.35);
  color *= 1.0 - edge * 0.26;
  gl_FragColor = vec4(color, 1.0);
}
`;
