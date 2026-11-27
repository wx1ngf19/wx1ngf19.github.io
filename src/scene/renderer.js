import { drawCamp } from './camp.js?v=reverie-8';
import { drawBirds } from './fauna.js?v=reverie-8';
import { drawRain } from './atmosphere.js?v=reverie-8';
import { fragmentSource } from './sky.js?v=reverie-8';
import { sampleWorld, cloudAt, smooth, SEA_LEVEL } from '../world/time.js?v=reverie-8';


const vertexSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;


function makeRenderer(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || 'The sky could not be rendered.');
    }
    return shader;
  }

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'The sky could not be linked.');
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['uResolution', 'uPointer', 'uDrift', 'uTime', 'uRipple', 'uSun', 'uMoon', 'uWorld', 'uWeather', 'uCloudOffset', 'uCloudForm', 'uGalaxy', 'uCosmos', 'uBand', 'uBandDetail', 'uGalaxyShape', 'uGalaxyPose', 'uPhenomena', 'uSkyFlow', 'uMotion', 'uWaves'].map((key) => [key, gl.getUniformLocation(program, key)]));
  const maxPixels = navigator.hardwareConcurrency <= 4 ? 800000 : 1150000;
  let pixelBudget = maxPixels;
  let viewportWidth = 1, viewportHeight = 1;
  let frameCount = 0, frameTotal = 0;

  return {
    resize(width, height) {
      viewportWidth = width;
      viewportHeight = height;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.4, Math.sqrt(pixelBudget / (width * height)));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.uResolution, width, height);
    },
    observeFrame(elapsed) {
      if (elapsed > 250) return;
      frameTotal += elapsed;
      if (++frameCount < 60) return;
      const average = frameTotal / frameCount;
      frameCount = 0;
      frameTotal = 0;
      // Keep silhouettes and stars crisp; adapt only the expensive sky surface.
      const nextBudget = average > 45 ? Math.max(380000, pixelBudget * .72)
        : average < 35 ? Math.min(maxPixels, pixelBudget * 1.04) : pixelBudget;
      if (Math.abs(nextBudget - pixelBudget) > 1000) {
        pixelBudget = nextBudget;
        this.resize(viewportWidth, viewportHeight);
      }
    },
    draw(time, pointer, ripple, drift, world, motion) {
      gl.uniform1f(uniforms.uTime, time);
      gl.uniform2f(uniforms.uPointer, pointer.x, pointer.y);
      gl.uniform2f(uniforms.uDrift, drift.x, drift.y);
      gl.uniform3f(uniforms.uRipple, ripple.x, ripple.y, ripple.time);
      gl.uniform3f(uniforms.uSun, ...world.sun);
      gl.uniform4f(uniforms.uMoon, ...world.moon);
      gl.uniform4f(uniforms.uWorld, world.daylight, world.night, world.twilight, world.fire);
      gl.uniform4f(uniforms.uWeather, world.coverage, world.fog, world.wind, world.humidity);
      gl.uniform2f(uniforms.uCloudOffset, ...world.cloudOffset);
      gl.uniform4f(uniforms.uCloudForm, ...world.cloudForm);
      gl.uniform2f(uniforms.uGalaxy, world.galaxyAngle * motion, world.galaxySpin);
      gl.uniform4f(uniforms.uCosmos, ...world.cosmos);
      const celestial = world.celestial || DEFAULT_NIGHT;
      gl.uniform4f(uniforms.uBand, ...celestial.band);
      gl.uniform4f(uniforms.uBandDetail, ...celestial.bandDetail);
      gl.uniform4f(uniforms.uGalaxyShape, ...celestial.galaxyShape);
      gl.uniform4f(uniforms.uGalaxyPose, ...celestial.galaxyPose);
      gl.uniform4f(uniforms.uPhenomena, world.aurora, world.nightCloud, world.seaGlow, world.rainbow);
      gl.uniform4f(uniforms.uSkyFlow, world.rain, world.lightning * motion, ...world.skyFlow);
      gl.uniform4f(uniforms.uWaves, ...world.waves);
      gl.uniform1f(uniforms.uMotion, motion);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

function randomGenerator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}

const DEFAULT_NIGHT = {
  nightIndex: 0, seed: 19870921,
  starDensity: 1, brightFraction: .016, warmFraction: .18, starScale: 1,
  twinkleStrength: .8, twinkleRate: 1, bandFraction: .48,
  band: [0, .18, .045, .52],
  bandDetail: [23, 17, .4, .4],
  galaxyShape: [0, 3, 4.6, .28],
  galaxyPose: [.4, .74, .2, .68],
};

