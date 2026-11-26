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
    houseLight: clamp(world.houseLight ?? night),
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
  const compact = width < 1000 && width / height < 1.65;
  const outline = [[0, .872], [.037, .866], [.079, .880], [.12, .875], [.165, .883], [.205, .880], [.245, .881], [.265, .887], [.285, .900], [.31, .925], ...(compact ? [[.35, .931], [.40, .935], [.45, .946], [.50, .960], [.55, .980], [.59, 1]] : [[.34, .944], [.365, .966], [.403, .983], [.44, 1]])];
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

function cabin(ctx, width, height, world) {
  const compact = width < 1000 && width / height < 1.65;
  const cabinWidth = Math.min(210, Math.max(98, width * .145), height * .44);
  const scale = cabinWidth / 100;
  const x = width * (compact ? .35 : .092);
  const y = height * (compact ? .975 : .916);
  const light = world.houseLight;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // A thin stone footing and a flattened shadow keep the small house grounded.
  ctx.fillStyle = 'rgba(2, 8, 10, .28)';
  ctx.beginPath(); ctx.ellipse(0, 3, 52, 8, -.015, 0, TAU); ctx.fill();
  glow(ctx, -3, 5, 48, [[0, `rgba(244, 180, 91, ${.14 * light})`], [.45, `rgba(216, 143, 62, ${.055 * light})`], [1, 'rgba(216, 143, 62, 0)']], .23);
  polygon(ctx, [[-47, -1], [18, -2], [49, -6], [49, 0], [19, 5], [-47, 5]], material([21, 32, 31], [112, 122, 103], world, .4));
  polygon(ctx, [[18, -2], [49, -6], [49, 0], [19, 5]], material([15, 28, 28], [78, 94, 83], world, .4));
  ctx.strokeStyle = material([13, 24, 25], [63, 79, 69], world, .4);
  ctx.lineWidth = .65;
  ctx.beginPath();
  ctx.moveTo(-29, 0); ctx.lineTo(-31, 5); ctx.moveTo(-7, 0); ctx.lineTo(-5, 5);
  ctx.moveTo(14, 0); ctx.lineTo(15, 4); ctx.moveTo(34, -3); ctx.lineTo(35, 2); ctx.stroke();

  // A gable, one timber facade and a shaded side wall establish modest volume.
  polygon(ctx, [[-44, -38], [17, -38], [17, 0], [-44, 0]], material([23, 32, 30], [108, 101, 75], world, .4));
  polygon(ctx, [[17, -38], [46, -29], [46, -5], [17, 0]], material([15, 27, 27], [72, 83, 68], world, .4));
  polygon(ctx, [[-44, -38], [-14, -65], [17, -38]], material([27, 35, 31], [123, 111, 78], world, .4));
  ctx.strokeStyle = material([11, 24, 25], [71, 79, 61], world, .4);
  ctx.lineWidth = .7;
  for (let row = 0; row < 5; row += 1) {
    const by = -34 + row * 7;
    ctx.beginPath(); ctx.moveTo(-43, by); ctx.lineTo(17, by);
    ctx.lineTo(45, by + 7); ctx.stroke();
  }
  ctx.strokeStyle = material([31, 42, 35], [151, 137, 94], world, .4);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-43, -37); ctx.lineTo(-43, 0);
  ctx.moveTo(17, -37); ctx.lineTo(17, -.5); ctx.stroke();

  // The roof is slate rather than a bright accent; a narrow chimney stays still.
  polygon(ctx, [[-50, -40], [-14, -71], [-14, -65], [-44, -35]], material([18, 30, 33], [87, 102, 96], world, .4));
  polygon(ctx, [[-14, -71], [20, -61], [50, -31], [17, -40]], material([13, 26, 30], [58, 77, 75], world, .4));
  ctx.strokeStyle = material([35, 48, 47], [137, 154, 137], world, .4);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-49, -40); ctx.lineTo(-14, -71); ctx.lineTo(20, -61); ctx.stroke();
  ctx.strokeStyle = material([6, 18, 23], [37, 57, 57], world, .4);
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-49, -39); ctx.lineTo(-43, -35);
  ctx.moveTo(17, -40); ctx.lineTo(50, -31); ctx.stroke();
  polygon(ctx, [[25, -75], [32, -73], [32, -49], [25, -51]], material([27, 38, 36], [119, 127, 108], world, .4));
  polygon(ctx, [[32, -73], [36, -75], [36, -51], [32, -49]], material([17, 31, 31], [76, 96, 88], world, .4));
  polygon(ctx, [[23, -77], [34, -78], [38, -75], [31, -72], [23, -74]], material([35, 46, 41], [152, 156, 132], world, .4));

  const frame = material([24, 35, 31], [96, 85, 57], world, .35);
  polygon(ctx, [[-37, -32], [-11, -32], [-11, -8], [-37, -8]], frame);
  const glassColor = blend(blend([9, 21, 26], [44, 67, 69], world.daylight), [244, 185, 91], light);
  const glass = ctx.createLinearGradient(-34, -29, -14, -10);
  glass.addColorStop(0, rgb(blend(glassColor, [255, 225, 163], light * .28)));
  glass.addColorStop(1, rgb(glassColor));
  polygon(ctx, [[-34.5, -29.5], [-13.5, -29.5], [-13.5, -10.5], [-34.5, -10.5]], glass);
  ctx.save();
  ctx.beginPath(); ctx.rect(-34.5, -29.5, 21, 19); ctx.clip();
  ctx.strokeStyle = `rgba(177, 204, 195, ${world.daylight * .25 * (1 - light)})`;
  ctx.lineWidth = 2.3;
  ctx.beginPath(); ctx.moveTo(-34, -25); ctx.lineTo(-17, -30);
  ctx.moveTo(-33, -14); ctx.lineTo(-14, -22); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = frame; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-24, -30); ctx.lineTo(-24, -10);
  ctx.moveTo(-35, -20); ctx.lineTo(-13, -20); ctx.stroke();
  glow(ctx, -24, -20, 29, [[0, `rgba(246, 184, 86, ${.10 * light})`], [.35, `rgba(238, 156, 62, ${.035 * light})`], [1, 'rgba(238, 156, 62, 0)']]);

  polygon(ctx, [[-6, -30], [10, -30], [10, 0], [-6, 0]], material([12, 25, 26], [72, 77, 56], world, .35));
  ctx.strokeStyle = material([27, 37, 30], [111, 107, 73], world, .35);
  ctx.lineWidth = .9;
  ctx.beginPath(); ctx.moveTo(-2, -28); ctx.lineTo(-2, -.5);
  ctx.moveTo(6, -28); ctx.lineTo(6, -.5); ctx.stroke();
  ctx.fillStyle = material([42, 48, 36], [166, 152, 101], world, .35);
  ctx.beginPath(); ctx.arc(6.2, -13, .9, 0, TAU); ctx.fill();
  polygon(ctx, [[-9, 1], [12, 1], [16, 4], [-8, 6]], material([24, 36, 34], [121, 128, 105], world, .3));
  // Every artificial-light contribution follows the shared world's houseLight.
  ctx.fillStyle = `rgba(251, 192, 104, ${.48 * light})`;
  ctx.fillRect(-5.5, -.3, 15, .9);
  const spill = ctx.createLinearGradient(0, 0, 0, 21);
  spill.addColorStop(0, `rgba(242, 179, 88, ${.15 * light})`);
  spill.addColorStop(1, 'rgba(226, 146, 60, 0)');
  polygon(ctx, [[-5, 1], [9, 1], [20, 21], [-14, 21]], spill);
  ctx.restore();
}

