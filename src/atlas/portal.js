const entry = document.querySelector('.atlas-entry');
const dialog = document.querySelector('#atlas-dialog');
const host = document.querySelector('#atlas-frame-host');
const canvas = document.querySelector('#atlas-orb');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const TAU = Math.PI * 2;
let frame = 0;
let previous = 0;
let elapsed = 0;
let paint = () => {};

function wake() {
  if (!frame && !document.hidden && !dialog.open && !reduced.matches) frame = requestAnimationFrame(animate);
}

function animate(now) {
  frame = 0;
  if (document.hidden || dialog.open) return;
  if (now - previous >= 45) {
    elapsed += previous ? Math.min(now - previous, 100) : 0;
    previous = now;
    paint(elapsed);
  }
  wake();
}

function close() { dialog.close(); }

if (typeof dialog.showModal === 'function') {
  entry.setAttribute('role', 'button');
  entry.setAttribute('aria-haspopup', 'dialog');
  entry.setAttribute('aria-controls', 'atlas-dialog');
  entry.setAttribute('aria-expanded', 'false');
  function open(event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
    event.preventDefault();
    if (dialog.open) return;
    const iframe = document.createElement('iframe');
    iframe.title = 'Reverie visitor atlas';
    iframe.src = entry.href;
    host.replaceChildren(iframe);
    dialog.showModal();
    entry.setAttribute('aria-expanded', 'true');
    cancelAnimationFrame(frame);
    frame = 0;
    window.dispatchEvent(new CustomEvent('reverie:atlas', { detail: { open: true } }));
  }
  entry.addEventListener('click', open);
  entry.addEventListener('keydown', event => { if (event.code === 'Space') open(event); });
  document.querySelector('#close-atlas').addEventListener('click', close);
  dialog.addEventListener('close', () => {
    host.replaceChildren();
    entry.setAttribute('aria-expanded', 'false');
    previous = 0;
    window.dispatchEvent(new CustomEvent('reverie:atlas', { detail: { open: false } }));
    wake();
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === host.querySelector('iframe')?.contentWindow
      && event.data?.type === 'reverie:close-atlas') close();
  });
}

async function initializeOrb() {
  try {
    const context = canvas.getContext('2d');
    if (!context) return;
    const response = await fetch(new URL('../../assets/data/earth.json?v=atlas-2', import.meta.url));
    if (!response.ok) return;
    const land = (await response.json()).filter((_, index) => index % 3 === 0).map(([longitude, latitude]) => {
      const lon = longitude * Math.PI / 180, lat = latitude * Math.PI / 180;
      return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
    });
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = canvas.height = 72 * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const dot = (x, y, radius, fill) => {
      context.beginPath(); context.arc(x, y, radius, 0, TAU); context.fillStyle = fill; context.fill();
    };
    paint = time => {
      const t = time * .001;
      // Incommensurate periods make the gentle tumble drift without a short loop.
      const yaw = t * .19 + .4 * Math.sin(t * .071) + 1.7;
      const pitch = .3 + .65 * Math.sin(t * .113);
      const roll = -.4 + .45 * Math.sin(t * .079 + .8);
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
      context.clearRect(0, 0, 72, 72);
      const glow = context.createRadialGradient(32, 29, 6, 36, 36, 32);
      glow.addColorStop(0, '#abcaba12'); glow.addColorStop(.7, '#a5cccd0b'); glow.addColorStop(1, '#8bc5cc00');
      dot(36, 36, 32, glow);
      const sea = context.createRadialGradient(28, 26, 2, 36, 36, 23);
      sea.addColorStop(0, '#264645c9'); sea.addColorStop(.65, '#0e252cca'); sea.addColorStop(1, '#06151ac9');
      dot(36, 36, 20.5, sea);
      context.strokeStyle = '#a6cfc76b'; context.lineWidth = .55;
      context.beginPath(); context.arc(36, 36, 20.6, 0, TAU); context.stroke();
      for (const [x, y, z] of land) {
        const u = x * cy - z * sy, v = x * sy + z * cy;
        const py = y * cp - v * sp, pz = y * sp + v * cp;
        if (pz < 0) continue;
        const px = u * cr - py * sr, ry = u * sr + py * cr;
        dot(36 + px * 20, 36 - ry * 20, .26 + pz * .18, `rgba(209,222,192,${.25 + pz * .65})`);
      }
      context.save(); context.translate(36, 36); context.rotate(-.43 + Math.sin(t * .037) * .12);
      context.beginPath(); context.ellipse(0, 0, 30, 9, 0, 0, TAU);
      context.strokeStyle = '#dac9a766'; context.lineWidth = .6; context.stroke();
      const angle = t * .3;
      dot(Math.cos(angle) * 30, Math.sin(angle) * 9, 1.2, '#f2dfaf');
      context.restore();
    };
    canvas.hidden = false;
    entry.dataset.ready = 'true';
    paint(0);
    wake();
  } catch { /* The small SVG remains a functional entrance when canvas fails. */ }
}

document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(frame);
  frame = 0;
  previous = 0;
  if (!document.hidden) wake();
});
reduced.addEventListener('change', () => {
  cancelAnimationFrame(frame);
  frame = 0;
  previous = 0;
  paint(elapsed);
  wake();
});
void initializeOrb();
