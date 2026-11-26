const LISTENING_VOLUME = .42;

export function createSoundtrack(audio, button) {
  const root = document.documentElement;
  const clickWave = button.querySelector('.music-click-wave');
  let wanted = false;
  let revision = 0;
  let fadeFrame = 0;
  let waveAnimation;

  function show(state) {
    const playing = state === 'playing';
    root.dataset.audio = state;
    button.dataset.audio = state;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-busy', String(state === 'loading'));
    const label = state === 'loading' ? '取消加载背景音乐' : playing ? '暂停背景音乐' : state === 'error' ? '重试播放背景音乐' : '播放背景音乐';
    button.setAttribute('aria-label', label);
    button.title = state === 'loading' ? 'Cancel music' : playing ? 'Pause music' : state === 'error' ? 'Retry music' : 'Play music';
  }

  function cancelFade() {
    cancelAnimationFrame(fadeFrame);
    fadeFrame = 0;
  }

  function fadeIn() {
    cancelFade();
    const initial = audio.volume;
    const started = performance.now();
    function step(now) {
      if (!wanted || audio.paused || document.hidden) return;
      const progress = Math.max(0, Math.min(1, (now - started) / 1800));
      audio.volume = Math.max(0, Math.min(1, initial + (LISTENING_VOLUME - initial) * progress));
      fadeFrame = progress < 1 ? requestAnimationFrame(step) : 0;
    }
    fadeFrame = requestAnimationFrame(step);
  }

  function pulse() {
    waveAnimation?.cancel();
    const subtle = matchMedia('(prefers-reduced-motion: reduce)').matches;
    waveAnimation = clickWave.animate([
      { opacity: .7, transform: 'scale(.72)' },
      { opacity: 0, transform: `scale(${subtle ? 1.16 : 2.05})` },
    ], { duration: subtle ? 400 : 1050, easing: 'cubic-bezier(.16,.65,.25,1)' });
  }

  function pause() {
    wanted = false;
    revision += 1;
    cancelFade();
    audio.pause();
    show(audio.error ? 'error' : 'paused');
  }

  async function play() {
    wanted = true;
    const current = ++revision;
    show('loading');
    audio.volume = 0;
    if (audio.error) audio.load();
    try {
      await audio.play();
      if (current !== revision && !wanted) audio.pause();
    } catch {
      if (current !== revision) return;
      wanted = false;
      cancelFade();
      audio.pause();
      show('error');
    }
  }

  function toggle() {
    pulse();
    if (wanted || !audio.paused) pause();
    else void play();
  }

  button.addEventListener('click', toggle);
  audio.addEventListener('playing', () => {
    if (!wanted || document.hidden) { pause(); return; }
    show('playing');
    fadeIn();
  });
  audio.addEventListener('waiting', () => { if (wanted) show('loading'); });
  audio.addEventListener('pause', () => {
    // Ignore an old queued pause event if a newer play request has already started.
    if (!audio.paused) return;
    wanted = false;
    cancelFade();
    show(audio.error ? 'error' : 'paused');
  });
  audio.addEventListener('error', () => {
    wanted = false;
    revision += 1;
    cancelFade();
    audio.pause();
    show('error');
  });
  audio.addEventListener('ended', () => { if (!audio.loop) pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  show('paused');
  return { toggle };
}
