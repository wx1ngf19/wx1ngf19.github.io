# Visitor atlas

1. In Cloudflare, open **Workers & Pages → reverie-api → Edit code**.
2. Replace `worker.js` with [worker.js](worker.js), then save and deploy. Keep the existing D1 binding named `DB`.
3. Open [the health endpoint](https://reverie-api.wx1ngf19.workers.dev/api/health). It should return `{"ok":true,"service":"reverie-atlas","version":1}`. The Worker creates the aggregate table automatically.
4. [The public summary](https://reverie-api.wx1ngf19.workers.dev/api/regions?days=30) should return `metric: "pageviews"` and the available counts.

`POST /api/visit` records page views from `https://wx1ngf19.github.io`. Only daily country and province/state aggregates are stored, without IPs, cookies or visitor IDs. Country and region come from Cloudflare's request metadata. They describe the network location, which can differ from a person's location.

Dates use Asia/Shanghai. The public API accepts 7, 30 or 90 days and caches summaries for up to 60 seconds. Counts are page views, not unique people; blocked requests, network failures and the basic crawler filter affect coverage.

Official references: [request geography](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties), [D1 bindings and queries](https://developers.cloudflare.com/d1/worker-api/d1-database/), [dashboard deployment](https://developers.cloudflare.com/d1/get-started/#5-deploy-your-application).
