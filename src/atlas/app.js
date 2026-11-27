import { API_ORIGIN } from '../analytics/config.js?v=atlas-1';
import { createGlobe } from './globe.js?v=atlas-2';

const $ = selector => document.querySelector(selector);
const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
const cnRegions = { BJ: 'Beijing', TJ: 'Tianjin', HE: 'Hebei', SX: 'Shanxi', NM: 'Inner Mongolia', LN: 'Liaoning', JL: 'Jilin', HL: 'Heilongjiang', SH: 'Shanghai', JS: 'Jiangsu', ZJ: 'Zhejiang', AH: 'Anhui', FJ: 'Fujian', JX: 'Jiangxi', SD: 'Shandong', HA: 'Henan', HB: 'Hubei', HN: 'Hunan', GD: 'Guangdong', GX: 'Guangxi', HI: 'Hainan', CQ: 'Chongqing', SC: 'Sichuan', GZ: 'Guizhou', YN: 'Yunnan', XZ: 'Tibet', SN: 'Shaanxi', GS: 'Gansu', QH: 'Qinghai', NX: 'Ningxia', XJ: 'Xinjiang' };
let world = null;
let globe = null;
let data = null;
let selected = null;
let days = 30;
let revision = 0;
let controller = null;

function countryName(code) {
  if (code === 'XX') return 'Unknown';
  try { return names?.of(code) || world?.places[code]?.name || code; }
  catch { return world?.places[code]?.name || code; }
}

function regionName(row) {
  const code = row.region.replace(/^CN-/, '');
  if (row.country === 'CN' && cnRegions[code]) return cnRegions[code];
  return row.name || (row.region === 'unknown' ? 'Unknown region' : row.region);
}

function span(className, text) {
  const node = document.createElement('span');
  node.className = className;
  node.textContent = text;
  return node;
}

function chooseCountry(code) {
  selected = code;
  globe?.select(code);
  $('#region-detail').hidden = !code;
  for (const button of document.querySelectorAll('#country-list button')) button.setAttribute('aria-pressed', String(button.dataset.country === code));
  if (!code || !data) return;
  $('#region-heading').textContent = countryName(code);
  const rows = data.regions.filter(row => row.country === code);
  const list = $('#region-list');
  list.replaceChildren();
  if (!rows.length) {
    const item = document.createElement('li');
    item.textContent = 'No regional detail.';
    list.append(item);
  }
  for (const row of rows) {
    const item = document.createElement('li');
    item.append(span('', regionName(row)), span('', row.views.toLocaleString('en')));
    list.append(item);
  }
}

function timeline() {
  const chart = $('#visit-timeline');
  chart.replaceChildren();
  if (!data) return;
  const series = new Map(data.daily.map(row => [row.day, row.views]));
  const start = Date.parse(`${data.since}T00:00:00+08:00`);
  const dates = Array.from({ length: days }, (_, index) => new Date(start + index * 86400000 + 8 * 3600000).toISOString().slice(0, 10));
  const max = Math.max(1, ...series.values());
  const step = 300 / days;
  const namespace = 'http://www.w3.org/2000/svg';
  for (const [index, day] of dates.entries()) {
    const count = series.get(day) || 0;
    const height = count ? 3 + (count / max) * 53 : 1;
    const bar = document.createElementNS(namespace, 'rect');
    bar.setAttribute('x', String(index * step + Math.min(1.5, step * .2)));
    bar.setAttribute('y', String(59 - height));
    bar.setAttribute('width', String(step * .63));
    bar.setAttribute('height', String(height));
    bar.setAttribute('rx', String(Math.min(1.5, step * .15)));
    bar.setAttribute('fill', count ? '#bfb389' : '#547b7c55');
    const title = document.createElementNS(namespace, 'title');
    title.textContent = `${day} · ${count} visits`;
    bar.append(title);
    chart.append(bar);
  }
  chart.setAttribute('aria-label', `Daily visits over ${days} days. ${data.total} total.`);
  $('#first-date').textContent = dates[0].slice(5).replace('-', '.');
  $('#last-date').textContent = dates.at(-1).slice(5).replace('-', '.');
}

