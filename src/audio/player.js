import { soundtracks } from './library.js?v=reverie-7';
import { sampleWorld } from '../world/time.js?v=reverie-7';

const LISTENING_VOLUME = .42;

export function createSoundtrack(audio, button) {
  const root = document.documentElement;
  const clickWave = button.querySelector('.music-click-wave');
  const credit = document.querySelector('#music-credit');
  let wanted = false;
  let revision = 0;
  let fadeFrame = 0;
  let waveAnimation;
  let currentTrack = null;
  let currentBank = null;
  let changingBank = false;
  let failedTrack = false;
  const queues = { day: [], night: [] };

  function bankForTime() {
    const light = sampleWorld().daylight;
    if (currentBank === 'day' && light >= .24) return 'day';
    if (currentBank === 'night' && light <= .62) return 'night';
    return light > .45 ? 'day' : 'night';
  }

  function chooseTrack(forceNext = false) {
    const bank = bankForTime();
    if (!forceNext && !failedTrack && currentTrack && currentBank === bank && !audio.ended) return;
    if (!queues[bank].length) {
      const shuffled = soundtracks[bank].slice();
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const other = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
      }
      if (shuffled[0]?.id === currentTrack?.id) shuffled.push(shuffled.shift());
      queues[bank] = shuffled;
    }
    currentTrack = queues[bank].shift();
    currentBank = bank;
    failedTrack = false;
    audio.src = new URL(currentTrack.src, document.baseURI).href;
    audio.dataset.track = currentTrack.id;
    audio.dataset.bank = bank;
    audio.loop = false;
  }

  function show(state) {
    const playing = state === 'playing';
    root.dataset.audio = state;
    button.dataset.audio = state;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-busy', String(state === 'loading'));
    const label = state === 'loading' ? '取消加载背景音乐' : playing ? '暂停背景音乐' : state === 'error' ? '重试播放背景音乐' : '播放背景音乐';
    button.setAttribute('aria-label', currentTrack ? `${label}：${currentTrack.title}，${currentTrack.artist}` : label);
    const action = state === 'loading' ? 'Cancel music' : playing ? 'Pause music' : state === 'error' ? 'Retry music' : 'Play music';
    button.title = currentTrack ? `${action} — ${currentTrack.title} · ${currentTrack.artist}` : action;
    if (credit && currentTrack) {
      credit.hidden = false;
      credit.href = new URL(`./pages/music.html#${encodeURIComponent(currentTrack.id)}`, document.baseURI).href;
      credit.title = `精选曲目与音乐署名 · ${currentTrack.title}`;
      credit.setAttribute('aria-label', `精选曲目与音乐署名：${currentTrack.title}，${currentTrack.artist}`);
    }
  }

  function cancelFade() {
    cancelAnimationFrame(fadeFrame);
    fadeFrame = 0;
  }

  function fadeTo(target, duration, complete) {
    cancelFade();
    const initial = audio.volume;
    const started = performance.now();
    function step(now) {
      if (!wanted || audio.paused || document.hidden) return;
      const progress = Math.max(0, Math.min(1, (now - started) / duration));
      audio.volume = Math.max(0, Math.min(1, initial + (target - initial) * progress));
      if (progress < 1) fadeFrame = requestAnimationFrame(step);
      else { fadeFrame = 0; complete?.(); }
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
    changingBank = false;
    cancelFade();
    audio.pause();
    show(audio.error ? 'error' : 'paused');
  }

  async function play({ next = false } = {}) {
    wanted = true;
    const current = ++revision;
    changingBank = false;
    cancelFade();
    try {
      chooseTrack(next || failedTrack || !!audio.error);
      show('loading');
      audio.volume = 0;
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
    if (!changingBank) fadeTo(LISTENING_VOLUME, 1800);
  });
  audio.addEventListener('waiting', () => { if (wanted) show('loading'); });
  audio.addEventListener('pause', () => {
    // Ignore an old queued pause event if a newer play request has already started.
    if (!audio.paused) return;
    if (audio.ended && wanted) return;
    wanted = false;
    cancelFade();
    show(audio.error ? 'error' : 'paused');
  });
  audio.addEventListener('error', () => {
    failedTrack = true;
    wanted = false;
    revision += 1;
    cancelFade();
    audio.pause();
    show('error');
  });
  audio.addEventListener('ended', () => {
    if (wanted && !document.hidden) void play({ next: true });
    else pause();
  });
  // Dusk and dawn move between libraries with a short fade, never a hard cut.
  setInterval(() => {
    if (!wanted || audio.paused || changingBank || currentBank === bankForTime() || button.dataset.audio !== 'playing') return;
    changingBank = true;
    const current = revision;
    fadeTo(0, 1200, () => {
      if (wanted && current === revision) void play({ next: true });
    });
  }, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  show('paused');
  return { toggle };
}
