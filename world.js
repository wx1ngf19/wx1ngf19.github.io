// A shared fictional world, not a forecast or a simulation of Earth's location.
// Solar altitude, atmospheric extinction, radiation fog and galactic structure
// inform the art; time and stellar rotation are deliberately accelerated.
export const WORLD_EPOCH = Date.UTC(2026, 10, 26);
export const DAY_SECONDS = 36 * 60;
export const SEA_LEVEL = .205;
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mod = (x, n) => ((x % n) + n) % n;
const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = x => x * x * x * (x * (x * 6 - 15) + 10);

function random(index, seed) {
  let n = Math.imul(index ^ seed, 0x45d9f3b);
  n = Math.imul(n ^ n >>> 16, 0x45d9f3b);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
}

function weatherSignal(seconds, seed, duration = 420) {
  const position = seconds / duration;
  const index = Math.floor(position);
  return mix(random(index, seed), random(index + 1, seed), ease(position - index));
}

export function sampleWorld(now = Date.now()) {
  const seconds = (now - WORLD_EPOCH) / 1000;
  const days = seconds / DAY_SECONDS;
  const phase = mod(days, 1);
  const hourAngle = (phase - .5) * TAU;
  const latitude = .70;
  const declination = .18 * Math.sin(days * TAU / 24);
  const altitude = Math.asin(Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle));
  const daylight = smooth(-.13, .18, altitude);
  const night = 1 - smooth(-.27, -.075, altitude);
  const twilight = Math.exp(-(((altitude + .025) / .16) ** 2));
  const coverage = .06 + weatherSignal(seconds, 19870921) * .91;
  const humidity = .36 + weatherSignal(seconds, 11997, 570) * .63;
  const wind = .13 + weatherSignal(seconds, 52913, 510) * .87;
  const cooling = 1 - smooth(.00, .50, altitude);
  const fog = clamp(smooth(.58, .94, humidity) * (1 - wind * .75) * (.16 + cooling * .78));
  const lunarAngle = mod(days / 12, 1) * TAU;
  const moonHour = hourAngle - lunarAngle;
  const moonAltitude = Math.asin(Math.sin(latitude) * Math.sin(-declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(moonHour));
  const skyTint = [mix(.065, .65, daylight), mix(.10, .75, daylight), mix(.15, .78, daylight)];
  return {
    seconds, phase, altitude, daylight, night, twilight, coverage, humidity, wind, fog,
    fire: 1 - smooth(-.14, .065, altitude),
    sun: [.5 - Math.sin(hourAngle) * .43, SEA_LEVEL + Math.sin(altitude) * .64, altitude],
    moon: [.5 - Math.sin(moonHour) * .43, SEA_LEVEL + Math.sin(moonAltitude) * .64, lunarAngle, moonAltitude],
    galaxyAngle: Math.sin(days * TAU * 1.0027379) * .40 + Math.sin(seconds * .009) * .075,
    galaxySpin: mod(seconds * .0025, TAU),
    cloudOffset: [mod(seconds * .0055 + Math.sin(seconds / 170) * .15, 256), Math.sin(seconds / 390) * .18],
    waves: [Math.sin(seconds * .55), Math.cos(seconds * .55), Math.sin(seconds * .935), Math.cos(seconds * .935)],
    skyTint,
    weather: fog > .36 ? 'mist' : coverage > .72 ? 'overcast' : coverage > .32 ? 'cloudy' : 'clear',
  };
}

// Match the small integer hash used by the shader so clouds also occlude stars.
function hash(x, y) {
  const n = mod(mod(x, 256) * 37 + mod(y, 256) * 57, 256);
  return mod(n * n * 17 + n * 131, 1021) / 1021;
}
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(0, 1, x - ix), fy = smooth(0, 1, y - iy);
  return mix(mix(hash(ix, iy), hash(ix + 1, iy), fx), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy);
}
function fbm(x, y) {
  let value = 0, amplitude = .5;
  for (let index = 0; index < 4; index += 1) {
    value += noise(x, y) * amplitude;
    const nx = 2 * x + y + 13;
    y = -x + 2 * y + 13;
    x = nx;
    amplitude *= .5;
  }
  return value;
}
export function cloudAt(x, uvY, aspect, world) {
  const h = Math.max(0, (uvY - SEA_LEVEL) / (1 - SEA_LEVEL));
  const cx = (x - .5) * aspect / (h * .6 + .18) * 1.4 + world.cloudOffset[0];
  const cy = 1 / (h * .7 + .12) * 1.4 + world.cloudOffset[1];
  const density = fbm(cx, cy) + noise(cx * 3, cy * 3) * .1;
  const threshold = .73 - world.coverage * .53;
  return smooth(threshold, threshold + .18, density) * smooth(0, .055, h);
}
