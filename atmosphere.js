import { SEA_LEVEL } from './world.js?v=reverie-4';

// Upper-atmosphere light is drawn before the lower clouds, which obscure it.
// Green oxygen curtains, a violet lower fringe and a restrained red upper glow.
export const atmosphereSource = `
vec3 atmosphericLight(vec2 p) {
  vec3 color = vec3(0.0);
  if (uPhenomena.x > 0.001) {
    float fold = sin(p.x * 3.2 + uSkyFlow.z * 0.8) * 0.065;
    fold += noise(vec2(p.x * 5.0 + uSkyFlow.w * 0.3, 17.0)) * 0.10;
    float base = 0.43 + fold;
    float y = p.y - base;
    float veil = smoothstep(-0.012, 0.035, y) * exp(-max(y, 0.0) * 8.0);
    float rays = 0.30 + 0.70 * pow(0.5 + 0.5 * sin(p.x * 94.0 + noise(vec2(p.x * 16.0, uSkyFlow.z)) * 9.0 + uSkyFlow.w * 2.0), 2.0);
    float span = exp(-pow((p.x + 0.12) * 0.85, 2.0));
    color += vec3(0.08, 0.54, 0.29) * veil * rays * span;
    color += vec3(0.22, 0.055, 0.19) * exp(-pow((y + 0.002) * 95.0, 2.0)) * rays * span * 0.48;
    color += vec3(0.18, 0.035, 0.055) * exp(-pow((y - 0.20) * 9.0, 2.0)) * rays * span * 0.34;
    color *= uPhenomena.x;
  }
  if (uPhenomena.y > 0.001) {
    float warp = noise(vec2(p.x * 4.0 + uSkyFlow.w * 0.1, p.y * 9.0)) * 13.0;
    float ripples = pow(max(0.0, sin(p.y * 155.0 + p.x * 8.0 + warp + uSkyFlow.z)), 7.0);
    float veil = exp(-pow((p.y - 0.39 - sin(p.x * 2.0) * 0.05) * 10.0, 2.0));
    color += vec3(0.23, 0.40, 0.51) * ripples * veil * uPhenomena.y * 0.52;
  }
  return color;
}

vec3 rainbowLight(vec2 p, float aspect) {
  vec2 center = vec2((0.5 - uSun.x) * aspect, ${SEA_LEVEL} - sin(uSun.z) * 0.27);
  float radius = length(p - center);
  // Red lies on the outer edge of a primary bow; violet lies inside.
  vec3 spectrum = vec3(
    exp(-pow((radius - 0.38) / 0.008, 2.0)),
    exp(-pow((radius - 0.37) / 0.008, 2.0)),
    exp(-pow((radius - 0.36) / 0.008, 2.0))
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