// Pure, indexed sampling keeps star identities stable across same-night resizes.
// Positions are stored before rotation; y converts the shader's upward UV to canvas.
export function prepareNightStars(width, height, celestial = DEFAULT_NIGHT) {
  if (!(width > 0 && height > 0)) return [];
  const night = { ...DEFAULT_NIGHT, ...celestial };
  const count = Math.min(2000, Math.max(120, Math.floor(width * height / 1000 * night.starDensity)));
  const seed = (night.seed >>> 0) ^ Math.imul(night.nightIndex | 0, 0x85ebca6b);
  const [, bandWidth, bend, centerY] = night.band;
  const [seedX, seedY] = night.bandDetail;
  const frequency = 1.7 + ((seedY % 3) + 3) % 3;
  return Array.from({ length: count }, (_, index) => {
    const random = randomGenerator(seed ^ Math.imul(index + 1, 0x9e3779b9));
    const x = random() * width;
    const band = random() < night.bandFraction;
    const qx = (x - width * .5) / height;
    // Summing uniforms makes a soft concentration, rather than two sharp band edges.
    const spread = (random() + random() + random() - 1.5) * bandWidth * .56;
    const skyY = .21 + random() * .79;
    const uvY = band ? centerY + Math.sin(qx * frequency + seedX * .07) * bend
      + Math.sin(qx * frequency * .43 + seedY) * bend * .35 + spread : skyY;
    const prominent = random() < night.brightFraction;
    const warm = random() < night.warmFraction;
    const temperature = random();
    const color = warm
      ? [231 + temperature * 12, 190 + temperature * 27, 147 + temperature * 36]
      : [181 + temperature * 34, 206 + temperature * 21, 224 + temperature * 13];
    return {
      x, y: (1 - uvY) * height, band, prominent, warm,
      color: color.map(Math.round).join(', '),
      radius: (prominent ? .73 + random() * .43 : .18 + random() ** 1.6 * .67) * night.starScale,
      depth: .3 + random() * .7,
      alpha: prominent ? .78 + random() * .2 : .13 + random() ** 1.2 * .57,
      phase: random() * Math.PI * 2,
      phase2: random() * Math.PI * 2,
      phase3: random() * Math.PI * 2,
      frequency: (.22 + random() * .50) * night.twinkleRate,
      frequency2: (1.1 + random() * 1.9) * night.twinkleRate,
      frequency3: (3.8 + random() * 3.3) * night.twinkleRate,
      twinkleAmount: (.45 + random() * .8) * night.twinkleStrength,
    };
  });
}

