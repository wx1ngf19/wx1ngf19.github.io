import { API_ORIGIN, SITE_ORIGIN } from './config.js?v=atlas-1';

let sent = false;

function record() {
  if (sent || document.visibilityState !== 'visible') return;
  if (location.origin !== SITE_ORIGIN || navigator.globalPrivacyControl === true
    || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  sent = true;
  document.removeEventListener('visibilitychange', record);
  // One request per document load, with no cookies, identifiers or retry loop.
  void fetch(`${API_ORIGIN}/api/visit`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-store',
    keepalive: true,
    referrerPolicy: 'no-referrer',
  }).catch(() => {});
}

document.addEventListener('visibilitychange', record);
record();
