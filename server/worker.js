const SITE = 'https://wx1ngf19.github.io';
const DAY_MS = 86400000;
const OFFSET_MS = 8 * 3600000;
const schema = `CREATE TABLE IF NOT EXISTS visitor_regions (
  day TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  region_name TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  PRIMARY KEY (day, country, region)
) WITHOUT ROWID`;
const ready = new WeakMap();

async function database(db) {
  if (!db) throw new Error('Missing DB binding');
  if (!ready.has(db)) {
    const pending = db.prepare(schema).run().catch(error => {
      ready.delete(db);
      throw error;
    });
    ready.set(db, pending);
  }
  await ready.get(db);
  return db;
}

function reply(value, status = 200, origin = '*', cache = 'no-store') {
  return Response.json(value, {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function dateAt(time) {
  return new Date(time + OFFSET_MS).toISOString().slice(0, 10);
}

function text(value, limit = 80) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) : '';
}

async function record(request, env) {
  if (request.headers.get('Origin') !== SITE) return reply({ error: 'Origin not allowed' }, 403);
  const agent = request.headers.get('User-Agent') || '';
  if (request.cf?.botManagement?.verifiedBot || /bot\b|crawler|spider|headless/i.test(agent)) {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': SITE, 'Cache-Control': 'no-store' } });
  }
  const db = await database(env.DB);
  const cf = request.cf || {};
  const country = /^[A-Z]{2}$/.test(cf.country || '') ? cf.country : 'XX';
  const regionName = text(cf.region);
  const region = text(cf.regionCode, 24) || regionName || 'unknown';
  // Only coarse, daily aggregates are stored. No IPs, cookies or visitor IDs.
  await db.prepare(`INSERT INTO visitor_regions (day, country, region, region_name, views)
    VALUES (?1, ?2, ?3, ?4, 1)
    ON CONFLICT (day, country, region) DO UPDATE SET
      views = visitor_regions.views + 1,
      region_name = CASE WHEN excluded.region_name <> '' THEN excluded.region_name ELSE visitor_regions.region_name END`)
    .bind(dateAt(Date.now()), country, region, regionName).run();
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': SITE, 'Cache-Control': 'no-store' },
  });
}

async function statistics(request, env, ctx) {
  const url = new URL(request.url);
  const days = Number(url.searchParams.get('days') || 30);
  if (![7, 30, 90].includes(days)) return reply({ error: 'Choose 7, 30 or 90 days' }, 400);
  const cacheUrl = new URL('/api/regions', url.origin);
  cacheUrl.searchParams.set('days', String(days));
  // The real date prevents yesterday's cached range crossing midnight.
  cacheUrl.searchParams.set('date', dateAt(Date.now()));
  const cacheKey = new Request(cacheUrl, { method: 'GET' });
  const cache = globalThis.caches?.default;
  const cached = cache && await cache.match(cacheKey);
  if (cached) return cached;
  const db = await database(env.DB);
  const since = dateAt(Date.now() - (days - 1) * DAY_MS);
  const [summary, countries, regions, daily] = await db.batch([
    db.prepare(`SELECT COALESCE(SUM(views), 0) AS views,
      COUNT(DISTINCT CASE WHEN country <> 'XX' THEN country END) AS countries
      FROM visitor_regions WHERE day >= ?1`).bind(since),
    db.prepare(`SELECT country, SUM(views) AS views FROM visitor_regions
      WHERE day >= ?1 GROUP BY country ORDER BY views DESC, country`).bind(since),
    db.prepare(`SELECT country, region, MAX(region_name) AS name, SUM(views) AS views
      FROM visitor_regions WHERE day >= ?1
      GROUP BY country, region ORDER BY views DESC, country, region LIMIT 100`).bind(since),
    db.prepare(`SELECT day, SUM(views) AS views FROM visitor_regions
      WHERE day >= ?1 GROUP BY day ORDER BY day`).bind(since),
  ]);
  const response = reply({
    version: 1,
    metric: 'pageviews',
    timezone: 'Asia/Shanghai',
    days,
    since,
    updatedAt: new Date().toISOString(),
    total: Number(summary.results[0]?.views || 0),
    countryCount: Number(summary.results[0]?.countries || 0),
    countries: countries.results,
    regions: regions.results,
    daily: daily.results,
  }, 200, '*', 'public, max-age=60');
  if (cache) ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (request.method === 'OPTIONS') {
      if (request.headers.get('Origin') !== SITE) return reply({ error: 'Origin not allowed' }, 403);
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': SITE,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    try {
      if (pathname === '/api/visit') {
        return request.method === 'POST' ? await record(request, env) : reply({ error: 'Use POST' }, 405);
      }
      if (pathname === '/api/regions') {
        return request.method === 'GET' ? await statistics(request, env, ctx) : reply({ error: 'Use GET' }, 405);
      }
      if ((pathname === '/' || pathname === '/api/health') && request.method === 'GET') {
        const db = await database(env.DB);
        const row = await db.prepare('SELECT 1 AS connected').first();
        return reply({ ok: row?.connected === 1, service: 'reverie-atlas', version: 1 });
      }
      return reply({ error: 'Not found' }, 404);
    } catch {
      return reply({ error: 'Atlas is temporarily unavailable' }, 503);
    }
  },
};
