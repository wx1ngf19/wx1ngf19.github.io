const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const fade = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Ground is an oblique plane. A directional light projects height / tan(elevation).
export function groundLights(world, fire, flicker = 1) {
  const clear = (1 - clamp(world.coverage ?? 0) * .88) * (1 - clamp(world.fog ?? 0) * .85);
  const lights = [];
  function celestial(kind, position, altitude, strength) {
    if (!Number.isFinite(altitude) || altitude <= 0 || strength < .001) return;
    const horizontal = clamp((position - .5) * 1.8, -.95, .95);
    const length = 1 / Math.max(.18, Math.tan(altitude));
    lights.push({ kind, position, length, dx: -horizontal * length,
      dy: Math.sqrt(1 - horizontal * horizontal) * .23 * length,
      alpha: strength * clear * fade(.01, .16, altitude) });
  }
  celestial('sun', world.sun?.[0], world.sun?.[2], .20 * (world.daylight ?? 0));
  const moonPhase = .5 - .5 * Math.cos(world.moon?.[2] ?? 0);
  celestial('moon', world.moon?.[0], world.moon?.[3], .065 * (world.night ?? 0) * moonPhase);
  if ((world.fire ?? 0) > .001) lights.push({ kind: 'fire', x: fire.x, y: fire.y,
    height: fire.size * 1.35 * flicker, radius: fire.size * 7.5,
    alpha: .20 * world.fire, maxLength: fire.size * 7 });
  return lights;
}

export function lightAt(light, x, width) {
  if (light.kind === 'fire') return light;
  const horizontal = clamp((x / width - light.position) * 1.8, -.95, .95);
  return { ...light, dx: horizontal * light.length,
    dy: Math.sqrt(1 - horizontal * horizontal) * .23 * light.length };
}

export function projectShadow([x, ground, height], light) {
  if (light.kind !== 'fire') return [x + height * light.dx, ground + height * light.dy];
  const fraction = Math.min(height, light.height * .93) / light.height;
  const ratio = fraction / (1 - fraction);
  const dx = (x - light.x) * ratio, dy = (ground - light.y) * ratio;
  const limit = Math.min(1, light.maxLength / Math.max(1, Math.hypot(dx, dy)));
  return [x + dx * limit, ground + dy * limit];
}

export function shadowHull(points) {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const chain = vertices => {
    const result = [];
    for (const point of vertices) {
      while (result.length >= 2 && cross(result.at(-2), result.at(-1), point) <= 0) result.pop();
      result.push(point);
    }
    return result.slice(0, -1);
  };
  return [...chain(sorted), ...chain(sorted.slice().reverse())];
}
