const TAU = Math.PI * 2;

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));

function rgb(values) {
  return `rgb(${values.map(value => Math.round(clamp(value, 0, 255))).join(', ')})`;
}

function blend(a, b, amount) {
  return a.map((value, index) => value + (b[index] - value) * amount);
}

function material(night, day, world, haze = 1, heated = null) {
  let color = blend(night, day, world.daylight);
  if (heated) color = blend(color, heated, world.fire * (1 - world.daylight * .72));
  return rgb(blend(color, world.skyTint, clamp(world.fog * haze * .5 + world.daylight * .025)));
}

function conditions(world) {
  const daylight = clamp(world.daylight ?? 0);
  const night = clamp(world.night ?? 1 - daylight);
  let skyTint = world.skyTint;
  if (!Array.isArray(skyTint) || skyTint.length < 3 || !skyTint.slice(0, 3).every(Number.isFinite)) {
    skyTint = blend([20, 39, 48], [167, 185, 178], daylight * (1 - night * .08));
  } else {
    skyTint = skyTint.slice(0, 3);
    if (Math.max(...skyTint) <= 1) skyTint = skyTint.map(value => value * 255);
  }
  return {
    daylight,
    night,
    fog: clamp(world.fog ?? 0),
    wind: clamp(world.wind ?? 1, 0, 3),
    fire: clamp(world.fire ?? 1),
    skyTint,
  };
}

function polygon(ctx, points, fill) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}

