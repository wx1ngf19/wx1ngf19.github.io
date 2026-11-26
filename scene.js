import { drawCamp } from './camp.js?v=ecosystem-2';
import { fragmentSource } from './sky.js?v=ecosystem-2';
import { sampleWorld, cloudAt, SEA_LEVEL } from './world.js?v=ecosystem-2';


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
  const uniforms = Object.fromEntries(['uResolution', 'uPointer', 'uDrift', 'uTime', 'uRipple', 'uSun', 'uMoon', 'uWorld', 'uWeather', 'uCloudOffset', 'uGalaxy', 'uMotion', 'uWaves'].map((key) => [key, gl.getUniformLocation(program, key)]));

  return {
    resize(width, height) {
      const maxPixels = navigator.hardwareConcurrency <= 4 ? 800000 : 1150000;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.4, Math.sqrt(maxPixels / (width * height)));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.uResolution, width, height);
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
      gl.uniform2f(uniforms.uGalaxy, world.galaxyAngle * motion, world.galaxySpin);
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

  function prepareStars() {
    const random = randomGenerator(19870921);
    const count = Math.min(1800, Math.max(260, Math.floor(width * height / 1000)));
    stars = Array.from({ length: count }, (_, index) => {
      const x = random() * width;
      let y = random() * height * 0.79;
      if (index % 2 === 0) {
        const qx = (x - width * 0.5) / height;
        y = height * (0.52 - qx * 0.42 - Math.sin(qx * 2.1) * 0.045 + (random() - 0.5) * 0.23);
      }
      return {
        x, y,
        radius: random() * 0.65 + 0.20,
        depth: 0.3 + random() * 0.7,
        alpha: 0.14 + random() * 0.61,
        phase: random() * Math.PI * 2,
        prominent: index % 127 === 0,
        warm: index % 7 === 0,
      };
    });
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
    const rotation = world.galaxyAngle * motionAmount;
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    if (world.night > .001) for (const star of stars) {
      const depth = .65 + star.depth * .35;
      const sx = star.x - width * .5;
      const sy = height * .48 - star.y;
      const movingX = width * .5 + cos * sx - sin * sy + pointer.x * star.depth * 13 - drift.x * height * depth;
      const x = ((movingX + 16) % (width + 32) + width + 32) % (width + 32) - 16;
      const y = height * .48 - sin * sx - cos * sy - pointer.y * star.depth * 9 + drift.y * height * depth;
      if (y < 5 || y > height * 0.790) continue;
      const twinkle = .80 + Math.sin(world.seconds * .72 + star.phase) * .20 * motionAmount;
      const distance = Math.hypot(x - pointerX, y - pointerY);
      const proximity = seeking ? Math.max(0, 1 - distance / 115) : 0;
      const edgeFade = Math.min(1, y / 12, (height * .790 - y) / 12);
      const cloud = cloudAt(x / width, 1 - y / height, width / height, world);
      const alpha = Math.min(1, (star.prominent ? .85 : star.alpha * 1.12) * twinkle + proximity * .35) * edgeFade * world.night * (1 - cloud) ** 2 * (1 - world.fog * .5);
      if (proximity > 0 && star.alpha > .36) near.push({ x, y, distance });
      const color = star.warm ? '222, 199, 155' : '193, 215, 228';
      context.fillStyle = `rgba(${color}, ${alpha})`;
      context.beginPath();
      context.arc(x, y, star.radius + (star.prominent ? .25 : 0), 0, Math.PI * 2);
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

    const meteorPhase = ((world.seconds + 17) % 19 + 19) % 19;
    if (meteorPhase < 1.8 && world.night > .1 && motionAmount > .5) {
      const progress = meteorPhase / 1.8;
      const x = width * (0.82 - progress * 0.23);
      const y = height * (0.13 + progress * 0.16);
      const tailX = width * 0.09;
      const tailY = -height * 0.062;
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
    drawCamp(context, { width, height, time: world.seconds * Math.max(.25, motionAmount), world });
  }

  function draw() {
    world = sampleWorld();
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
    prepareStars();
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
