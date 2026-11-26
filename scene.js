import { drawCamp } from './camp.js?v=campfire-2';

const SEA_LEVEL = 0.205;

const vertexSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform vec2 uDrift;
  uniform float uTime;
  uniform vec3 uRipple;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      value += noise(p) * amplitude;
      p = turn * p * 2.05 + 13.4;
      amplitude *= 0.5;
    }
    return value;
  }

  vec3 sky(vec2 p) {
    vec2 drift = uPointer * vec2(0.010, 0.006) + uDrift;
    vec2 q = p + drift;
    vec3 color = mix(vec3(0.006, 0.012, 0.022), vec3(0.017, 0.039, 0.051), 1.0 - q.y);
    float spine = q.y - 0.48 - q.x * 0.42 - sin(q.x * 2.1) * 0.045;
    vec2 current = vec2(uTime * 0.009, -uTime * 0.005);
    float cloud = fbm(q * 5.2 + vec2(7.0, 2.0) + current);
    float dust = fbm(vec2(q.x * 17.0, spine * 24.0) + 19.0 - current * 0.7);
    float fine = noise(q * 54.0 + cloud * 2.8 + current * 1.4);
    float band = exp(-pow(abs(spine + (cloud - 0.5) * 0.13) * 7.4, 1.45));
    float core = exp(-pow(abs(spine) * 14.0, 1.2));
    float knots = smoothstep(0.28, 0.78, cloud) * (0.45 + dust * 0.8);
    vec3 stardust = mix(vec3(0.17, 0.25, 0.28), vec3(0.37, 0.29, 0.20), smoothstep(-0.45, 0.60, q.x));
    color += stardust * band * knots * (0.58 + fine * 1.35);
    color += vec3(0.28, 0.31, 0.30) * core * pow(dust, 2.0) * 0.72;
    float rift = 1.0 - smoothstep(0.008, 0.056, abs(spine + (cloud - 0.5) * 0.11));
    color *= 1.0 - rift * (0.4 + fine * 0.35);
    color += vec3(0.021, 0.045, 0.047) * cloud * exp(-abs(spine) * 2.8);

    float horizonGlow = exp(-abs(p.y - ${SEA_LEVEL}) * 26.0);
    color += vec3(0.065, 0.105, 0.11) * horizonGlow;
    color += vec3(0.12, 0.075, 0.035) * horizonGlow * exp(-pow((q.x + 0.32) * 2.5, 2.0));
    return color;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
    float horizon = ${SEA_LEVEL};
    vec3 color;

    if (uv.y >= horizon) {
      color = sky(p);
    } else {
      float depth = horizon - uv.y;
      float time = uTime * 0.48;
      vec2 water = vec2(p.x * 3.2 / (depth + 0.075), 0.65 / (depth + 0.028));
      float swell = noise(water * vec2(0.55, 0.24) + vec2(time * 0.21, -time * 0.19));
      float smallWaves = noise(water * vec2(1.7, 0.8) - time * 0.17);
      float wave = sin(water.y * 2.1 + swell * 5.8 + sin(water.x * 0.7 + time) * 0.55 - time);
      float crest = pow(max(wave, 0.0), 16.0);
      float fineCrest = pow(max(sin(water.y * 5.3 + smallWaves * 5.0 - time * 1.7), 0.0), 23.0);
      float reflectionX = -0.40 + uPointer.x * 0.035 + (swell - 0.5) * depth * 0.5;
      float reflection = exp(-pow((p.x - reflectionX) / (0.045 + depth * 0.72), 2.0));
      float wideReflection = exp(-pow((p.x + 0.2) / (0.20 + depth * 1.3), 2.0));
      float distanceFade = exp(-depth * 5.0);
      color = vec3(0.008, 0.021, 0.031) + vec3(0.012, 0.021, 0.024) * wideReflection;
      color += vec3(0.065, 0.14, 0.18) * (crest * 0.6 + fineCrest * 0.17) * wideReflection;
      color += vec3(0.32, 0.24, 0.15) * reflection * (crest * 0.7 + fineCrest * 0.22) * distanceFade;
      color += vec3(0.19, 0.25, 0.25) * reflection * exp(-depth * 35.0) * (0.25 + smallWaves * 0.25);
      color += vec3(0.09, 0.15, 0.18) * exp(-depth * 75.0);

      float age = uTime - uRipple.z;
      if (age >= 0.0 && age < 5.0) {
        vec2 rippleCenter = vec2((uRipple.x - 0.5) * aspect, uRipple.y);
        float radius = length((p - rippleCenter) * vec2(1.0, 1.7));
        float ring = sin((radius - age * 0.13) * 100.0);
        float envelope = exp(-pow((radius - age * 0.13) * 19.0, 2.0)) * exp(-age * 1.1);
        color += vec3(0.17, 0.24, 0.25) * max(ring, 0.0) * envelope * 0.4;
      }
      color *= 0.5 + 0.5 * smoothstep(0.0, 0.14, uv.y);
    }

    float edge = pow(abs(uv.x - 0.5) * 1.35, 2.0);
    color *= 1.0 - edge * 0.5;
    color += (hash(gl_FragCoord.xy + fract(uTime * 0.3)) - 0.5) / 255.0;
    gl_FragColor = vec4(color, 1.0);
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
  const uniforms = Object.fromEntries(['uResolution', 'uPointer', 'uDrift', 'uTime', 'uRipple'].map((key) => [key, gl.getUniformLocation(program, key)]));

  return {
    resize(width, height) {
      const maxPixels = navigator.hardwareConcurrency <= 4 ? 900000 : 1400000;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.4, Math.sqrt(maxPixels / (width * height)));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.uResolution, width, height);
    },
    draw(time, pointer, ripple, drift) {
      gl.uniform1f(uniforms.uTime, time);
      gl.uniform2f(uniforms.uPointer, pointer.x, pointer.y);
      gl.uniform2f(uniforms.uDrift, drift.x, drift.y);
      gl.uniform3f(uniforms.uRipple, ripple.x, ripple.y, ripple.time);
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
  let paused = false;
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
    const seeking = !paused && Math.abs(target.x) + Math.abs(target.y) > .005;
    for (const star of stars) {
      const depth = .65 + star.depth * .35;
      const movingX = star.x + pointer.x * star.depth * 13 - drift.x * height * depth;
      const x = ((movingX + 16) % (width + 32) + width + 32) % (width + 32) - 16;
      const y = star.y - pointer.y * star.depth * 9 + drift.y * height * depth;
      if (y < 5 || y > height * 0.790) continue;
      const twinkle = 0.83 + Math.sin(time * 0.45 + star.phase) * 0.17;
      const distance = Math.hypot(x - pointerX, y - pointerY);
      const proximity = seeking ? Math.max(0, 1 - distance / 115) : 0;
      const edgeFade = Math.min(1, y / 12, (height * .790 - y) / 12);
      const alpha = Math.min(1, (star.prominent ? .85 : star.alpha * 1.12) * twinkle + proximity * .35) * edgeFade;
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

    const meteorPhase = (time + 17) % 19;
    if (meteorPhase < 1.8 && !paused) {
      const progress = meteorPhase / 1.8;
      const x = width * (0.82 - progress * 0.23);
      const y = height * (0.13 + progress * 0.16);
      const tailX = width * 0.09;
      const tailY = -height * 0.062;
      const trail = context.createLinearGradient(x, y, x + tailX, y + tailY);
      trail.addColorStop(0, `rgba(224, 219, 198, ${Math.sin(progress * Math.PI) * 0.45})`);
      trail.addColorStop(1, 'rgba(224, 219, 198, 0)');
      context.strokeStyle = trail;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + tailX, y + tailY);
      context.stroke();
    }
    drawCamp(context, { width, height, time });
  }

  function draw() {
    // One bounded camera drift keeps the galaxy and its stars travelling together.
    drift.x = Math.sin(time * .035) * .032 + Math.sin(time * .011) * .012;
    drift.y = Math.sin(time * .027) * .020;
    renderer?.draw(time, pointer, ripple, drift);
    drawStars();
  }

  function animate(timestamp) {
    request = 0;
    if (paused || !active || document.hidden) return;
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
    if (!paused && active && !document.hidden && !request) {
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
      if (paused) return;
      const effect = y < SEA_LEVEL ? ripple : starlight;
      effect.x = x;
      effect.y = y;
      effect.time = time;
    },
    setPaused(value) {
      paused = value;
      cancelAnimationFrame(request);
      request = 0;
      if (paused) draw();
      else resume();
    },
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