function glow(ctx, x, y, radius, stops, stretch = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, stretch);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  stops.forEach(([position, color]) => gradient.addColorStop(position, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

function pine(ctx, x, base, height, phase, time, world, distant = false) {
  const wind = (Math.sin(time * .67 + phase) * 1.65 + Math.sin(time * 1.13 + phase * .7) * .55) * world.wind;
  const sway = height * .012 * wind;
  const tone = distant ? material([12, 24, 29], [65, 91, 78], world, 1.3) : material([4, 12, 17], [33, 65, 44], world, .6);
  const trunk = distant ? material([17, 29, 32], [81, 87, 64], world, 1.3) : material([10, 20, 24], [78, 76, 52], world, .6);
  const branchLight = material([36, 39, 30], [74, 105, 62], world, .6, [80, 68, 39]);
  polygon(ctx, [[x - height * .012, base], [x + sway, base - height], [x + height * .012, base]], trunk);
  for (let row = 0; row < 11; row += 1) {
    const down = .09 + row * .073;
    const spread = height * (.025 + down * .22);
    const y = base - height * (1 - down);
    const tip = x + sway * (1 - down) ** 2;
    const uneven = Math.sin(row * 12.7 + phase) * .13;
    const flutter = Math.sin(time * 1.7 + row * .9 + phase) * height * .0018 * world.wind;
    polygon(ctx, [
      [tip, y - height * .065],
      [tip - spread * (1 + uneven), y + height * .069 + flutter],
      [tip - spread * .38, y + height * .049],
      [tip - spread * .67, y + height * .088 + flutter],
      [tip, y + height * .045],
      [tip + spread * .91, y + height * .084 - flutter],
      [tip + spread * .50, y + height * .048],
      [tip + spread * (1.05 - uneven), y + height * .061 - flutter],
    ], tone);
    if (!distant && (row > 6 || world.daylight > .05)) {
      ctx.strokeStyle = branchLight;
      ctx.lineWidth = .65;
      ctx.globalAlpha *= .35 + world.daylight * .27;
      ctx.beginPath();
      ctx.moveTo(tip + spread * .50, y + height * .048);
      ctx.lineTo(tip + spread * .91, y + height * .084 - flutter);
      ctx.stroke();
      ctx.globalAlpha /= .35 + world.daylight * .27;
    }
  }
}

function shore(ctx, width, height, x, y, size, flicker, world) {
  const outline = [[0, .872], [.037, .866], [.079, .880], [.12, .875], [.165, .892], [.201, .890], [.235, .899], [.265, .914], [.293, .934], [.33, .941], [.352, .964], [.393, .978], [.43, 1]];
  const points = outline.map(([px, py]) => [px * width, py * height]);
  const earth = ctx.createLinearGradient(0, height * .87, 0, height);
  earth.addColorStop(0, material([11, 21, 25], [83, 92, 73], world, .5));
  earth.addColorStop(.55, material([7, 15, 20], [59, 71, 59], world, .35));
  earth.addColorStop(1, material([4, 11, 16], [41, 55, 48], world, .25));
  polygon(ctx, [...points, [0, height]], earth);

  ctx.save();
  ctx.clip();
  ctx.save();
  ctx.globalAlpha *= world.fire;
  glow(ctx, x, y + size * .2, size * 5.5, [[0, `rgba(214, 130, 58, ${.18 * flicker})`], [.45, 'rgba(161, 98, 45, .045)'], [1, 'rgba(161, 98, 45, 0)']], .38);
  ctx.restore();
  // Broad, barely lit facets give the ledge depth without introducing objects.
  polygon(ctx, [[width * .14, height * .90], [width * .23, height * .91], [width * .28, height * .945], [width * .225, height * .934]], material([13, 20, 21], [97, 102, 80], world, .5));
  polygon(ctx, [[width * .27, height * .938], [width * .327, height * .949], [width * .357, height * .977], [width * .312, height * .963]], material([10, 18, 22], [71, 86, 71], world, .4));
  ctx.restore();

  ctx.strokeStyle = material([31, 44, 45], [128, 139, 113], world, .5);
  ctx.lineWidth = .7;
  ctx.beginPath();
  points.slice(0, 11).forEach(([px, py], index) => index ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
  ctx.stroke();
  const edgeLight = ctx.createLinearGradient(x - size * 3, 0, x + size * 3, 0);
  edgeLight.addColorStop(0, 'rgba(179, 118, 63, 0)');
  edgeLight.addColorStop(.5, `rgba(208, 145, 77, ${.29 * flicker * world.fire})`);
  edgeLight.addColorStop(1, 'rgba(179, 118, 63, 0)');
  ctx.strokeStyle = edgeLight;
  ctx.beginPath();
  points.slice(3, 9).forEach(([px, py], index) => index ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
  ctx.stroke();
}

function fire(ctx, x, y, size, time, flicker, world) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);

  const wind = (Math.sin(time * .63) * .12 + Math.sin(time * 1.07 + .7) * .045) * world.wind;
  // Smoke and sparks are fixed populations animated exclusively by scene time.
  for (let index = 0; index < 5; index += 1) {
    const phase = (time * .062 + index / 5) % 1;
    const sx = phase * (.4 * world.wind + wind * 4) + Math.sin(phase * 5.5 + time * .31) * phase * .28 * world.wind;
    const sy = -1.08 - phase * 3.2;
    const alpha = Math.sin(phase * Math.PI) * .035 * world.fire;
    glow(ctx, sx, sy, .28 + phase * .63, [[0, `rgba(163, 164, 145, ${alpha})`], [1, 'rgba(163, 164, 145, 0)']], .65 + phase * .6);
  }

  function stone(dx, dy, rx, ry, front) {
    const gradient = ctx.createLinearGradient(dx, dy - ry, dx, dy + ry);
    gradient.addColorStop(0, front ? material([35, 45, 40], [137, 139, 119], world, .4, [113, 96, 70]) : material([28, 41, 37], [115, 125, 104], world, .4, [77, 78, 62]));
    gradient.addColorStop(1, material([16, 29, 27], [65, 80, 66], world, .3, [25, 39, 32]));
    polygon(ctx, [[dx - rx, dy], [dx - rx * .55, dy - ry], [dx + rx * .38, dy - ry * .9], [dx + rx, dy + ry * .1], [dx + rx * .5, dy + ry], [dx - rx * .55, dy + ry * .8]], gradient);
  }
  [[-.76, -.05, .29, .14], [-.35, -.24, .29, .14], [.18, -.26, .27, .13], [.70, -.12, .29, .17], [.92, .17, .25, .15]].forEach(([dx, dy, rx, ry]) => stone(dx, dy, rx, ry, false));
  glow(ctx, 0, .08, .9, [[0, `rgba(255, 142, 43, ${.28 * world.fire})`], [.6, `rgba(220, 82, 24, ${.08 * world.fire})`], [1, 'rgba(220, 82, 24, 0)']], .32);

  ctx.lineCap = 'round';
  ctx.strokeStyle = material([25, 31, 27], [93, 77, 54], world, .3, [100, 66, 41]); ctx.lineWidth = .20;
  ctx.beginPath(); ctx.moveTo(-.58, .02); ctx.lineTo(.47, .32); ctx.stroke();
  ctx.strokeStyle = material([36, 37, 28], [124, 100, 64], world, .3, [144, 91, 51]); ctx.lineWidth = .17;
  ctx.beginPath(); ctx.moveTo(-.54, .27); ctx.lineTo(.53, -.08); ctx.stroke();
  ctx.strokeStyle = `rgba(232, 133, 52, ${.65 * world.fire})`; ctx.lineWidth = .035;
  ctx.beginPath(); ctx.moveTo(-.41, .02); ctx.lineTo(.39, .25); ctx.moveTo(-.39, .21); ctx.lineTo(.43, -.03); ctx.stroke();
  for (let index = 0; index < 6; index += 1) {
    ctx.fillStyle = `rgba(255, ${138 + index * 10}, 59, ${(.5 + Math.sin(time * 3 + index) * .15) * world.fire})`;
    ctx.beginPath(); ctx.arc(Math.sin(index * 12.3) * .35, .06 + Math.cos(index * 7.4) * .10, .035 + index % 2 * .013, 0, TAU); ctx.fill();
  }

  const lean = wind + Math.sin(time * 4.6) * .07;
  const curl = Math.sin(time * 6.1 + .8) * .08;
  const tall = 1.46 * flicker + Math.sin(time * 3.4) * .09;
  const flame = ctx.createLinearGradient(0, -1.6, 0, .2);
  flame.addColorStop(0, '#e5a75b'); flame.addColorStop(.5, '#ed8b3c'); flame.addColorStop(1, '#b94c25');
  ctx.save();
  ctx.globalAlpha *= world.fire;
  ctx.scale(1, .25 + .75 * Math.sqrt(world.fire));
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-.37, .10);
  ctx.bezierCurveTo(-.76 + curl, -.29, -.09 - lean, -.83, -.16 + lean * 1.7, -tall);
  ctx.bezierCurveTo(.20 + lean, -1.05, .01 + curl, -.78, .23 + curl, -.61);
  ctx.bezierCurveTo(.43, -.79, .41 + lean, -1.03, .42 + lean * 1.4, -1.01 - curl);
  ctx.bezierCurveTo(.72 - curl, -.36, .58, .03, .24, .14);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#ffd183';
  ctx.beginPath(); ctx.moveTo(-.17, .10);
  ctx.bezierCurveTo(-.40 - curl * .5, -.16, .04 + lean * .5, -.45, -.015 + lean, -.92 * flicker);
  ctx.bezierCurveTo(.28 + curl, -.59, .07, -.37, .27, -.15);
  ctx.quadraticCurveTo(.35, .09, -.17, .10); ctx.fill();
  ctx.fillStyle = '#ffe9b2';
  ctx.beginPath(); ctx.moveTo(-.065, .10); ctx.quadraticCurveTo(-.19, -.1, .04 + lean * .4, -.40 * flicker); ctx.quadraticCurveTo(.04, -.12, .16, .09); ctx.closePath(); ctx.fill();
  ctx.restore();

  [[-.65, .37, .29, .15], [-.08, .47, .34, .18], [.52, .39, .29, .17]].forEach(([dx, dy, rx, ry]) => stone(dx, dy, rx, ry, true));
  for (let index = 0; index < 12; index += 1) {
    const phase = (time * (.105 + index * .003) + index * .273) % 1;
    const ex = Math.sin(phase * 6 + index * 2.9) * (.16 + phase * .43) + phase * (.7 + wind * 3);
    const ey = -.55 - phase * (2.5 + index % 4 * .3);
    const alpha = Math.sin(phase * Math.PI) * .60 * world.fire;
    ctx.fillStyle = `rgba(246, ${151 + index % 4 * 17}, 78, ${alpha})`;
    ctx.beginPath(); ctx.ellipse(ex, ey, .022 + index % 3 * .005, .033 + index % 2 * .010, -.3, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/** CSS pixels and scene time in seconds; optional world values default to night. */
export function drawCamp(context, { width, height, time = 0, world = {} }) {
  if (!context || width <= 0 || height <= 0) return;
  const ctx = context;
  const x = width * .215;
  const y = height * .896;
  const size = Math.max(14, Math.min(29, width * .045, height * .033));
  const flicker = .94 + Math.sin(time * 5.4) * .055 + Math.sin(time * 8.7) * .035;
  const weather = conditions(world);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.save();
  ctx.globalAlpha *= weather.fire;
  glow(ctx, x, y - size * .4, size * 6.8, [[0, `rgba(231, 133, 54, ${.13 * flicker})`], [.35, 'rgba(186, 101, 37, .028)'], [1, 'rgba(186, 101, 37, 0)']]);
  ctx.restore();

  // Muted, smaller pines recede behind the larger trees at the shore's edge.
  pine(ctx, width * .043, height * .878, Math.min(height * .175, width * .32), 2.9, time, weather, true);
  pine(ctx, width * .102, height * .881, Math.min(height * .132, width * .23), 4.4, time, weather, true);
  pine(ctx, width * .145, height * .892, Math.min(height * .075, width * .13), 5.7, time, weather, true);
  shore(ctx, width, height, x, y, size, flicker, weather);
  pine(ctx, width * .012, height * .878, Math.min(height * .285, width * .54), .7, time, weather);
  pine(ctx, width * .078, height * .883, Math.min(height * .172, width * .30), 2.6, time, weather);
  pine(ctx, width * .118, height * .887, Math.min(height * .102, width * .18), 4.1, time, weather);
  fire(ctx, x, y, size, time, flicker, weather);
  ctx.restore();
}