export function createUniverse(surface, starCanvas) {
  const root = document.documentElement;
  const context = starCanvas.getContext('2d');
  let renderer = null;
  try {
    renderer = makeRenderer(surface);
  } catch (error) {
    console.warn('Using the quiet sky fallback.', error.message);
  }
  root.dataset.renderer = renderer ? 'webgl' : 'canvas';

  let width = 0;
  let height = 0;
  let stars = [];
  let preparedNightIndex = null;
  let preparedWidth = 0;
  let preparedHeight = 0;
  let time = 0;
  let lastFrame = 0;
  let request = 0;
  let motionAmount = 1;
  let world = sampleWorld();
  let active = true;
  let resizing = 0;
  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const drift = { x: 0, y: 0 };
  const ripple = { x: 0.5, y: 0.2, time: -100 };
  const starlight = { x: 0.5, y: 0.5, time: -100 };

  function prepareStars(celestial) {
    stars = prepareNightStars(width, height, celestial);
    preparedNightIndex = celestial.nightIndex;
    preparedWidth = width;
    preparedHeight = height;
  }

  function drawStars() {
    if (!context) return;
    context.clearRect(0, 0, width, height);

    if (!renderer) {
      context.strokeStyle = 'rgba(112, 159, 174, .09)';
      context.lineWidth = 0.7;
      for (let row = 0; row < 45; row += 1) {
        const y = height * (0.80 + (row / 45) ** 2 * 0.20);
        context.beginPath();
        for (let x = 0; x <= width + 20; x += 20) {
          const wave = Math.sin(x * 0.017 + row * 0.7 + time * 0.35) * (row / 45) * 5;
          if (x === 0) context.moveTo(x, y + wave);
          else context.lineTo(x, y + wave);
        }
        context.stroke();
      }
    }

    const near = [];
    const pointerX = (pointer.x * .5 + .5) * width;
    const pointerY = (.5 - pointer.y * .5) * height;
    const seeking = motionAmount > .5 && Math.abs(target.x) + Math.abs(target.y) > .005;
    const celestial = world.celestial || DEFAULT_NIGHT;
    const rotation = world.galaxyAngle * motionAmount + world.cosmos[0] + celestial.band[0];
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const centerY = height * (1 - celestial.band[3]);
    const starVisibility = world.night * (1 - smooth(.65, .90, world.coverage)) * (1 - smooth(.42, .68, world.fog));
    if (starVisibility > .001) for (const star of stars) {
      const depth = star.band ? 1 : .65 + star.depth * .35;
      const sx = star.x - width * .5;
      const sy = centerY - star.y;
      const movingX = width * .5 + cos * sx - sin * sy - pointer.x * height * .010
        + pointer.x * (star.depth - .5) * 5 - drift.x * height * depth;
      const x = ((movingX + 16) % (width + 32) + width + 32) % (width + 32) - 16;
      const y = centerY - sin * sx - cos * sy + pointer.y * height * .006
        - pointer.y * (star.depth - .5) * 4 + drift.y * height * depth;
      if (y < 5 || y > height * 0.790) continue;
      // Independent broad frequency bands avoid synchronized pulsing, with
      // stronger scintillation close to the horizon.
      const scintillation = (Math.sin(world.seconds * star.frequency + star.phase) * .52
        + Math.sin(world.seconds * star.frequency2 + star.phase2) * .31
        + Math.sin(world.seconds * star.frequency3 + star.phase3) * .17) * star.twinkleAmount;
      const twinkle = Math.max(.25, .82 + scintillation * .18 * motionAmount * (.6 + smooth(.3, .79, y / height) * 1.15));
      const distance = Math.hypot(x - pointerX, y - pointerY);
      const proximity = seeking ? Math.max(0, 1 - distance / 115) : 0;
      const edgeFade = Math.min(1, y / 12, (height * .790 - y) / 12);
      const cloud = cloudAt(x / width, 1 - y / height, width / height, world);
      const alpha = Math.min(1, (star.prominent ? .85 : star.alpha * 1.12) * twinkle + proximity * .35) * edgeFade * starVisibility * (1 - cloud) ** 2 * (1 - world.fog * .5);
      if (proximity > 0 && star.alpha > .36 && alpha > .05) near.push({ x, y, distance });
      const color = star.color;
      context.fillStyle = `rgba(${color}, ${alpha})`;
      context.beginPath();
      context.arc(x, y, (star.radius + (star.prominent ? .25 : 0)) * (1 + scintillation * .16 * motionAmount), 0, Math.PI * 2);
      context.fill();
      if (star.prominent) {
        const glow = context.createRadialGradient(x, y, 0, x, y, 6);
        glow.addColorStop(0, `rgba(${color}, ${alpha * 0.4})`);
        glow.addColorStop(1, `rgba(${color}, 0)`);
        context.fillStyle = glow;
        context.fillRect(x - 6, y - 6, 12, 12);
        context.strokeStyle = `rgba(${color}, ${alpha * 0.45})`;
        context.lineWidth = 0.5;
        context.beginPath();
        context.moveTo(x - 3, y);
        context.lineTo(x + 3, y);
        context.moveTo(x, y - 3);
        context.lineTo(x, y + 3);
        context.stroke();
      }
    }

    if (near.length > 1) {
      near.sort((a, b) => a.distance - b.distance);
      const chosen = near.slice(0, 4).sort((a, b) => Math.atan2(a.y - pointerY, a.x - pointerX) - Math.atan2(b.y - pointerY, b.x - pointerX));
      context.lineWidth = .5;
      for (let index = 1; index < chosen.length; index += 1) {
        const a = chosen[index - 1];
        const b = chosen[index];
        context.strokeStyle = `rgba(212, 205, 180, ${.20 * (1 - Math.max(a.distance, b.distance) / 115)})`;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
    }

    const lightAge = time - starlight.time;
    if (lightAge >= 0 && lightAge < 2.4) {
      const x = starlight.x * width;
      const y = (1 - starlight.y) * height;
      const fade = Math.exp(-lightAge * 2.0);
      context.save();
      context.beginPath();
      context.rect(0, 0, width, height * (1 - SEA_LEVEL));
      context.clip();
      const halo = context.createRadialGradient(x, y, 0, x, y, 8 + lightAge * 14);
      halo.addColorStop(0, `rgba(235, 222, 186, ${fade * .23})`);
      halo.addColorStop(1, 'rgba(235, 222, 186, 0)');
      context.fillStyle = halo;
      context.fillRect(x - 44, y - 44, 88, 88);
      for (let index = 0; index < 16; index += 1) {
        const angle = index * 2.39996;
        const radius = 3 + lightAge * (15 + index % 5 * 7);
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius * .8;
        context.fillStyle = `rgba(231, 218, 181, ${fade * .82})`;
        context.beginPath();
        context.arc(px, py, (.7 + index % 3 * .3) * Math.sqrt(fade), 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }

    const meteorSlot = Math.floor(world.seconds / 37);
    const eventSeed = Math.sin(meteorSlot * 127.1 + 311.7) * 43758.5453;
    const eventRandom = eventSeed - Math.floor(eventSeed);
    const meteorDuration = 1.25 + eventRandom * 1.1;
    const meteorPhase = ((world.seconds % 37) + 37) % 37 - 4 - eventRandom * 17;
    if (eventRandom > .19 && meteorPhase >= 0 && meteorPhase < meteorDuration && world.night > .1 && motionAmount > .5) {
      const progress = meteorPhase / meteorDuration;
      const direction = eventRandom > .55 ? 1 : -1;
      const x = width * (.2 + eventRandom * .6 + direction * (progress - .5) * .22);
      const y = height * (.09 + eventRandom * .24 + progress * .13);
      const tailX = -direction * width * (.055 + eventRandom * .045);
      const tailY = -height * .062;
      const trail = context.createLinearGradient(x, y, x + tailX, y + tailY);
      const visibility = world.night * (1 - cloudAt(x / width, 1 - y / height, width / height, world));
      trail.addColorStop(0, `rgba(224, 219, 198, ${Math.sin(progress * Math.PI) * .60 * visibility})`);
      trail.addColorStop(1, 'rgba(224, 219, 198, 0)');
      context.strokeStyle = trail;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + tailX, y + tailY);
      context.stroke();
    }
    drawBirds(context, width, height, world, motionAmount);
    drawCamp(context, { width, height, time: world.seconds * Math.max(.25, motionAmount), world });
    drawRain(context, width, height, world, motionAmount);
  }

  function draw() {
    world = sampleWorld();
    const celestial = world.celestial || DEFAULT_NIGHT;
    // world selects its next night at noon, while stars are hidden, not midnight.
    if (celestial.nightIndex !== preparedNightIndex || width !== preparedWidth || height !== preparedHeight) prepareStars(celestial);
    // The shared clock keeps running even when the tab or browser is closed.
    drift.x = (Math.sin(world.seconds * .055) * .055 + Math.sin(world.seconds * .017) * .025) * motionAmount;
    drift.y = Math.sin(world.seconds * .046) * .033 * motionAmount;
    renderer?.draw(time, pointer, ripple, drift, world, motionAmount);
    root.dataset.weather = world.weather;
    root.style.setProperty('--daylight', world.daylight.toFixed(3));
    drawStars();
  }

  function animate(timestamp) {
    request = 0;
    if (!active || document.hidden) return;
    if (!lastFrame) lastFrame = timestamp;
    const elapsed = timestamp - lastFrame;
    if (elapsed >= 31) {
      renderer?.observeFrame(elapsed);
      const delta = Math.min(elapsed / 1000, 0.08);
      time += delta;
      const ease = 1 - Math.exp(-delta * 2.4);
      pointer.x += (target.x - pointer.x) * ease;
      pointer.y += (target.y - pointer.y) * ease;
      lastFrame = timestamp;
      draw();
    }
    request = requestAnimationFrame(animate);
  }

  function resume() {
    if (active && !document.hidden && !request) {
      lastFrame = 0;
      request = requestAnimationFrame(animate);
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    starCanvas.width = Math.round(width * ratio);
    starCanvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderer?.resize(width, height);
    draw();
    resizing = 0;
  }

  function scheduleResize() {
    if (!resizing) resizing = requestAnimationFrame(resize);
  }

  function visibilityChange() {
    if (document.hidden) {
      cancelAnimationFrame(request);
      request = 0;
    } else resume();
  }

  window.addEventListener('resize', scheduleResize, { passive: true });
  document.addEventListener('visibilitychange', visibilityChange);
  surface.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    renderer = null;
    root.dataset.renderer = 'canvas';
    draw();
  });
  surface.addEventListener('webglcontextrestored', () => {
    try {
      renderer = makeRenderer(surface);
      renderer?.resize(width, height);
      root.dataset.renderer = renderer ? 'webgl' : 'canvas';
    } catch {
      renderer = null;
      root.dataset.renderer = 'canvas';
    }
    draw();
  });
  resize();
  resume();

  return {
    setPointer(x, y) { target.x = x; target.y = y; },
    interact(x, y) {
      const effect = y < SEA_LEVEL ? ripple : starlight;
      effect.x = x;
      effect.y = y;
      effect.time = time;
    },
    setMotionAmount(value) { motionAmount = Math.max(.1, Math.min(1, value)); },
    setActive(value) {
      active = value;
      if (!active) {
        cancelAnimationFrame(request);
        request = 0;
      } else resume();
    },
    destroy() {
      cancelAnimationFrame(request);
      cancelAnimationFrame(resizing);
      renderer?.destroy();
      window.removeEventListener('resize', scheduleResize);
      document.removeEventListener('visibilitychange', visibilityChange);
    },
  };
}
