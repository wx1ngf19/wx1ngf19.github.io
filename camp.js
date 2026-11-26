const TAU = Math.PI * 2;

function polygon(ctx, points, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function line(ctx, points, color, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
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

function pine(ctx, x, base, height, phase, time) {
  const breeze = Math.sin(time * .66 + phase) * 1.5 + Math.sin(time * 1.07 + phase) * .6;
  const tone = phase > 2 ? '#0a1519' : '#050d12';
  polygon(ctx, [[x - 1.5, base], [x + breeze, base - height], [x + 2.2, base]], '#101a1a');
  for (let row = 0; row < 11; row += 1) {
    const down = .09 + row * .073;
    const spread = height * (.025 + down * .21);
    const y = base - height * (1 - down);
    const tip = x + breeze * (1 - down) ** 2;
    const uneven = Math.sin(row * 12.7 + phase) * .1;
    polygon(ctx, [
      [tip, y - height * .065],
      [tip - spread * (1 + uneven), y + height * .069],
      [tip - spread * .38, y + height * .049],
      [tip - spread * .67, y + height * .088],
      [tip, y + height * .045],
      [tip + spread * .91, y + height * .084],
      [tip + spread * .50, y + height * .048],
      [tip + spread * (1.05 - uneven), y + height * .061],
    ], tone);
    if (row > 5) {
      line(ctx, [[tip + spread * .50, y + height * .048], [tip + spread * .91, y + height * .084]], 'rgba(104, 93, 59, .11)', .7);
    }
  }
}

function tent(ctx, time, flicker) {
  const breeze = Math.sin(time * .78) * 1.15 + Math.sin(time * 1.39) * .35;
  const roof = [205 + breeze * .16, -109 + breeze * .35];
  const rear = [144 + breeze * .22, -119 + breeze * .28];

  // A ridge, a broad canvas side, and an open front establish the tent's volume.
  glow(ctx, 219, -5, 102, [[0, 'rgba(0, 0, 0, .46)'], [1, 'rgba(0, 0, 0, 0)']], .20);
  polygon(ctx, [[99, -27], rear, roof, [153, -8]], '#343c35');
  const canvas = ctx.createLinearGradient(114, -100, 243, -3);
  canvas.addColorStop(0, '#303b36');
  canvas.addColorStop(.52, '#4d5140');
  canvas.addColorStop(1, `rgba(119, 98, 59, ${.84 + flicker * .10})`);
  polygon(ctx, [[99, -27], rear, roof, [153, -8]], canvas);
  const front = ctx.createLinearGradient(175, -79, 272, -18);
  front.addColorStop(0, '#77704b');
  front.addColorStop(1, '#6d4b2e');
  polygon(ctx, [[153, -8], roof, [280, -16]], front, 'rgba(181, 143, 81, .19)', .8);

  // The dark entrance and folded flap are deliberately visible at phone sizes.
  polygon(ctx, [[174, -10], [207 + breeze * .18, -91], [254, -17]], '#0c1516');
  polygon(ctx, [[207 + breeze * .18, -91], [217 + breeze, -37], [254, -17], [232, -16]], '#5e5135');
  line(ctx, [[207, -91], [217 + breeze, -37], [254, -17]], 'rgba(212, 166, 95, .32)', .8);
  polygon(ctx, [[174, -10], [182, -28], [231, -22], [244, -16]], '#161e1b');
  line(ctx, [[182, -21], [229, -19]], 'rgba(149, 106, 59, .17)', .7);

  line(ctx, [rear, roof, [280, -16]], '#b4a07a', 1.1);
  line(ctx, [[99, -27], rear], 'rgba(144, 150, 122, .44)', .9);
  line(ctx, [[153, -8], [280, -16]], 'rgba(207, 152, 83, .31)', 1.3);
  line(ctx, [[125, -74], [151 + breeze * .2, -55], [175, -47]], 'rgba(188, 173, 129, .13)', .7);
  line(ctx, [[130, -36], [156 + breeze * .2, -25]], 'rgba(12, 21, 20, .28)', 1);
  line(ctx, [[166, -108], [137 + breeze * .35, -23]], 'rgba(12, 22, 21, .21)', 1);
  line(ctx, [[183, -104], [151 + breeze * .3, -17]], 'rgba(179, 169, 120, .12)', .8);
  // Ropes and low pegs stay clear of the walking space around the fire.
  line(ctx, [rear, [80, -12]], 'rgba(177, 168, 126, .38)', .7);
  line(ctx, [roof, [307, 5]], 'rgba(178, 158, 111, .39)', .65);
  line(ctx, [[78, -14], [82, -8]], '#77705a', 1.8);
  line(ctx, [[305, 1], [309, 8]], '#8c7856', 1.8);
}

function telescope(ctx) {
  ctx.lineCap = 'round';
  // The three wooden legs recede to separate ground points.
  line(ctx, [[429, -48], [401, 23]], '#62523a', 3.4);
  line(ctx, [[430, -48], [466, 28]], '#3c3c31', 3.5);
  line(ctx, [[430, -48], [431, 34]], '#76583a', 3.9);
  line(ctx, [[415, -13], [452, -5], [431, 4], [415, -13]], 'rgba(122, 113, 78, .57)', 1.1);
  line(ctx, [[431, -48], [431, -64]], '#80795b', 3);
  ctx.fillStyle = '#b29b67';
  ctx.beginPath(); ctx.arc(431, -49, 3.1, 0, TAU); ctx.fill();

  ctx.save();
  ctx.translate(431, -69);
  ctx.rotate(-.43);
  const barrel = ctx.createLinearGradient(0, -7, 0, 7);
  barrel.addColorStop(0, '#576d66');
  barrel.addColorStop(.34, '#3f554f');
  barrel.addColorStop(1, '#17292b');
  polygon(ctx, [[-28, -6], [28, -8], [28, 8], [-28, 6]], barrel);
  polygon(ctx, [[-33, -3.4], [-26, -3.4], [-26, 3.4], [-33, 3.4]], '#838270');
  polygon(ctx, [[-18, -6.5], [-14, -6.6], [-14, 6.6], [-18, 6.5]], '#9e8c5b');
  polygon(ctx, [[23, -8], [29, -8], [29, 8], [23, 8]], '#b1a274');
  ctx.fillStyle = '#0b1b20';
  ctx.beginPath(); ctx.ellipse(29, 0, 2.5, 7, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(150, 190, 185, .35)'; ctx.lineWidth = .75;
  ctx.beginPath(); ctx.ellipse(29, -1, 1.8, 5.6, 0, Math.PI * 1.05, Math.PI * 1.72); ctx.stroke();
  line(ctx, [[-23, -5], [21, -6.2]], 'rgba(182, 185, 142, .24)', .8);
  ctx.restore();
}

function provisions(ctx, time) {
  // A low wooden supply box carries the camp's second, quieter light.
  polygon(ctx, [[365, 1], [404, -3], [415, 4], [375, 10]], '#57503a');
  polygon(ctx, [[375, 10], [415, 4], [414, 33], [375, 39]], '#3f3526');
  polygon(ctx, [[365, 1], [375, 10], [375, 39], [365, 28]], '#2b2c23');
  line(ctx, [[381, 10], [380, 37]], '#8c7650', 2);
  line(ctx, [[406, 6], [405, 33]], '#766241', 2);
  line(ctx, [[375, 21], [414, 15]], 'rgba(13, 19, 17, .6)', .8);
  line(ctx, [[376, 30], [414, 24]], 'rgba(13, 19, 17, .6)', .8);
  polygon(ctx, [[391, 9], [398, 8], [398, 13], [391, 14]], '#a39469');

  const lampX = 389;
  const lampY = -13;
  glow(ctx, lampX, lampY, 43, [[0, 'rgba(248, 180, 83, .18)'], [.35, 'rgba(214, 136, 56, .045)'], [1, 'rgba(214, 136, 56, 0)']]);
  ctx.strokeStyle = '#8d8c6a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(lampX, lampY - 11, 5, Math.PI, 0); ctx.stroke();
  polygon(ctx, [[lampX - 6, lampY - 7], [lampX + 6, lampY - 7], [lampX + 5, lampY + 10], [lampX - 5, lampY + 10]], '#867650');
  const glass = ctx.createLinearGradient(lampX - 4, 0, lampX + 4, 0);
  glass.addColorStop(0, '#bb8a3d'); glass.addColorStop(.52, '#ffdb8d'); glass.addColorStop(1, '#c28b40');
  polygon(ctx, [[lampX - 4, lampY - 5], [lampX + 4, lampY - 5], [lampX + 3.7, lampY + 7], [lampX - 3.7, lampY + 7]], glass);
  line(ctx, [[lampX - 6, lampY - 6], [lampX + 6, lampY - 6]], '#c2b080', 1.8);
  line(ctx, [[lampX - 5, lampY + 9], [lampX + 5, lampY + 9]], '#9c8b60', 2.2);
  line(ctx, [[lampX, lampY - 6], [lampX, lampY + 8]], 'rgba(76, 58, 35, .45)', .65);

  // Rolled bedding and a cup make the equipment feel recently used.
  ctx.save(); ctx.translate(294, 20); ctx.rotate(.12);
  polygon(ctx, [[-18, -9], [17, -9], [20, -6], [20, 5], [16, 8], [-18, 8]], '#3c5147');
  ctx.fillStyle = '#4b6050'; ctx.beginPath(); ctx.ellipse(-18, -.5, 5, 8.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#8c8764'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(-7, 8); ctx.moveTo(10, -9); ctx.lineTo(10, 8); ctx.stroke();
  ctx.strokeStyle = 'rgba(159, 172, 135, .28)'; ctx.lineWidth = .8;
  ctx.beginPath(); ctx.ellipse(-18, -.5, 2.5, 5.5, 0, .3, TAU); ctx.stroke();
  ctx.restore();
  polygon(ctx, [[352, 15], [360, 15], [359, 23], [353, 23]], '#8c8970');
  ctx.strokeStyle = '#8c8970'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(360, 18, 2.2, -Math.PI * .6, Math.PI * .6); ctx.stroke();
  line(ctx, [[353, 15], [359, 15]], '#d3b989', .7);
  ctx.strokeStyle = 'rgba(168, 162, 129, .07)'; ctx.lineWidth = .75;
  ctx.beginPath(); ctx.moveTo(356, 11); ctx.bezierCurveTo(353, 7, 359 + Math.sin(time) * 2, 4, 357, 0); ctx.stroke();
}

function campfire(ctx, time, flicker) {
  const x = 328;
  const y = 3;
  const smokeDrift = Math.sin(time * .34) * 9;
  // Low smoke has soft edges without a costly canvas blur.
  for (let index = 0; index < 6; index += 1) {
    const phase = (time * .055 + index / 6) % 1;
    const sx = x + phase * 28 + Math.sin(phase * 6 + time * .27) * 8 + smokeDrift * phase;
    const sy = y - 30 - phase * 98;
    const alpha = Math.sin(phase * Math.PI) * .045;
    glow(ctx, sx, sy, 8 + phase * 22, [[0, `rgba(157, 159, 139, ${alpha})`], [1, 'rgba(157, 159, 139, 0)']], .55 + phase * .8);
  }

  const stonePositions = [[-22, -2, 8, 4], [-11, -7, 8, 4], [4, -8, 7, 4], [18, -4, 8, 5], [24, 5, 7, 4]];
  function stone(dx, dy, rx, ry, front) {
    const gradient = ctx.createLinearGradient(x + dx, y + dy - ry, x + dx, y + dy + ry);
    gradient.addColorStop(0, front ? '#76634a' : '#645a44');
    gradient.addColorStop(1, '#242b24');
    polygon(ctx, [[x + dx - rx, y + dy], [x + dx - rx * .6, y + dy - ry], [x + dx + rx * .4, y + dy - ry * .9], [x + dx + rx, y + dy + ry * .1], [x + dx + rx * .55, y + dy + ry], [x + dx - rx * .55, y + dy + ry * .8]], gradient);
  }
  stonePositions.forEach(([dx, dy, rx, ry]) => stone(dx, dy, rx, ry, false));
  glow(ctx, x, y, 25, [[0, 'rgba(255, 150, 51, .30)'], [.55, 'rgba(223, 91, 29, .13)'], [1, 'rgba(223, 91, 29, 0)']], .32);

  ctx.lineCap = 'round';
  line(ctx, [[x - 15, y - 1], [x + 13, y + 8]], '#68472c', 6);
  line(ctx, [[x - 14, y + 7], [x + 14, y - 3]], '#96613a', 5);
  line(ctx, [[x - 9, y], [x + 11, y + 5]], 'rgba(224, 132, 55, .68)', 1.2);
  line(ctx, [[x - 10, y + 5], [x + 11, y - 2]], 'rgba(243, 169, 69, .55)', .9);
  for (let index = 0; index < 7; index += 1) {
    const emberX = x + Math.sin(index * 12.3) * 11;
    const emberY = y + Math.cos(index * 7.4) * 3;
    ctx.fillStyle = `rgba(255, ${130 + index * 9}, 58, ${.5 + Math.sin(time * 3 + index) * .18})`;
    ctx.beginPath(); ctx.arc(emberX, emberY, .8 + index % 2 * .4, 0, TAU); ctx.fill();
  }

  ctx.save(); ctx.translate(x, y); ctx.scale(24, 24);
  const sway = Math.sin(time * 4.2) * .085 + Math.sin(time * 6.7) * .03;
  const flame = ctx.createLinearGradient(0, -1.55, 0, .2);
  flame.addColorStop(0, '#eaa655'); flame.addColorStop(.5, '#f08a38'); flame.addColorStop(1, '#bc4e26');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-.37, .10);
  ctx.bezierCurveTo(-.76, -.31, -.08, -.77, -.15 + sway, -1.46 * flicker);
  ctx.bezierCurveTo(.18, -1.16, .03, -.83, .22, -.66);
  ctx.bezierCurveTo(.42, -.89, .43, -.97, .43 + sway, -1.06);
  ctx.bezierCurveTo(.76, -.36, .56, .03, .23, .14);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffcf77';
  ctx.beginPath(); ctx.moveTo(-.17, .1);
  ctx.bezierCurveTo(-.39, -.17, .05, -.47, -.01 + sway * .6, -.91 * flicker);
  ctx.bezierCurveTo(.26, -.59, .10, -.41, .27, -.16);
  ctx.quadraticCurveTo(.37, .09, -.17, .1); ctx.fill();
  ctx.fillStyle = '#ffe7ad';
  ctx.beginPath(); ctx.moveTo(-.07, .10); ctx.quadraticCurveTo(-.18, -.1, .04, -.36); ctx.quadraticCurveTo(.04, -.12, .16, .09); ctx.closePath(); ctx.fill();
  ctx.restore();

  [[-17, 10, 8, 4], [-2, 13, 9, 5], [14, 11, 8, 5]].forEach(([dx, dy, rx, ry]) => stone(dx, dy, rx, ry, true));
  for (let index = 0; index < 14; index += 1) {
    const phase = (time * (.105 + index * .002) + index * .271) % 1;
    const ex = x + Math.sin(phase * 6 + index * 2.9) * (5 + phase * 9) + phase * 19;
    const ey = y - 17 - phase * (61 + index % 4 * 10);
    const alpha = Math.sin(phase * Math.PI) * .66;
    ctx.fillStyle = `rgba(250, ${153 + index % 4 * 17}, 77, ${alpha})`;
    ctx.beginPath(); ctx.ellipse(ex, ey, .55 + index % 3 * .15, .95 + index % 2 * .3, -.35, 0, TAU); ctx.fill();
  }
}

/** Draw in CSS-pixel coordinates; time is seconds supplied by the scene clock. */
export function drawCamp(context, { width, height, time = 0 }) {
  if (!context || width <= 0 || height <= 0) return;
  // At narrow widths the complete campsite fits before the lower-right emblem.
  // Height limits the footprint on short landscape screens.
  const reservedRight = width < 600 ? 112 : 138;
  const scale = Math.min((width - reservedRight) / 540, height * .001, 1.25);
  if (scale <= 0) return;
  const flicker = .91 + Math.sin(time * 5.4) * .045 + Math.sin(time * 8.7) * .035;
  const ctx = context;
  ctx.save();
  ctx.translate(0, height * .95);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const shore = [[-20, -29], [23, -37], [62, -34], [93, -39], [127, -32], [167, -29], [216, -24], [264, -15], [313, -12], [357, -2], [391, 7], [423, 15], [460, 34], [490, 40], [522, 62], [557, 91]];
  const ground = ctx.createLinearGradient(0, -35, 0, 110);
  ground.addColorStop(0, '#101a1b'); ground.addColorStop(.45, '#0a1216'); ground.addColorStop(1, '#050b10');
  polygon(ctx, [...shore, [557, height / scale], [-20, height / scale]], ground);
  line(ctx, shore.slice(0, 13), 'rgba(104, 125, 116, .27)', .9);
  // Broken rock planes make a ledge rather than a flat black foreground.
  polygon(ctx, [[25, -34], [73, -30], [127, 3], [79, -5], [0, -14]], '#111b1c');
  polygon(ctx, [[367, 4], [414, 16], [443, 42], [400, 29]], '#151c1b');
  polygon(ctx, [[412, 20], [461, 36], [490, 51], [467, 62], [445, 49]], '#0e1619');
  line(ctx, [[403, 17], [416, 22], [427, 35]], 'rgba(104, 114, 98, .23)', .8);
  line(ctx, [[446, 40], [464, 47], [479, 49]], 'rgba(126, 130, 105, .15)', .7);

  pine(ctx, 13, -33, 184, .7, time);
  pine(ctx, 61, -33, 131, 2.6, time);
  pine(ctx, 103, -30, 86, 4.1, time);
  glow(ctx, 325, -17, 169, [[0, `rgba(221, 133, 55, ${.15 * flicker})`], [.33, 'rgba(193, 115, 43, .07)'], [1, 'rgba(193, 115, 43, 0)']], .64);
  glow(ctx, 326, 11, 113, [[0, `rgba(237, 149, 64, ${.17 * flicker})`], [.6, 'rgba(159, 96, 47, .035)'], [1, 'rgba(159, 96, 47, 0)']], .25);

  tent(ctx, time, flicker);
  telescope(ctx);
  provisions(ctx, time);
  // Three cut logs await the next evening; their end grain catches warm light.
  [[270, 22], [285, 26], [279, 15]].forEach(([x, y], index) => {
    line(ctx, [[x - 14, y - 6], [x + 7, y]], '#443b29', 8);
    ctx.fillStyle = '#8e6d43'; ctx.beginPath(); ctx.ellipse(x + 7, y, 4.4, 4, .15, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4c422e'; ctx.lineWidth = .7; ctx.beginPath(); ctx.ellipse(x + 7, y, 2, 2.5, .15, .1, TAU - .4); ctx.stroke();
    line(ctx, [[x - 12, y - 8], [x + 2, y - 3]], 'rgba(173, 129, 70, .25)', .8);
  });
  campfire(ctx, time, flicker);

  // Sparse grasses soften the meeting of stone, soil, and the tent pegs.
  for (let index = 0; index < 17; index += 1) {
    const x = 44 + index * 25 + Math.sin(index * 4.2) * 6;
    const y = 6 + (x / 490) ** 2 * 43 + Math.sin(index * 2.3) * 5;
    const sway = Math.sin(time * .88 + index * .9) * 1.3;
    const tall = 3 + index % 4 * 1.8;
    ctx.strokeStyle = index > 8 && index < 14 ? 'rgba(135, 111, 64, .42)' : 'rgba(66, 88, 73, .48)';
    ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 1, y - tall * .65, x - 2 + sway, y - tall);
    ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1, y - tall * .5, x + 3 + sway, y - tall * .7); ctx.stroke();
  }
  ctx.restore();
}
