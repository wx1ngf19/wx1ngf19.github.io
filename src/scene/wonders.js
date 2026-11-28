// Deliberate, local approximations: a comet has a broad dust tail and a narrow
// anti-solar ion tail; the remote black hole bends a small patch of starlight.
// No ray marching or full-screen texture pass is needed for either visitor.
// https://science.nasa.gov/solar-system/comets/facts/
// https://science.nasa.gov/universe/black-holes/anatomy/
export const wonderSource = `
float wonderScale(float aspect) {
  return uWonderPose.z * min(1.0, aspect / 0.85);
}
vec2 wonderCenter(float aspect) {
  vec2 center = vec2((uWonderPose.x - 0.5) * aspect, uWonderPose.y);
  if (uWonder.x > 1.5 && uWonder.x < 2.5) {
    center += vec2(cos(uWonderPose.w), sin(uWonderPose.w)) * wonderScale(aspect) * (uWonder.w - 0.5) * 1.2;
  }
  return center;
}
float wonderOccultation(vec2 p, float aspect) {
  if (uWonder.x < 2.5 || uWonder.y < 0.001) return 0.0;
  float r = length(p - wonderCenter(aspect)) / max(wonderScale(aspect), 0.001);
  float growth = sqrt(uWonder.y);
  return 1.0 - smoothstep(0.43 * growth, 0.50 * growth, r);
}
vec3 deepSkyWonder(vec2 p, float aspect) {
  vec3 background = galacticSky(p, aspect);
  if (uWonder.y < 0.001 || uWonder.x < 1.5) return background;
  float scale = max(wonderScale(aspect), 0.001);
  vec2 center = wonderCenter(aspect);
  vec2 g = (p - center) / scale;
  float r = length(g);
  if (uWonder.x < 2.5) {
    vec2 sun = vec2((uSun.x - 0.5) * aspect, uSun.y);
    vec2 away = normalize(center - sun + vec2(0.0001));
    vec2 side = vec2(-away.y, away.x);
    float along = dot(g, away), across = dot(g, side);
    if (along < -0.3 || along > 3.2 || abs(across) > 1.3) return background;
    float tail = smoothstep(-0.025, 0.10, along) * (1.0 - smoothstep(1.8, 2.9, along));
    float curve = sin(uWonderPose.w + uWonder.z) * along * along * 0.032;
    float dustWidth = 0.036 + max(along, 0.0) * 0.083;
    float dust = exp(-square((across - curve) / dustWidth)) * exp(-max(along, 0.0) * 0.88) * tail;
    float ionWidth = 0.012 + max(along, 0.0) * 0.016;
    float ion = exp(-square(across / ionWidth)) * exp(-max(along, 0.0) * 0.64) * tail;
    float coma = exp(-r * 23.0), nucleus = exp(-square(r / 0.016));
    vec3 comet = vec3(0.36, 0.34, 0.25) * dust * 0.44;
    comet += vec3(0.12, 0.31, 0.43) * ion * 0.34;
    comet += vec3(0.55, 0.70, 0.67) * coma * 0.44 + vec3(0.86, 0.87, 0.76) * nucleus * 0.64;
    return background + comet * uWonder.y;
  }
  // A finite, gently joined lens avoids a visible boundary around the visitor.
  if (r > 3.4) return background;
  float extent = 1.0 - smoothstep(1.7, 3.4, r);
  float bending = 0.2304 / (r * r + 0.02) * extent;
  vec3 lensed = galacticSky(center + (p - center) * (1.0 - bending), aspect);
  background = mix(background, lensed, extent * uWonder.y);
  float growth = sqrt(uWonder.y);
  float shadow = 1.0 - smoothstep(0.43 * growth, 0.50 * growth, r);
  background *= 1.0 - shadow;

  vec2 disk = rotation(-uWonderPose.w) * g;
  float diskRadius = length(disk * vec2(1.0, 4.4));
  float azimuth = atan(disk.y * 4.4, disk.x + 0.00001);
  float flow = uWonder.w * 12.56637 + uWonder.z;
  float filaments = 0.76 + sin(azimuth * 7.0 - log(diskRadius + 0.1) * 9.0 + flow) * 0.16;
  filaments += sin(azimuth * 13.0 + diskRadius * 18.0 - flow * 0.7) * 0.08;
  float diskLight = exp(-square((diskRadius - 1.12) / 0.43)) * filaments;
  // Relativistic beaming is suggested by a brighter approaching side.
  float approaching = 0.34 + smoothstep(-1.1, 1.2, disk.x) * 0.66;
  diskLight *= approaching * smoothstep(0.46, 0.55, r);
  float farArc = exp(-square((r - 0.72) / 0.068)) * smoothstep(0.05, 0.40, disk.y);
  farArc *= 0.38 + smoothstep(-0.65, 0.65, disk.x) * 0.35;
  float photonRing = exp(-square((r - 0.535) / 0.018)) * (0.32 + approaching * 0.28);
  float heat = clamp(1.4 - diskRadius, 0.0, 1.0);
  vec3 outer = mix(vec3(0.48, 0.19, 0.075), vec3(0.26, 0.32, 0.39), fract(uWonder.z * 0.17) * 0.5);
  vec3 diskColor = mix(outer, vec3(0.83, 0.66, 0.39), heat);
  vec3 light = diskColor * diskLight * 0.76;
  light += vec3(0.65, 0.47, 0.25) * farArc * 0.48;
  light += vec3(0.81, 0.70, 0.49) * photonRing * 0.43;
  return background + light * uWonder.y;
}
`;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const ease = (low, high, value) => {
  const t = clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};