function fire(ctx, x, y, size, time, flicker, world) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);

  // The flattened ash bed and contact shadow anchor every stone to the ledge.
  ctx.fillStyle = 'rgba(2, 6, 8, .32)';
  ctx.beginPath(); ctx.ellipse(.04, .25, 1.22, .39, .04, 0, TAU); ctx.fill();
  ctx.fillStyle = material([11, 17, 17], [61, 65, 49], world, .3);
  ctx.beginPath(); ctx.ellipse(0, .10, 1.05, .30, .04, 0, TAU); ctx.fill();

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
  const x = width * .205;
  const y = height * .905;
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
  pine(ctx, width * .018, height * .878, Math.min(height * .212, width * .39), 2.9, time, weather, true);
  pine(ctx, width * .048, height * .881, Math.min(height * .160, width * .28), 4.4, time, weather, true);
  pine(ctx, width * .086, height * .892, Math.min(height * .091, width * .158), 5.7, time, weather, true);
  shore(ctx, width, height, x, y, size, flicker, weather);
  pine(ctx, width * .012, height * .878, Math.min(height * .355, width * .66), .7, time, weather);
  pine(ctx, width * .055, height * .883, Math.min(height * .215, width * .375), 2.6, time, weather);
  pine(ctx, width * .080, height * .887, Math.min(height * .1275, width * .225), 4.1, time, weather);
  cabin(ctx, width, height, weather);
  fire(ctx, x, y, size, time, flicker, weather);
  ctx.restore();
}