function render() {
  $('#total-views').textContent = data.total.toLocaleString('en');
  $('#total-countries').textContent = data.countryCount.toLocaleString('en');
  $('#range-label').textContent = `${days}d`;
  const list = $('#country-list');
  list.replaceChildren();
  if (!data.countries.length) {
    const item = document.createElement('li');
    item.className = 'empty-note';
    item.textContent = 'Awaiting the first light.';
    list.append(item);
  }
  data.countries.forEach(row => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.country = row.country;
    button.setAttribute('aria-pressed', String(row.country === selected));
    button.setAttribute('aria-label', `${countryName(row.country)}, ${row.views} visits. Show regions.`);
    button.append(span('country-name', countryName(row.country)), span('country-views', row.views.toLocaleString('en')));
    button.addEventListener('click', () => chooseCountry(selected === row.country ? null : row.country));
    item.append(button);
    list.append(item);
  });
  globe?.setData(data.countries);
  timeline();
  if (selected) chooseCountry(selected);
  const time = new Date(data.updatedAt).toLocaleTimeString('en', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' });
  $('#atlas-status').textContent = 'Live';
  $('#atlas-status').title = `Updated ${time} · UTC+8`;
  document.documentElement.dataset.atlas = data.total ? 'ready' : 'empty';
}

async function load() {
  const current = ++revision;
  controller?.abort();
  const activeController = new AbortController();
  controller = activeController;
  const timeout = setTimeout(() => activeController.abort(), 10000);
  $('#atlas-status').textContent = 'Connecting';
  $('#retry-atlas').hidden = true;
  document.documentElement.dataset.atlas = 'loading';
  $('#refresh-atlas').disabled = true;
  $('#country-list').setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(`${API_ORIGIN}/api/regions?days=${days}`, { mode: 'cors', credentials: 'omit', signal: activeController.signal });
    if (!response.ok) throw new Error('Unavailable');
    const result = await response.json();
    if (current !== revision) return;
    if (result.version !== 1 || result.metric !== 'pageviews' || result.days !== days || !Number.isSafeInteger(result.total)
      || result.total < 0 || !Number.isSafeInteger(result.countryCount) || !Array.isArray(result.countries)
      || !Array.isArray(result.regions) || !Array.isArray(result.daily) || !/^\d{4}-\d{2}-\d{2}$/.test(result.since)
      || !Number.isFinite(Date.parse(result.updatedAt))) throw new Error('Invalid summary');
    data = result;
    render();
  } catch {
    if (current !== revision) return;
    $('#atlas-status').textContent = data ? 'Offline · saved view' : 'Offline';
    $('#retry-atlas').hidden = false;
    document.documentElement.dataset.atlas = 'error';
  } finally {
    clearTimeout(timeout);
    if (current === revision) {
      $('#country-list').setAttribute('aria-busy', 'false');
      $('#refresh-atlas').disabled = false;
    }
  }
}

for (const button of document.querySelectorAll('[data-days]')) {
  button.addEventListener('click', () => {
    const next = Number(button.dataset.days);
    if (next === days) return;
    days = next;
    selected = null;
    $('#region-detail').hidden = true;
    globe?.reset();
    for (const item of document.querySelectorAll('[data-days]')) item.setAttribute('aria-pressed', String(item === button));
    void load();
  });
}
$('#retry-atlas').addEventListener('click', () => { void load(); });
$('#refresh-atlas').addEventListener('click', () => { void load(); });
$('#clear-country').addEventListener('click', () => chooseCountry(null));
$('#reset-globe').addEventListener('click', () => { chooseCountry(null); globe?.reset(); });

async function initializeMap() {
  try {
    const responses = await Promise.all(['world.json', 'earth.json'].map(file => fetch(new URL(`../../assets/data/${file}?v=atlas-2`, import.meta.url))));
    if (responses.some(response => !response.ok)) throw new Error('Map unavailable');
    const [geography, landPoints] = await Promise.all(responses.map(response => response.json()));
    world = { ...geography, landPoints };
    globe = createGlobe($('#atlas-canvas'), world, { nameFor: countryName, onSelect: chooseCountry, tooltip: $('#map-tooltip') });
    if (data) globe.setData(data.countries);
  } catch {
    $('#atlas-canvas').setAttribute('aria-label', 'Map unavailable. Visit counts are available in the list.');
    $('.map-toolbar > span').textContent = 'Map unavailable';
    $('#reset-globe').disabled = true;
  }
}

if (window.parent !== window) {
  document.documentElement.dataset.embedded = 'true';
  $('.home-link').addEventListener('click', event => {
    event.preventDefault();
    window.parent.postMessage({ type: 'reverie:close-atlas' }, location.origin);
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') window.parent.postMessage({ type: 'reverie:close-atlas' }, location.origin);
  });
}

void initializeMap();
void load();
