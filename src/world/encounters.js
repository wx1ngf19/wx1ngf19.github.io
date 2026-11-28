// Fictional observing seasons share the world's accelerated clock. An event
// keeps one identity through midnight and fades before the next noon selection.
const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

function sample(index, salt) {
  let bits = Math.imul(index ^ salt, 0x45d9f3b);
  bits = Math.imul(bits ^ bits >>> 16, 0x45d9f3b);
  return ((bits ^ bits >>> 16) >>> 0) / 4294967296;
}

let cachedIndex;
let cached;

function schedule(nightIndex) {
  if (cachedIndex === nightIndex) return cached;
  const chance = sample(nightIndex, 27191);
  const kind = chance < .28 ? 1 : chance < .45 ? 2 : chance < .50 ? 3 : 0;
  const duration = kind === 2 ? .62 : kind === 3 ? .42 : .36;
  const center = (sample(nightIndex, 18397) - .5) * .10;
  cachedIndex = nightIndex;
  cached = {
    kind, duration, start: center - duration * .5,
    seed: 7 + sample(nightIndex, 51973) * 179,
    pose: [
      .25 + sample(nightIndex, 81031) * .50,
      .57 + sample(nightIndex, 69739) * .20,
      kind === 3 ? .035 + sample(nightIndex, 78317) * .010 : .046 + sample(nightIndex, 78317) * .016,
      sample(nightIndex, 19379) * TAU,
    ],
  };
  return cached;
}

export function nightEncounter(days, nightIndex) {
  const event = schedule(nightIndex);
  const progress = (days - nightIndex - event.start) / event.duration;
  const strength = event.kind ? ease(progress / .20) * ease((1 - progress) / .22) : 0;
  return { kind: event.kind, seed: event.seed, progress: clamp(progress), strength, pose: event.pose };
}
