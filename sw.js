/* Offline cache. v6 refreshes the shell for veiled TVN rows and d.b.j. branding. v5 swaps in short-title TVN PDFs (same paths). v4 adds the Helmet keeper PDF. v3 dropped cached cleanUrls redirects from v2. Activate deletes every cache except this one. */
const CACHE = 'dglxss-archive-sw-v6';
const PRECACHE = [
  "/",
  "/archive.js",
  "/manifest.json",
  "/enter",
  "/join",
  "/listen",
  "/pdfs/tvn-01-the-hills-above-allentown-study.pdf",
  "/pdfs/tvn-01-the-hills-above-allentown-teleplay.pdf",
  "/pdfs/tvn-01-the-hills-above-allentown.pdf",
  "/pdfs/tvn-03-the-board-at-pen-argyl-study.pdf",
  "/pdfs/tvn-03-the-board-at-pen-argyl-teleplay.pdf",
  "/pdfs/tvn-03-the-board-at-pen-argyl.pdf",
  "/pdfs/tvn-04-above-little-gap-study.pdf",
  "/pdfs/tvn-04-above-little-gap-teleplay.pdf",
  "/pdfs/tvn-04-above-little-gap.pdf",
  "/pdfs/tvn-08-below-the-kiln-study.pdf",
  "/pdfs/tvn-08-below-the-kiln-teleplay.pdf",
  "/pdfs/tvn-08-below-the-kiln.pdf",
  "/pdfs/tvn-09-water-gap-before-dawn-study.pdf",
  "/pdfs/tvn-09-water-gap-before-dawn-teleplay.pdf",
  "/pdfs/tvn-09-water-gap-before-dawn.pdf",
  "/pdfs/tvn-10-the-open-hearth-run-study.pdf",
  "/pdfs/tvn-10-the-open-hearth-run-teleplay.pdf",
  "/pdfs/tvn-10-the-open-hearth-run.pdf",
  "/pdfs/tvn-13-below-the-reading-cut-study.pdf",
  "/pdfs/tvn-13-below-the-reading-cut-teleplay.pdf",
  "/pdfs/tvn-13-below-the-reading-cut.pdf",
  "/pdfs/tvn-15-every-exit-reopens-study.pdf",
  "/pdfs/tvn-15-every-exit-reopens-teleplay.pdf",
  "/pdfs/tvn-15-every-exit-reopens.pdf",
  "/pdfs/tvn-the-helmet-at-bake-oven-knob.pdf"
];
const CUT_IDS = [
  "tvn-the-3-10-shift",
  "tvn-the-3-10-shift-screenplay",
  "tvn-the-3-10-shift-study",
  "tvn-the-nail-box",
  "tvn-the-nail-box-screenplay",
  "tvn-the-nail-box-study",
  "tvn-the-fair-weight",
  "tvn-the-fair-weight-screenplay",
  "tvn-the-fair-weight-study",
  "tvn-the-planetarium-tooth",
  "tvn-the-planetarium-tooth-screenplay",
  "tvn-the-planetarium-tooth-study",
  "tvn-the-palmerton-switch",
  "tvn-the-palmerton-switch-screenplay",
  "tvn-the-palmerton-switch-study",
  "tvn-what-came-up-the-riser",
  "tvn-what-came-up-the-riser-screenplay",
  "tvn-what-came-up-the-riser-study",
  "tvn-run-the-bob-wire-home",
  "tvn-run-the-bob-wire-home-screenplay",
  "tvn-run-the-bob-wire-home-study"
];
const CUT_PDF = /\/pdfs\/tvn-(?:02-the-3-10-shift|05-the-nail-box|06-the-fair-weight|07-the-planetarium-tooth|11-the-palmerton-switch|12-what-came-up-the-riser|14-run-the-bob-wire-home)(?:-teleplay|-study)?\.pdf$/;

function isCutRequest(url){
  const path = decodeURIComponent(url.pathname);
  if(CUT_PDF.test(path)) return true;
  return CUT_IDS.some(id => path === '/' + id || path.startsWith('/' + id + '/'));
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  const path = url.pathname;
  if(path.endsWith('.html')) return;
  if(isCutRequest(url)){
    event.respondWith(new Response('Not found', { status: 404, statusText: 'Not Found' }));
    return;
  }
  if(PRECACHE.indexOf(path) === -1) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(req);
      if(fresh && (fresh.type === 'opaqueredirect' || fresh.redirected)){
        return fresh;
      } else if(fresh && fresh.ok){
        cache.put(req, fresh.clone());
        return fresh;
      }
    } catch (e) {}
    const hit = await cache.match(req);
    if(hit && hit.type !== 'opaqueredirect' && !hit.redirected) return hit;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
