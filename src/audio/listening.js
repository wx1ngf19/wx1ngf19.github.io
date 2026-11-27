import { requestedTracks } from './requested.js?v=reverie-9';

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
  const audio = document.createElement('audio');
  audio.src = track.src;
  audio.controls = true;
  audio.preload = 'none';
  audio.setAttribute('aria-label', `${track.title} · ${track.artist}`);
  player.append(audio);
  document.querySelector('#recording-title').textContent = track.title;
  document.querySelector('#recording-artist').textContent = `${track.artist} · ${track.album}`;
  document.querySelector('#official-source').href = track.source;
  buttons.get(track.id).setAttribute('aria-pressed', 'true');
  recording.hidden = false;
  document.querySelector('#close-player').focus({ preventScroll: true });
  recording.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}

requestedTracks.forEach((track, index) => {
  const button = element('button', 'track');
  button.id = track.id;
  button.dataset.track = track.id;
  button.type = 'button';
  button.setAttribute('aria-pressed', 'false');
  button.append(element('span', 'track-number', String(index + 1).padStart(2, '0')));
  const label = element('span');
  label.append(element('span', 'track-title', track.title), element('span', 'track-artist', track.artist));
  button.append(label, element('span', 'track-kind', '纯音乐'));
  button.addEventListener('click', () => select(track));
  buttons.set(track.id, button);
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
