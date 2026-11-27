let cached;

export function shoreGeometry(width, height) {
  if (cached?.width === width && cached?.height === height) return cached;
  const compact = width < 1000 && width / height < 1.65;
  const outline = [[0, .820], [.035, .808], [.070, .818], [.110, .812], [.155, .821],
    [.200, .815], [.245, .824], [.285, .836], [.325, .856],
    ...(compact ? [[.365, .842], [.405, .850], [.450, .863], [.490, .876], [.530, .895],
      [.570, .919], [.610, .947], [.650, .975], [.680, 1]]
      : [[.355, .886], [.390, .914], [.425, .936], [.465, .960], [.505, .983], [.535, 1]])];
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
    x: width * (compact ? .17 : .245), y: height * (compact ? .944 : .934),
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
  cached = { width, height, compact, points, groundAt, fire, trees };
  return cached;
}
