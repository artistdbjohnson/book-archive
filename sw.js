/* Offline cache. v27 refreshes the shell for EPUB export. v26 refreshes the shell for the Perimeter Sample expansion. v25 refreshes the shell for QF argon voice. v24 refreshes the shell for QF markup 3. v23 refreshes the shell for the QF de-ai pass. v22 refreshes the shell for the QF voice pass. v21 refreshes the shell for QF markup 2 and repeat SW-update reloads. v20 refreshes the shell for keyless marks sync and never touches /api. v19 refreshes the shell for Android marks fixes. v18 refreshes the shell for reader marks. v17 refreshes the shell for QF Rue. v16 refreshes the shell for the QF phrasing pass. v15 refreshes the shell for Shep v5. v14 refreshes the shell for the DGLXSS press mark and icons. v13 refreshes the shell for First Water rev 4.2. v12 refreshes the shell for First Water rev3. v11 refreshes the shell for distinct folder/list views. v10 refreshes the shell for shelf ordering, grid group cards and full-page Pages. v9 refreshes the shell for the full-archive veil and series folders in every view. v8 refreshes the shell for painterly veil art. v7 drops veiled TVN PDFs from precache and 404s them, and deletes v6 copies on activate. v6 refreshes the shell for veiled TVN rows and d.b.j. branding. v5 swaps in short-title TVN PDFs (same paths). v4 adds the Helmet keeper PDF. v3 dropped cached cleanUrls redirects from v2. Activate deletes every cache except this one. */
const CACHE = 'dglxss-archive-sw-v27';
const PRECACHE = [
  "/",
  "/archive.js",
  "/manifest.json",
  "/favicon.svg",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/enter",
  "/join",
  "/listen",
  "/pdfs/tvn-01-the-hills-above-allentown-study.pdf",
  "/pdfs/tvn-01-the-hills-above-allentown-teleplay.pdf",
  "/pdfs/tvn-01-the-hills-above-allentown.pdf",
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
const CUT_PDF = /\/pdfs\/tvn-(?:02-the-3-10-shift|05-the-nail-box|06-the-fair-weight|07-the-planetarium-tooth|11-the-palmerton-switch|12-what-came-up-the-riser|14-run-the-bob-wire-home|03-the-board-at-pen-argyl|04-above-little-gap|08-below-the-kiln|09-water-gap-before-dawn|10-the-open-hearth-run|13-below-the-reading-cut|15-every-exit-reopens)(?:-teleplay|-study)?\.pdf$/;

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
  if(path.startsWith('/api/')) return;
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
