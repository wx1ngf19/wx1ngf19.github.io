// One composition, fitted uniformly to the viewport from its bottom-left corner.
const COMPOSITION_WIDTH = 1440;
const COMPOSITION_HEIGHT = 1000;

function composeShore() {
  const width = COMPOSITION_WIDTH, height = COMPOSITION_HEIGHT;
  const outline = [[0, .820], [.035, .808], [.070, .818], [.110, .812], [.155, .821],
    [.200, .815], [.245, .824], [.285, .836], [.325, .856],
    [.355, .886], [.390, .914], [.425, .936], [.465, .960], [.505, .983], [.535, 1]];
  const points = outline.map(([x, y]) => [x * width, y * height]);
  const groundAt = x => {
    const position = Math.max(0, x);
    for (let index = 1; index < points.length; index += 1) {
      if (position > points[index][0]) continue;
      const [ax, ay] = points[index - 1], [bx, by] = points[index];
      return ay + (by - ay) * (position - ax) / (bx - ax);
    }
    return height;
  };
  const fire = {
    x: width * .245, y: height * .934,
    size: Math.max(14, Math.min(29, width * .045, height * .033)),
  };
  const rows = [
    [-.016, .235, .42, 2.9, true], [.018, .270, .46, 4.4, true],
    [.045, .205, .37, 5.7, true], [.073, .228, .36, 1.4, true],
    [.099, .178, .30, 3.3, true], [.126, .160, .27, 6.8, true],
    [.153, .136, .23, 2.2, true], [.179, .113, .19, 5.1, true],
    [-.008, .390, .70, .7, false], [.027, .330, .59, 2.6, false],
    [.063, .275, .48, 4.1, false], [.096, .215, .37, 6.3, false],
    [.127, .168, .29, 1.9, false], [.152, .127, .22, 3.8, false],
  ];
  const trees = rows.map(([position, tall, wide, phase, distant], index) => {
    const x = position * width;
    const treeHeight = Math.min(height * tall, width * wide);
    return { x, base: groundAt(x) + height * (distant ? .013 : .034) + index % 3 * 2,
      height: treeHeight, phase, distant };
  }).sort((a, b) => a.base - b.base);
  return { width, height, points, groundAt, fire, trees };
}

export const shoreComposition = composeShore();

export function foregroundFrame(width, height) {
  const scale = Math.max(0, Math.min(width / COMPOSITION_WIDTH, height / COMPOSITION_HEIGHT));
  return { x: 0, y: height - COMPOSITION_HEIGHT * scale, scale };
}

let cached;

// Screen-space geometry is also available to placement and contact checks.
export function shoreGeometry(width, height) {
  if (cached?.width === width && cached?.height === height) return cached;
  const frame = foregroundFrame(width, height);
  const point = (x, y) => [frame.x + x * frame.scale, frame.y + y * frame.scale];
  const [fireX, fireY] = point(shoreComposition.fire.x, shoreComposition.fire.y);
  cached = {
    width, height, frame,
    points: shoreComposition.points.map(([x, y]) => point(x, y)),
    groundAt: x => frame.scale > 0
      ? frame.y + shoreComposition.groundAt((x - frame.x) / frame.scale) * frame.scale : height,
    fire: { x: fireX, y: fireY, size: shoreComposition.fire.size * frame.scale },
    trees: shoreComposition.trees.map(tree => ({ ...tree,
      x: frame.x + tree.x * frame.scale, base: frame.y + tree.base * frame.scale,
      height: tree.height * frame.scale })),
  };
  return cached;
}
