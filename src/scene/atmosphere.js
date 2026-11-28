import { SEA_LEVEL } from '../world/time.js?v=reverie-11';

// NOAA describes arcs, folded ray curtains and diffuse pulsating patches:
// https://www.swpc.noaa.gov/phenomena/aurora
// Oxygen supplies green/red light; nitrogen supplies blue/purple fringes:
// https://spaceplace.nasa.gov/aurora/en/
// These are restrained artistic emissions, drawn behind the lower clouds.
export const atmosphereSource = `
vec3 auroralLight(vec2 p) {
  // A night's identity is shared by every visitor and only changes in daylight.
  vec2 seed = uBandDetail.xy;
  float identity = hash(floor(seed * 3.0) + vec2(23.0, 71.0));
  float form = floor(identity * 4.0);
  float palette = hash(floor(seed * 5.0) + vec2(89.0, 13.0));
  float aspect = uResolution.x / uResolution.y;
  float x = p.x / aspect;
  // Sine/cosine clock components remain continuous across their wraparound.
  vec2 flow = uSkyFlow.zw;
  float drift = flow.x * 0.70 + flow.y * 0.45;
  float breathing = 0.78 + 0.22 * sin(seed.y + flow.x * 1.4 + flow.y);
  float expansion = smoothstep(0.025, 0.65, uPhenomena.x);
  vec3 oxygen = mix(vec3(0.075, 0.55, 0.24), vec3(0.055, 0.43, 0.47), palette);
  vec3 nitrogen = mix(vec3(0.22, 0.055, 0.42), vec3(0.40, 0.045, 0.22), palette);
  vec3 upperRed = vec3(0.40, 0.045, 0.070);
  float redStrength = mix(0.10, 0.76, smoothstep(0.38, 0.96, palette));
  vec3 light = vec3(0.0);

  for (int layer = 0; layer < 2; layer++) {
    float depth = float(layer);
    float phase = seed.x * 0.071 + depth * 2.3;
    float center = (hash(seed + depth + 41.0) - 0.5) * 0.48;
    float sx = x - center + depth * 0.12 + flow.y * 0.018;
    float slope = (hash(seed + depth + 9.0) - 0.5) * 0.20;
    float base = 0.43 + depth * 0.095 + sx * slope;
    float span = exp(-square(sx * (1.65 + depth * 0.55)));
    float strength = mix(0.78, 0.34, depth) * breathing;
    float height = (0.16 + hash(seed + depth + 57.0) * 0.15) * (0.58 + expansion * 0.42);

    if (form < 0.5) {
      // Quiet, long parallel arcs: curved bright edges and a faint upper veil.
      base += square(sx) * (0.24 + identity * 0.70);
      base += sin(sx * 5.0 + phase + drift) * 0.022;
    } else if (form < 1.5) {
      // Active folded curtains; large folds and fine rays move independently.
      base += sin(sx * 7.0 + phase + drift) * (0.025 + expansion * 0.039);
      base += sin(sx * 18.0 - phase + flow.y * 0.9) * (0.009 + expansion * 0.013);
    } else if (form < 2.5) {
      // An overhead view makes field-aligned rays converge toward a zenith.
      base += square(sx) * 0.18 + sin(sx * 4.0 + phase) * 0.018;
      height *= 1.5;
    } else {
      // Detached, slowly pulsating patches have no hard horizon-wide stripe.
      vec2 q = vec2(sx * 3.2, (p.y - 0.64 - depth * 0.07) * 6.0);
      float patches = noise(q * 1.6 + seed + flow * 0.17);
      patches += noise(q * 3.3 - seed + flow.yx * 0.23) * 0.32;
      float veil = smoothstep(0.40, 0.86, patches);
      veil *= exp(-square(sx * 2.7) - square((p.y - 0.64 - depth * 0.07) * 5.4));
      float pulse = 0.62 + 0.38 * sin(phase + flow.x * 2.4 + flow.y * 1.1);
      vec3 glow = mix(oxygen, nitrogen * 0.85, smoothstep(0.60, 0.88, p.y) * 0.75);
      glow += upperRed * smoothstep(0.63, 0.88, p.y) * redStrength;
      light += glow * veil * pulse * strength * 0.86;
      continue;
    }

    float y = p.y - base;
    float rayX = sx;
    float rayFrequency = 78.0 + identity * 37.0;
    float warpFrequency = 12.0;
    if (form > 1.5) {
      // Rounded positive depths keep both perspective and its slope continuous.
      // Unequal, softly grouped rays suggest a corona rather than a rigid grille.
      float perspective = sqrt(square(1.10 - p.y) + 0.034);
      float spread = sqrt(square(1.06 - p.y) + 0.018);
      rayX = sx / perspective;
      span *= exp(-square(sx / spread) * 0.65);
      rayFrequency = 38.0 + identity * 18.0;
      warpFrequency = 4.5 + depth * 0.8;
    }
    float warp = noise(vec2(rayX * warpFrequency + seed.x, seed.y + flow.x * 0.85));
    float rays = square(0.5 + 0.5 * sin(rayX * rayFrequency + warp * 7.0 + drift * 2.0));
    rays = mix(0.62 + rays * 0.38, 0.14 + rays * 0.86, smoothstep(0.2, 1.1, form));
    if (form > 1.5) rays *= 0.18 + smoothstep(0.12, 0.80, warp) * 0.82;
    float veil = smoothstep(-0.010, 0.023, y) * exp(-max(y, 0.0) / height);
    veil *= 1.0 - smoothstep(0.90, 1.05, p.y);
    float edge = exp(-square((y - 0.010) / 0.014));
    float lowerFringe = exp(-square((y + 0.003) / 0.009));
    float upperGlow = exp(-square((y - height * 0.85) / (height * 0.72)));
    vec3 glow = oxygen * (veil * rays * 0.76 + edge * 0.26);
    glow += nitrogen * lowerFringe * rays * (0.30 + palette * 0.35);
    glow += upperRed * upperGlow * rays * redStrength * 0.38;
    light += glow * span * strength;
  }
  return light * uPhenomena.x;
}

vec3 atmosphericLight(vec2 p) {
  vec3 color = vec3(0.0);
  if (uPhenomena.x > 0.001) {
    color += auroralLight(p);
  }
  if (uPhenomena.y > 0.001) {
    float warp = noise(vec2(p.x * 4.0 + uSkyFlow.w * 0.1, p.y * 9.0)) * 13.0;
    float ripples = pow(max(0.0, sin(p.y * 155.0 + p.x * 8.0 + warp + uSkyFlow.z)), 7.0);
    float veil = exp(-square((p.y - 0.39 - sin(p.x * 2.0) * 0.05) * 10.0));
    color += vec3(0.23, 0.40, 0.51) * ripples * veil * uPhenomena.y * 0.52;
  }
  return color;
}

vec3 rainbowLight(vec2 p, float aspect) {
  vec2 center = vec2((0.5 - uSun.x) * aspect, ${SEA_LEVEL} - sin(uSun.z) * 0.27);
  float radius = length(p - center);
  // Red lies on the outer edge of a primary bow; violet lies inside.
  vec3 spectrum = vec3(
    exp(-square((radius - 0.38) / 0.008)),
    exp(-square((radius - 0.37) / 0.008)),
    exp(-square((radius - 0.36) / 0.008))
  );
  return spectrum * uPhenomena.w * 0.16;
}
`;

const rainSeeds = Array.from({ length: 72 }, (_, index) => ({
  x: ((index * .61803398875) % 1),
  y: ((index * .41421356237) % 1),
  speed: .30 + (index % 7) * .037,
  depth: .4 + (index % 5) * .15,
}));
const mod = (x, n) => ((x % n) + n) % n;

export function drawRain(ctx, width, height, world, motion) {
  if (world.rain < .003) return;
  const length = Math.max(4, height * .013);
  const slant = (.10 + world.wind * .37) * length;
  ctx.save();
  ctx.lineWidth = .65;
  ctx.strokeStyle = `rgba(168, 193, 205, ${world.rain * (.10 + world.daylight * .15)})`;
  ctx.beginPath();
  for (const drop of rainSeeds) {
    const t = world.seconds * drop.speed * Math.max(.35, motion);
    const x = mod(drop.x + t * .07 + Math.sin(world.seconds / 90) * world.wind * .04, 1.1) * width;
    const y = mod(drop.y + t, 1.12) * height - length;
    ctx.moveTo(x, y);
    ctx.lineTo(x - slant * drop.depth, y - length * drop.depth);
  }
  ctx.stroke();
  ctx.restore();
}
