import '../../assets/vendor/d3.v7.min.js';

const d3 = globalThis.d3;
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;

export function createGlobe(canvas, world, { nameFor, onSelect, tooltip }) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const features = world.features;
  // D3's spherical polygons use clockwise exterior rings.
  for (const feature of features) {
    if (d3.geoArea(feature) > TAU) {
      const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      for (const polygon of polygons) for (const ring of polygon) ring.reverse();
    }
  }
  const projection = d3.geoOrthographic().clipAngle(90).precision(.5);
  const path = d3.geoPath(projection, context);
  const graticule = d3.geoGraticule().step([30, 30])();
  const counts = new Map();
  const land = world.landPoints.map(([longitude, latitude], index) => {
    const lon = longitude * Math.PI / 180, lat = latitude * Math.PI / 180;
    return { point: [longitude, latitude], xyz: [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)], size: .55 + (index % 7) * .075 };
  });
  let maximum = 1;
  let selected = null;
  let hovered = null;
  let width = 0;
  let height = 0;
  let radius = 0;
  let center = [0, 0];
  let rotation = [-105, -15, -12];
  let zoom = 1;
  let frame = 0;
  let previous = 0;
  let holdUntil = 0;
  let lastPaint = 0;
  let focus = null;
  let dragging = null;
  let moved = false;
  let pointer = [0, 0];
  const stars = Array.from({ length: 48 }, (_, index) => ({
    x: ((Math.sin(index * 127.1 + 78.2) * 43758.5453) % 1 + 1) % 1,
    y: ((Math.sin(index * 53.7 + 14.6) * 14235.138) % 1 + 1) % 1,
    size: index % 13 === 0 ? 1.1 : .55,
  }));

  function configure() {
    projection.translate(center).scale(radius * zoom).rotate(rotation);
  }

  function circle(x, y, size, color) {
    context.beginPath();
    context.arc(x, y, size, 0, TAU);
    context.fillStyle = color;
    context.fill();
  }

  function draw(now = 0) {
    if (!width || !height) return;
    configure();
    context.clearRect(0, 0, width, height);
    const r = radius * zoom;
    const scale = clamp(Math.pow(r / 260, .8), .34, 1.1);
    const ink = clamp(r / 240, .58, 1);
    const landScale = clamp(Math.sqrt(r / 260), .45, 1.1);
    const landInk = clamp(.6 + landScale * .4, .7, 1);
    for (let index = 0; index < stars.length; index += 1) {
      const star = stars[index];
      const a = .12 + (reduced.matches ? .06 : (Math.sin(now * .0004 + index * 2.3) + 1) * .06);
      circle(star.x * width, star.y * height, star.size * (.6 + scale * .4), `rgba(170,204,201,${a * (.65 + ink * .35)})`);
    }
    const glow = context.createRadialGradient(...center, r * .87, ...center, r * 1.2);
    glow.addColorStop(0, '#a3d7c91a');
    glow.addColorStop(.5, '#5fa7b40c');
    glow.addColorStop(1, '#5291a600');
    circle(...center, r * 1.2, glow);
    // These orbital lines are ornamental, independent of the visit data.
    for (const [tilt, flatten, alpha] of [[-.4, .32, .17], [.68, .75, .075]]) {
      context.save();
      context.translate(...center);
      context.rotate(tilt);
      context.beginPath();
      context.ellipse(0, 0, r * 1.18, r * flatten, 0, 0, TAU);
      context.strokeStyle = `rgba(192,207,182,${alpha})`;
      context.lineWidth = .65 * clamp(scale, .6, 1);
      context.stroke();
      context.restore();
    }
    const ocean = context.createRadialGradient(center[0] - r * .4, center[1] - r * .5, r * .08, ...center, r * 1.1);
    ocean.addColorStop(0, '#11282a');
    ocean.addColorStop(.58, '#0a1b21');
    ocean.addColorStop(1, '#071319');
    circle(...center, r, ocean);
    context.beginPath();
    path(graticule);
    context.strokeStyle = '#a3c4c30a';
    context.lineWidth = .6;
    context.stroke();
    for (const feature of features) {
      const code = feature.properties.code;
      if (code !== selected && code !== hovered) continue;
      context.beginPath();
      path(feature);
      context.fillStyle = '#a5c8ac0c';
      context.fill();
      context.strokeStyle = '#ddcba16b';
      context.lineWidth = .6;
      context.stroke();
    }
    const front = projection.invert(center);
    const lon = front[0] * Math.PI / 180, lat = front[1] * Math.PI / 180;
    const normal = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
    context.fillStyle = '#b0d0c2';
    for (const sample of land) {
      const depth = sample.xyz.reduce((sum, value, index) => sum + value * normal[index], 0);
      if (depth < 0) continue;
      const point = projection(sample.point);
      context.globalAlpha = (.16 + Math.pow(depth, .55) * .64) * landInk;
      context.beginPath();
      context.arc(...point, sample.size * (.6 + depth * .5) * landScale, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
    context.beginPath();
    context.arc(...center, r, 0, TAU);
    context.strokeStyle = '#a5d2ce26';
    context.lineWidth = .8;
    context.stroke();
    const markers = [];
    for (const [code, amount] of counts) {
      const place = world.places[code];
      if (!place || !amount) continue;
      const distance = d3.geoDistance(place.point, front);
      if (distance > Math.PI / 2 - .025) continue;
      const point = projection(place.point);
      if (!point) continue;
      const intensity = Math.log1p(amount) / Math.log1p(maximum);
      markers.push({ code, point, intensity, phase: place.point[0], edge: clamp((Math.PI / 2 - distance) / .2, .2, 1) });
    }
    // Measure nearby projected lights so dense coastlines retain their detail.
    const reach = 24 * scale;
    for (const marker of markers) {
      const { code, point, intensity, phase, edge } = marker;
      let crowding = 0;
      for (const other of markers) {
        if (other === marker) continue;
        const distance = Math.hypot(point[0] - other.point[0], point[1] - other.point[1]);
        if (distance < reach) crowding += (1 - distance / reach) ** 2;
      }
      const quiet = clamp(1 / Math.sqrt(1 + crowding * 1.6), .3, 1);
      const emphasis = code === selected ? Math.max(.8, quiet) : quiet;
      const size = Math.max(.9, (1.6 + intensity * 2) * scale * (.78 + quiet * .22));
      const pulse = reduced.matches ? 1 : 1 + Math.sin(now * .0014 + phase) * .07;
      const haloRadius = (9 + intensity * 9) * scale * pulse;
      const halo = context.createRadialGradient(...point, 0, ...point, haloRadius);
      halo.addColorStop(0, `rgba(228,206,156,${.24 * ink * emphasis * edge})`);
      halo.addColorStop(.4, `rgba(200,187,126,${.07 * ink * emphasis * edge})`);
      halo.addColorStop(1, '#c8bb7e00');
      circle(...point, haloRadius, halo);
      circle(...point, size, `rgba(232,216,173,${(.6 + ink * .3) * (.8 + emphasis * .2) * edge})`);
      circle(point[0] - size * .2, point[1] - size * .2, size * .28, `rgba(255,240,201,${.6 * ink * edge})`);
      if (code === selected) {
        context.beginPath();
        context.arc(...point, size + scale * (5 + Math.sin(now * .001) * (reduced.matches ? 0 : .7)), 0, TAU);
        context.strokeStyle = `rgba(227,204,148,${.45 * ink})`;
        context.lineWidth = Math.max(.45, .7 * scale);
        context.stroke();
      }
    }
    const orbitalAngle = reduced.matches ? .3 : now * .000035;
    const ox = Math.cos(orbitalAngle) * r * 1.18, oy = Math.sin(orbitalAngle) * r * .32;
    const beacon = [center[0] + ox * Math.cos(-.4) - oy * Math.sin(-.4), center[1] + ox * Math.sin(-.4) + oy * Math.cos(-.4)];
    const halo = context.createRadialGradient(...beacon, 0, ...beacon, 7 * scale);
    halo.addColorStop(0, `rgba(234,217,175,${.28 * ink})`); halo.addColorStop(1, '#ead9af00');
    circle(...beacon, 7 * scale, halo);
    circle(...beacon, Math.max(.7, 1.5 * scale), `rgba(226,210,172,${.55 + ink * .25})`);
  }

  function animate(now) {
    frame = 0;
    if (document.hidden) return;
    const delta = previous ? Math.min(now - previous, 60) : 0;
    previous = now;
    if (focus) {
      const t = clamp((now - focus.start) / 1000, 0, 1);
      const ease = t * t * (3 - 2 * t);
      rotation = focus.from.map((angle, index) => angle + focus.delta[index] * ease);
      if (t === 1) focus = null;
    } else if (!dragging && now > holdUntil && !reduced.matches) rotation[0] -= delta * .00055;
    if (now - lastPaint > 32 || focus || dragging) {
      draw(now);
      lastPaint = now;
    }
    if (!reduced.matches || focus || dragging) frame = requestAnimationFrame(animate);
  }

  function wake() {
    if (!frame && !document.hidden) {
      previous = 0;
      frame = requestAnimationFrame(animate);
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    center = [width * .52, height * .49];
    radius = Math.min(width * .40, height * .375);
    configure();
    draw(performance.now());
    wake();
  }

  function locate(x, y) {
    const dx = x - center[0], dy = y - center[1];
    if (dx * dx + dy * dy > (radius * zoom) ** 2) return null;
    const position = projection.invert([x, y]);
    if (!position) return null;
    let closest = null, nearest = .11;
    for (const [code] of counts) {
      const place = world.places[code];
      if (!place) continue;
      const distance = d3.geoDistance(position, place.point);
      if (distance < nearest) { nearest = distance; closest = code; }
    }
    if (closest) return closest;
    return features.find(feature => d3.geoContains(feature, position))?.properties.code || null;
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (Math.hypot(x - center[0], y - center[1]) > radius * zoom) return;
    dragging = { x: event.clientX, y: event.clientY, from: rotation.slice(), id: event.pointerId };
    moved = false;
    focus = null;
    tooltip.hidden = true;
    canvas.classList.add('dragging');
    canvas.setPointerCapture(event.pointerId);
    wake();
  });
  canvas.addEventListener('pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    pointer = [event.clientX - rect.left, event.clientY - rect.top];
    if (dragging) {
      const dx = event.clientX - dragging.x, dy = event.clientY - dragging.y;
      moved ||= Math.hypot(dx, dy) > 5;
      rotation = [dragging.from[0] + dx * .25 / zoom, clamp(dragging.from[1] - dy * .25 / zoom, -75, 75), dragging.from[2]];
      configure();
      draw(performance.now());
      return;
    }
    hovered = locate(...pointer);
    if (hovered) {
      tooltip.textContent = `${nameFor(hovered)} · ${(counts.get(hovered) || 0).toLocaleString('en')}`;
      tooltip.hidden = false;
      tooltip.style.left = `${clamp(pointer[0] + 14, 0, Math.max(0, width - tooltip.offsetWidth))}px`;
      tooltip.style.top = `${Math.max(0, pointer[1] - 38)}px`;
    } else tooltip.hidden = true;
    if (reduced.matches) draw(performance.now());
  });
  function release(event) {
    if (!dragging || event.pointerId !== dragging.id) return;
    if (!moved && event.type !== 'pointercancel') {
      const rect = canvas.getBoundingClientRect();
      const code = locate(event.clientX - rect.left, event.clientY - rect.top);
      if (code) onSelect(code);
    }
    dragging = null;
    holdUntil = performance.now() + 8000;
    canvas.classList.remove('dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { hovered = null; tooltip.hidden = true; });
  canvas.addEventListener('wheel', event => {
    const rect = canvas.getBoundingClientRect();
    if (Math.hypot(event.clientX - rect.left - center[0], event.clientY - rect.top - center[1]) > radius * zoom) return;
    event.preventDefault();
    zoom = clamp(zoom * Math.exp(-event.deltaY * .0007), .8, 1.35);
    holdUntil = performance.now() + 5000;
    draw(performance.now());
  }, { passive: false });
  canvas.addEventListener('keydown', event => {
    const moves = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] };
    if (moves[event.key]) {
      event.preventDefault();
      rotation[0] += moves[event.key][0];
      rotation[1] = clamp(rotation[1] + moves[event.key][1], -75, 75);
    } else if (event.key === '+' || event.key === '=') zoom = clamp(zoom + .1, .8, 1.35);
    else if (event.key === '-') zoom = clamp(zoom - .1, .8, 1.35);
    else return;
    focus = null;
    holdUntil = performance.now() + 8000;
    draw(performance.now());
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else wake();
  });
  reduced.addEventListener('change', () => { draw(performance.now()); wake(); });
  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    setData(rows) {
      counts.clear();
      rows.forEach(row => counts.set(row.country, row.views));
      maximum = Math.max(1, ...counts.values());
      draw(performance.now());
      wake();
    },
    select(code) {
      selected = code;
      const place = world.places[code];
      if (place) {
        const target = [-place.point[0], -place.point[1], -8];
        if (reduced.matches) rotation = target;
        else focus = { start: performance.now(), from: rotation.slice(), delta: target.map((angle, index) => index === 0 ? wrap(angle - rotation[index]) : angle - rotation[index]) };
      }
      holdUntil = performance.now() + 14000;
      draw(performance.now());
      wake();
    },
    reset() {
      selected = null;
      rotation = [-105, -15, -12];
      zoom = 1;
      focus = null;
      holdUntil = performance.now() + 2500;
      draw(performance.now());
      wake();
    },
  };
}
