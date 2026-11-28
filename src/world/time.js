// A shared fictional world, not a forecast or a simulation of Earth's location.
// Solar altitude, atmospheric extinction, radiation fog and galactic structure
// inform the art; time and stellar rotation are deliberately accelerated.
import { celestialProfile } from './celestial.js?v=reverie-8';
import { nightEncounter } from './encounters.js?v=reverie-1';

export const WORLD_EPOCH = Date.UTC(2026, 10, 26);
export const DAY_SECONDS = 5 * 60 + 20;
// Weather and local motion keep their pace when the daylight clock changes.
const EVOLUTION_SECONDS = 36 * 60;
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

function weatherAt(seconds) {
  const character = weatherSignal(seconds, 75139, EVOLUTION_SECONDS * 1.37);
  const coverage = clamp(.035 + weatherSignal(seconds, 19870921) ** 1.85 * .84 + (character - .5) * .12, .025, .94);
  const humidity = .36 + weatherSignal(seconds, 11997, 570) * .63;
  const rain = smooth(.65, .91, coverage) * smooth(.68, .94, humidity)
    * (.35 + weatherSignal(seconds, 37519, 290) * .65);
  return { character, coverage, humidity, rain };
}

export function sampleWorld(now = Date.now()) {
  const seconds = (now - WORLD_EPOCH) / 1000;
  const days = seconds / DAY_SECONDS;
  const phase = mod(days, 1);
  const hourAngle = (phase - .5) * TAU;
  const latitude = .70;
  const declination = .36 * Math.sin(days * TAU / 9) + .045 * Math.sin(days * TAU / 17);
  const altitude = Math.asin(Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle));
  const daylight = smooth(-.13, .18, altitude);
  const night = 1 - smooth(-.27, -.075, altitude);
  const twilight = Math.exp(-(((altitude + .025) / .18) ** 2));
  const { character, coverage, humidity, rain } = weatherAt(seconds);
  const wind = .13 + weatherSignal(seconds, 52913, 510) * .87;
  const cooling = 1 - smooth(.00, .50, altitude);
  const fog = clamp(smooth(.58, .94, humidity) * (1 - wind * .75) * (.16 + cooling * .78));
  const lunarAngle = mod(days / 12, 1) * TAU;
  const moonHour = hourAngle - lunarAngle;
  const moonAltitude = Math.asin(Math.sin(latitude) * Math.sin(-declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(moonHour));
  const east = -Math.cos(declination) * Math.sin(hourAngle);
  const north = Math.cos(latitude) * Math.sin(declination) - Math.sin(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  const bearing = .15 * Math.sin(days * TAU / 13);
  const horizontal = east * Math.cos(bearing) + north * Math.sin(bearing) + north * .35;
  const sunX = .5 + .44 * Math.tanh(horizontal * 1.35);
  // Select the night's schedule at noon, while its lamps are fully extinguished.
  // This avoids a discontinuity in occupied-house lighting at midnight.
  const nightIndex = Math.floor(days + .5);
  const lampThreshold = -.11 - random(nightIndex, 61327) * .13;
  const houseLight = (1 - smooth(lampThreshold - .05, lampThreshold + .05, altitude)) * (.78 + weatherSignal(seconds, 98231, 310) * .22);
  const encounter = nightEncounter(days, nightIndex);
  const wonderStrength = encounter.strength * night * (1 - smooth(.54, .93, coverage)) * (1 - smooth(.28, .64, fog));
  const activity = weatherSignal(seconds, 72817, EVOLUTION_SECONDS * .61);
  const nightTime = days - nightIndex;
  const substorm = smooth(-.25, -.035, nightTime) * (1 - smooth(.045, .25, nightTime));
  const competingLight = smooth(.05, .65, wonderStrength) * (encounter.kind === 3 ? .78 : encounter.kind === 2 ? .55 : .25);
  const aurora = night * smooth(.63, .88, activity) * (1 - coverage * .72) * (1 - fog * .85)
    * (.32 + substorm * .68) * (1 - competingLight);
  const nightCloud = smooth(-.28, -.20, altitude) * (1 - smooth(-.12, -.09, altitude))
    * smooth(.55, .82, character) * (1 - coverage * .8);
  const seaGlow = night * smooth(.58, .84, weatherSignal(seconds, 83917, EVOLUTION_SECONDS * 1.31)) * (1 - rain * .8);
  const recentRain = Math.max(rain, weatherAt(seconds - 120).rain);
  const rainbow = smooth(.02, .10, altitude) * (1 - smooth(.45, .70, altitude))
    * smooth(.015, .16, recentRain) * (1 - smooth(.50, .84, coverage));
  const storm = smooth(.76, .92, coverage) * smooth(.76, .96, humidity);
  const stormSlot = Math.floor(seconds / 31);
  const flashAge = mod(seconds, 31) - 4 - random(stormSlot, 71913) * 21;
  const lightning = storm * smooth(0, .09, flashAge) * (1 - smooth(.09, .85, flashAge));
  const skyPhase = mod(seconds * .018, TAU);
  const cloudShape = weatherSignal(seconds, 23719, EVOLUTION_SECONDS * .63);
  const skyTint = [clamp(mix(.065, .65, daylight) + twilight * .12), clamp(mix(.10, .75, daylight) + twilight * .035), mix(.15, .78, daylight)];
  return {
    seconds, phase, altitude, daylight, night, twilight, coverage, humidity, wind, fog, houseLight,
    // Night identities change at noon, hidden by daylight, and survive midnight.
    celestial: celestialProfile(nightIndex),
    fire: (1 - smooth(-.14, .065, altitude)) * (1 - rain * .82),
    rain, aurora, nightCloud, seaGlow, rainbow, lightning,
    wonder: [encounter.kind, wonderStrength, encounter.seed, encounter.progress],
    wonderPose: encounter.pose,
    skyFlow: [Math.sin(skyPhase), Math.cos(skyPhase)],
    sun: [sunX, SEA_LEVEL + Math.sin(altitude) * .64, altitude],
    moon: [.5 - Math.sin(moonHour) * .43, SEA_LEVEL + Math.sin(moonAltitude) * .64, lunarAngle, moonAltitude],
    galaxyAngle: Math.sin(days * TAU * 1.0027379) * .40 + Math.sin(seconds * .009) * .075,
    galaxySpin: mod(seconds * .0025, TAU),
    // Slow, aperiodic artistic evolution, while individual star identities persist.
    cosmos: [
      (weatherSignal(seconds, 21371, EVOLUTION_SECONDS * 1.7) - .5) * .14,
      .88 + weatherSignal(seconds, 51719, EVOLUTION_SECONDS * 2.3) * .24,
      (weatherSignal(seconds, 37139, EVOLUTION_SECONDS * 1.3) - .5) * .12,
      weatherSignal(seconds, 91817, EVOLUTION_SECONDS * .8),
    ],
    cloudOffset: [mod(seconds * .0055 + Math.sin(seconds / 170) * .15, 256), Math.sin(seconds / 390) * .18],
    cloudForm: [mix(.62, 1.35, cloudShape), mix(1.65, .78, cloudShape), mix(.10, .22, cloudShape), weatherSignal(seconds, 15831, 270)],
    waves: [Math.sin(seconds * .55), Math.cos(seconds * .55), Math.sin(seconds * .935), Math.cos(seconds * .935)],
    skyTint,
    weather: rain > .12 ? 'rain' : fog > .36 ? 'mist' : coverage > .72 ? 'overcast' : coverage > .32 ? 'cloudy' : 'clear',
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
  const cx = (x - .5) * aspect / (h * .6 + .18) * 1.4 * world.cloudForm[0] + world.cloudOffset[0];
  const cy = 1 / (h * .7 + .12) * 1.4 * world.cloudForm[1] + world.cloudOffset[1];
  const density = fbm(cx, cy) + noise(cx * 3, cy * 3) * .1;
  const threshold = .76 - world.coverage * .50;
  return smooth(threshold, threshold + world.cloudForm[2], density) * smooth(0, .055, h);
}
