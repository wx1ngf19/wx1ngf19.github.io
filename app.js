import { createUniverse } from './scene.js?v=campfire-2';

const root = document.documentElement;
const stage = document.querySelector('.universe-stage');
const motionButton = document.querySelector('#motion-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const universe = createUniverse(document.querySelector('#universe-canvas'), document.querySelector('#stars-canvas'));
const pointerCanvas = document.querySelector('#pointer-canvas');
const context = pointerCanvas.getContext('2d');
const aura = document.querySelector('.pointer-aura');
let paused = reducedMotion.matches;
let hasMouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
let pointerFrame = 0;
let previousFrame = 0;
let lastSpawnX = -1000;
let lastSpawnY = -1000;
let viewportWidth = innerWidth;
let viewportHeight = innerHeight;
const pointer = { x: viewportWidth / 2, y: viewportHeight / 2, smoothX: viewportWidth / 2, smoothY: viewportHeight / 2, active: false };
const motes = Array.from({ length: 80 }, () => ({ life: 0, x: 0, y: 0, vx: 0, vy: 0, size: 0, duration: 1 }));
let nextMote = 0;

function sizePointerCanvas() {
  viewportWidth = innerWidth;
  viewportHeight = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  pointerCanvas.width = Math.round(viewportWidth * ratio);
  pointerCanvas.height = Math.round(viewportHeight * ratio);
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function spawnMote(x, y) {
  const mote = motes[nextMote];
  nextMote = (nextMote + 1) % motes.length;
  const angle = Math.random() * Math.PI * 2;
  const speed = 2 + Math.random() * 8;
  Object.assign(mote, {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 5,
    size: 0.5 + Math.random() * 0.9,
    duration: 0.5 + Math.random() * 0.6,
    life: 1,
  });
}

function drawPointer(timestamp) {
  pointerFrame = 0;
  if (!context || paused || document.hidden || !hasMouse) return;
  const delta = previousFrame ? Math.min((timestamp - previousFrame) / 1000, 0.05) : 0.016;
  previousFrame = timestamp;
  context.clearRect(0, 0, viewportWidth, viewportHeight);
  const ease = 1 - Math.exp(-delta * 13);
  pointer.smoothX += (pointer.x - pointer.smoothX) * ease;
  pointer.smoothY += (pointer.y - pointer.smoothY) * ease;
  aura.style.transform = `translate3d(${pointer.smoothX}px, ${pointer.smoothY}px, 0)`;

  let alive = false;
  for (const mote of motes) {
    if (mote.life <= 0) continue;
    mote.life -= delta / mote.duration;
    if (mote.life <= 0) continue;
    alive = true;
    mote.x += mote.vx * delta;
    mote.y += mote.vy * delta;
    context.fillStyle = `rgba(221, 207, 172, ${mote.life * 0.66})`;
    context.beginPath();
    context.arc(mote.x, mote.y, mote.size * mote.life, 0, Math.PI * 2);
    context.fill();
  }

  if (pointer.active) {
    const x = pointer.smoothX;
    const y = pointer.smoothY;
    const glow = context.createRadialGradient(x, y, 0, x, y, 14);
    glow.addColorStop(0, 'rgba(239, 222, 182, .35)');
    glow.addColorStop(1, 'rgba(239, 222, 182, 0)');
    context.fillStyle = glow;
    context.fillRect(x - 14, y - 14, 28, 28);
    context.strokeStyle = 'rgba(234, 218, 184, .7)';
    context.lineWidth = 0.7;
    context.beginPath();
    context.moveTo(x - 5, y);
    context.lineTo(x + 5, y);
    context.moveTo(x, y - 5);
    context.lineTo(x, y + 5);
    context.stroke();
  }

  const moving = Math.abs(pointer.x - pointer.smoothX) + Math.abs(pointer.y - pointer.smoothY) > 0.2;
  if (alive || moving) pointerFrame = requestAnimationFrame(drawPointer);
}

function wakePointer() {
  if (!pointerFrame && !paused && hasMouse && !document.hidden) {
    previousFrame = 0;
    pointerFrame = requestAnimationFrame(drawPointer);
  }
}

function resetPointer() {
  pointer.active = false;
  root.classList.remove('has-pointer');
  universe.setPointer(0, 0);
  wakePointer();
}

window.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') return;
  if (event.pointerType === 'mouse') {
    hasMouse = true;
    root.classList.add('has-mouse');
  }
  if (paused || !hasMouse) return;
  pointer.active = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  root.classList.add('has-pointer');
  universe.setPointer((event.clientX / viewportWidth - 0.5) * 2, (0.5 - event.clientY / viewportHeight) * 2);
  if (Math.hypot(event.clientX - lastSpawnX, event.clientY - lastSpawnY) > 4) {
    spawnMote(event.clientX, event.clientY);
    lastSpawnX = event.clientX;
    lastSpawnY = event.clientY;
  }
  wakePointer();
}, { passive: true });

document.addEventListener('pointerleave', resetPointer);
window.addEventListener('blur', resetPointer);
stage.addEventListener('pointerdown', (event) => {
  if (paused || event.target.closest('button')) return;
  universe.interact(event.clientX / viewportWidth, 1 - event.clientY / viewportHeight);
}, { passive: true });

function setPaused(value) {
  paused = value;
  root.dataset.motion = paused ? 'paused' : 'running';
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.setAttribute('aria-label', paused ? 'wx1ngf19 的星海徽记，开启动态效果' : 'wx1ngf19 的星海徽记，暂停动态效果');
  universe.setPaused(paused);
  if (paused) {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    context?.clearRect(0, 0, viewportWidth, viewportHeight);
    motes.forEach((mote) => { mote.life = 0; });
    root.classList.remove('has-pointer');
  }
}

motionButton.addEventListener('click', () => setPaused(!paused));
reducedMotion.addEventListener('change', (event) => setPaused(event.matches));
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat && !event.target.closest('button')) {
    event.preventDefault();
    setPaused(!paused);
  }
});
window.addEventListener('resize', sizePointerCanvas, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    context?.clearRect(0, 0, viewportWidth, viewportHeight);
    motes.forEach((mote) => { mote.life = 0; });
    resetPointer();
  }
});
sizePointerCanvas();
setPaused(paused);
