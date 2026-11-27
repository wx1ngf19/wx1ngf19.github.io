import { requestedTracks } from './requested.js?v=reverie-8';

const list = document.querySelector('#selected-tracks');
const recording = document.querySelector('#recording');
const player = document.querySelector('#official-player');
const buttons = new Map();
let selectedId = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function closePlayer(restoreFocus = true) {
  player.querySelector('audio')?.pause();
  player.replaceChildren();
  recording.hidden = true;
  buttons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  if (restoreFocus) buttons.get(selectedId)?.focus({ preventScroll: true });
  selectedId = null;
}

function select(track) {
  closePlayer(false);
  selectedId = track.id;
  if (track.src) {
    const audio = document.createElement('audio');
    audio.src = track.src;
    audio.controls = true;
    audio.preload = 'none';
    audio.setAttribute('aria-label', `${track.title} · ${track.artist}`);
    player.append(audio);
  } else {
    const frame = document.createElement('iframe');
    frame.src = track.embedUrl;
    frame.title = `${track.title} · ${track.artist} · Official player`;
    frame.className = track.provider;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    player.append(frame);
  }
  document.querySelector('#recording-title').textContent = track.title;
  document.querySelector('#recording-artist').textContent = `${track.artist} · ${track.album}`;
  document.querySelector('#official-source').href = track.source;
  buttons.get(track.id).setAttribute('aria-pressed', 'true');
  recording.hidden = false;
  document.querySelector('#close-player').focus({ preventScroll: true });
  recording.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}

requestedTracks.forEach((track, index) => {
  const external = track.provider === 'youtube';
  const button = element(external ? 'a' : 'button', 'track');
  button.id = track.id;
  button.dataset.track = track.id;
  if (external) {
    button.href = track.source;
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    button.setAttribute('aria-label', `${track.title} · ${track.artist} · 前往官方页面播放`);
  } else {
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
  }
  button.append(element('span', 'track-number', String(index + 1).padStart(2, '0')));
  const label = element('span');
  label.append(element('span', 'track-title', track.title), element('span', 'track-artist', track.artist));
  const kind = track.kind === 'original' ? '原版 · 人声' : '纯音乐';
  button.append(label, element('span', 'track-kind', `${kind}${external ? ' ↗' : ''}`));
  if (!external) {
    button.addEventListener('click', () => select(track));
    buttons.set(track.id, button);
  }
  list.append(button);
});

function showHash() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (!id) return;
  const target = document.getElementById(id);
  if (target?.classList.contains('track')) {
    requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }));
  }
}
document.querySelector('#close-player').addEventListener('click', () => closePlayer());
window.addEventListener('hashchange', showHash);
showHash();
