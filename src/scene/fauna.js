import { smooth } from '../world/time.js?v=reverie-11';

const mod = (x, n) => ((x % n) + n) % n;
function seeded(index, salt) {
  let n = Math.imul(index ^ salt, 0x45d9f3b);
  n = Math.imul(n ^ n >>> 16, 0x45d9f3b);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
}

// Visits belong to the shared clock, so a refresh never restarts a flock.
export function flockAt(seconds) {
  const visit = Math.floor(seconds / 95);
  const elapsed = mod(seconds, 95) - 7 - seeded(visit, 91827) * 23;
  const duration = 34 + seeded(visit, 33109) * 19;
  return {
    visit,
    progress: elapsed / duration,
    active: seeded(visit, 73191) > .23 && elapsed >= 0 && elapsed < duration,
    count: 3 + Math.floor(seeded(visit, 92731) * 5),
    direction: seeded(visit, 27129) > .5 ? 1 : -1,
    altitude: .26 + seeded(visit, 41731) * .27,
    scale: .72 + seeded(visit, 19127) * .42,
  };
}

export function drawBirds(ctx, width, height, world, motion) {
  const visibility = smooth(.12, .42, world.daylight) * (1 - smooth(.06, .24, world.rain));
  if (visibility < .001) return;
  const flock = flockAt(world.seconds);
  if (!flock.active) return;
  const t = flock.progress;
  const fade = smooth(0, .08, t) * (1 - smooth(.92, 1, t));
  const leadX = (flock.direction > 0 ? -.12 + t * 1.24 : 1.12 - t * 1.24) * width;
  const leadY = (flock.altitude - Math.sin(t * Math.PI) * .055) * height;
  const span = Math.max(2.1, Math.min(5.6, height * .006)) * flock.scale;
  const spacing = Math.max(span * 3.8, width * .014);
  ctx.save();
  ctx.strokeStyle = `rgba(22, 43, 48, ${fade * visibility * (1 - world.fog * .78) * .72})`;
  ctx.lineWidth = Math.max(.75, span * .18);
  ctx.lineCap = 'round';
  for (let bird = 0; bird < flock.count; bird += 1) {
    const rank = Math.ceil(bird / 2);
    const side = bird % 2 ? -1 : 1;
    const x = leadX - rank * spacing * flock.direction;
    const y = leadY + rank * spacing * .34 * side + Math.sin(world.seconds * .8 + bird) * span * .3;
    const flap = Math.sin(world.seconds * (5.8 + flock.scale) + bird * .91);
    const glide = smooth(-.2, .7, Math.sin(world.seconds * .27 + bird * .61));
    const wing = (flap * (1 - glide * .75) * .62 - .13) * span * Math.max(.2, motion);
    ctx.beginPath();
    ctx.moveTo(x - span, y - wing);
    ctx.quadraticCurveTo(x - span * .45, y - wing * .72 - span * .13, x, y + span * .17);
    ctx.quadraticCurveTo(x + span * .45, y - wing * .72 - span * .13, x + span, y - wing);
    ctx.stroke();
  }
  ctx.restore();
}
