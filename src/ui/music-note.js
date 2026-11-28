export function createMusicNote(note) {
  if (!note?.matches('details.music-note')) return () => {};
  const toggle = note.querySelector('summary');
  const card = note.querySelector('.music-note-card');
  const title = note.querySelector('#music-note-title');
  const artist = note.querySelector('#music-note-artist');
  const album = note.querySelector('#music-note-album');
  const status = note.querySelector('#music-note-state');
  const states = { ready: 'Ready', playing: 'Playing', paused: 'Paused', loading: 'Loading', error: 'Unavailable' };
  let timer = 0;
  let hovered = false;
  let keyboard = false;
  let pointerType = 'mouse';

  function open() {
    clearTimeout(timer);
    timer = 0;
    note.open = true;
  }

  function close(restoreFocus = false) {
    clearTimeout(timer);
    timer = 0;
    if (restoreFocus && note.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    note.open = false;
  }

  function leave() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = 0;
      if (!hovered && !(keyboard && note.contains(document.activeElement))) close();
    }, 120);
  }

  // Preserve the path to the card without covering the playback button.
  function crossesBridge(x, y) {
    const trigger = toggle.getBoundingClientRect();
    const panel = card.getBoundingClientRect();
    if (panel.right < trigger.left) {
      if (x < panel.right || x > trigger.left) return false;
      const progress = (x - panel.right) / (trigger.left - panel.right);
      const top = panel.top + (trigger.top - panel.top) * progress;
      const bottom = panel.bottom + (trigger.bottom - panel.bottom) * progress;
      return y >= top && y <= bottom;
    }
    if (panel.bottom >= trigger.top || y < panel.bottom || y > trigger.top) return false;
    const progress = (y - panel.bottom) / (trigger.top - panel.bottom);
    const left = panel.left + (trigger.left - panel.left) * progress;
    const right = panel.right + (trigger.right - panel.right) * progress;
    return x >= left && x <= right;
  }

  note.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = true;
    keyboard = false;
    open();
  });
  note.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = false;
    leave();
  });
  toggle.addEventListener('click', event => {
    if (event.detail > 0 && pointerType === 'mouse') {
      event.preventDefault();
      open();
    }
  });
  note.addEventListener('focusin', () => { if (keyboard) open(); });
  note.addEventListener('focusout', event => {
    if (keyboard && !note.contains(event.relatedTarget) && !hovered) close();
  });
  document.addEventListener('pointerdown', event => {
    keyboard = false;
    pointerType = event.pointerType;
    if (pointerType !== 'mouse') hovered = false;
    if (!note.contains(event.target)) close();
    else { clearTimeout(timer); timer = 0; }
  }, true);
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    keyboard = false;
    if (hovered || !note.open) return;
    if (crossesBridge(event.clientX, event.clientY)) {
      clearTimeout(timer);
      timer = 0;
    } else leave();
  }, { passive: true });
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab') keyboard = true;
    if (event.key !== 'Escape' || !note.open) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    close(true);
  }, true);
  window.addEventListener('blur', () => close());
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
  window.addEventListener('reverie:atlas', event => { if (event.detail.open) close(); });

  return (track, state) => {
    if (!track) return;
    title.textContent = track.title;
    artist.firstChild.textContent = `${track.artist} `;
    artist.href = track.source;
    artist.setAttribute('aria-label', `${track.artist} — composer’s website`);
    album.textContent = track.album;
    status.textContent = states[state] || states.paused;
    note.dataset.audio = state;
  };
}