const randomAt = value => {
  const n = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};

export function createWonderLens(world, width, height) {
  const wonder = world.wonder;
  if (!wonder || wonder[0] !== 3 || wonder[1] < .001) return null;
  const [x, y, radius] = world.wonderPose || [0, 0, 0];
  if (!(radius > 0)) return null;
  return {
    x: x * width, y: (1 - y) * height,
    radius: radius * Math.min(1, width / height / .85) * height,
    strength: wonder[1],
    coreRadius: radius * Math.min(1, width / height / .85) * height * .43 * Math.sqrt(wonder[1]),
  };
}

// One output is reused for every star. The tangential stretch is small enough
// to retain point stars, growing into tiny arcs only beside the photon ring.
export function projectLensedStar(x, y, lens, output) {
  output[0] = x; output[1] = y; output[2] = 1; output[3] = 1; output[4] = 0;
  if (!lens || !(lens.radius > 0)) return;
  const dx = x - lens.x, dy = y - lens.y;
  const r = Math.hypot(dx, dy) / lens.radius;
  if (r > 3.4) return;
  const extent = 1 - ease(1.7, 3.4, r);
  const apparent = (r + Math.sqrt(r * r + .48 * .48 * 4)) * .5;
  const shift = (apparent - r) * lens.radius * lens.strength * extent;
  const angle = Math.atan2(dy, dx);
  output[0] += Math.cos(angle) * shift;
  output[1] += Math.sin(angle) * shift;
  const projectedRadius = r + shift / lens.radius;
  const growth = Math.sqrt(lens.strength);
  output[2] = ease(.43 * growth, .50 * growth, projectedRadius);
  output[3] = 1 + Math.exp(-(((projectedRadius - .61) / .24) ** 2)) * lens.strength * 1.6;
  output[4] = angle;
}

function meteor(context, width, height, world, cloudAt, x, y, tailX, tailY, opacity, radius) {
  if (y < 0 || y > height * .77 || x < 0 || x > width) return;
  const cloud = cloudAt(x / width, 1 - y / height, width / height, world);
  const visibility = opacity * world.night * (1 - cloud) ** 2 * (1 - world.fog * .7);
  if (visibility < .003) return;
  const trail = context.createLinearGradient(x, y, x + tailX, y + tailY);
  trail.addColorStop(0, `rgba(222, 226, 210, ${visibility})`);
  trail.addColorStop(.25, `rgba(175, 208, 212, ${visibility * .52})`);
  trail.addColorStop(1, 'rgba(175, 208, 212, 0)');
  context.strokeStyle = trail;
  context.lineWidth = radius;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + tailX, y + tailY);
  context.stroke();
}

export function drawSkyMeteors(context, width, height, world, motion, cloudAt) {
  if (world.night < .1 || motion < .5) return;
  const wonder = world.wonder || [0, 0, 0, 0];
  if (wonder[0] === 2 || wonder[0] === 3) return;
  if (wonder[0] === 1 && wonder[1] > .001) {
    const seed = wonder[2];
    const [rx, ry] = world.wonderPose || [.5, .72];
    const radiantX = rx * width, radiantY = (1 - ry) * height;
    for (let lane = 0; lane < 6; lane += 1) {
      const period = 5.5 + randomAt(seed + lane * 13.7) * 4.5;
      const clock = world.seconds + randomAt(seed + lane * 5.1) * period;
      const index = Math.floor(clock / period);
      const key = seed + lane * 31.7 + index * 17.3;
      const duration = .62 + randomAt(key) * .65;
      const age = ((clock % period) + period) % period;
      if (age > duration || randomAt(key + 2) > .86) continue;
      const phase = age / duration;
      const angle = .24 + randomAt(key + 4) * (Math.PI - .48);
      const distance = height * (.045 + randomAt(key + 6) * .13 + phase * (.10 + randomAt(key + 8) * .15));
      const x = radiantX + Math.cos(angle) * distance;
      const y = radiantY + Math.sin(angle) * distance;
      const tail = height * (.035 + randomAt(key + 10) * .045);
      meteor(context, width, height, world, cloudAt, x, y, -Math.cos(angle) * tail, -Math.sin(angle) * tail,
        Math.sin(phase * Math.PI) ** .7 * wonder[1] * .66, .65 + randomAt(key + 12) * .45);
    }
    return;
  }
  // Isolated meteors remain sparse on ordinary nights.
  const slot = Math.floor(world.seconds / 37);
  const value = randomAt(slot);
  const duration = 1.25 + value * 1.1;
  const age = ((world.seconds % 37) + 37) % 37 - 4 - value * 17;
  if (value <= .19 || age < 0 || age >= duration) return;
  const phase = age / duration;
  const direction = value > .55 ? 1 : -1;
  meteor(context, width, height, world, cloudAt,
    width * (.2 + value * .6 + direction * (phase - .5) * .22), height * (.09 + value * .24 + phase * .13),
    -direction * width * (.055 + value * .045), -height * .062, Math.sin(phase * Math.PI) * .60, 1);
}
