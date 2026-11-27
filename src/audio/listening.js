import { requestedTracks } from './requested.js?v=reverie-7';
import { soundtracks } from './library.js?v=reverie-7';

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
  player.replaceChildren();
  recording.hidden = true;
  buttons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  if (restoreFocus) buttons.get(selectedId)?.focus({ preventScroll: true });
  selectedId = null;
}

function select(track) {
  closePlayer(false);
  selectedId = track.id;
  const frame = document.createElement('iframe');
  frame.src = track.embedUrl;
  frame.title = `${track.title} · ${track.artist} · Official player`;
  frame.className = track.provider;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  player.append(frame);
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

const credits = document.querySelector('#background-tracks');
for (const [bank, tracks] of Object.entries(soundtracks)) {
  credits.append(element('h2', '', bank === 'day' ? 'Day · 白天' : 'Night · 夜晚'));
  for (const track of tracks) {
    const article = element('article', 'credit');
    article.id = track.id;
    article.append(element('h3', '', `${track.title} · ${track.artist}`), element('p', '', track.attribution));
    const links = element('div', 'credit-links');
    for (const [name, href] of [['原始来源', track.source], [track.license, track.licenseUrl]]) {
      const link = element('a', '', name);
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      links.append(link);
    }
    article.append(links);
    credits.append(article);
  }
}

function showHash() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (!id) return;
  const target = document.getElementById(id);
  if (target?.classList.contains('credit')) {
    document.querySelector('#background').open = true;
    requestAnimationFrame(() => target.scrollIntoView());
  }
}
document.querySelector('#close-player').addEventListener('click', () => closePlayer());
window.addEventListener('hashchange', showHash);
showHash();
