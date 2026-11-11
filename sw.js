/* Kora Challenge — Service Worker
   - بيخزّن الصفحات الخفيفة والألعاب اللي مش أونلاين عشان تشتغل من غير نت
   - الصفحات التقيلة (كارير مود ومود المدرب) بتتخزن أول ما تفتحها بس
   - HTML: من الكاش فورًا وبيتحدّث في الخلفية | باقي الملفات: من الكاش وتتحدّث في الخلفية
   - Firebase والطلبات اللي بتكتب: مبنلمسهاش */
const VERSION = 'kora-v2';
const IMG_CACHE = 'kora-img-v1';
const LIB_CACHE = 'kora-lib-v1';
const LIBS = ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'];
const PAGES = ['./', 'index.html', 'offline.html', 'login.html', 'privacy.html', 'terms.html', 'leaderboard.html',
  'guess-player.html', 'grid.html', 'daily.html', 'club-quiz.html', 'country.html', 'career.html', 'players90.html', 'player-modes.html', 'draw.html', 'myteem.html', 'careermode.html', 'coach.html'];
const STATIC = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'favicon.png'];

async function cacheOne(cache, url) {
  try { const r = await fetch(url, { cache: 'reload' }); if (r && r.ok) { await cache.put(url, r.clone()); return r; } } catch (e) { /* ignore */ }
  return null;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const assets = new Set(STATIC);
    for (const p of PAGES) {
      const r = await cacheOne(cache, p);
      if (r && /text\/html/.test(r.headers.get('content-type') || '')) {
        try {
          const html = await r.clone().text();
          const re = /(?:src|href)=["']([^"']+)["']/g; let m;
          while ((m = re.exec(html))) {
            const u = m[1];
            if (/^(https?:)?\/\//.test(u) || u[0] === '#' || /^(mailto|tel|data|javascript):/.test(u)) continue;
            if (/\.(js|css|png|svg|webp|jpg|jpeg|webmanifest|ico)(\?.*)?$/i.test(u)) assets.add(u);
          }
        } catch (e) { /* ignore */ }
      }
    }
    /* مكتبات Firebase (نسخة ثابتة) بتتخزن مرة واحدة فتفتح الصفحات فورًا */
    try { const lc = await caches.open(LIB_CACHE); for (const u of LIBS) { if (!(await lc.match(u))) { try { await lc.add(new Request(u, { mode: 'no-cors' })); } catch (e) { /* ignore */ } } } } catch (e) { /* ignore */ }
    /* الملفات الأساسية الأول، والتقيلة (كارير مود/مدرب...) بعدها في الخلفية */
    const HEAVY = /(careermode|coach|players90|translations)/i;
    const heavy = [];
    for (const a of assets) { if (HEAVY.test(a)) heavy.push(a); else await cacheOne(cache, a); }
    for (const p of ['careermode.html', 'coach.html']) { /* أصول الصفحات التقيلة */
      try { const r = await cache.match(p); if (r) { const html = await r.clone().text(); const re = /(?:src|href)=["']([^"']+)["']/g; let m; while ((m = re.exec(html))) { const u = m[1]; if (/^(https?:)?\/\//.test(u) || u[0] === '#') continue; if (/\.(js|css|png|svg|webp|jpg|jpeg)(\?.*)?$/i.test(u) && heavy.indexOf(u) < 0 && !assets.has(u)) heavy.push(u); } } } catch (e) { /* ignore */ }
    }
    /* ملفات تحميل كارير مود المؤجّل (cm-boot) */
    try { const r = await cache.match('cm-boot.js'); const t = r ? await r.text() : ''; (t.match(/'[a-z0-9-]+\.js(\?v=\d+)?'/gi) || []).forEach(x => { x = x.slice(1, -1); if (heavy.indexOf(x) < 0) heavy.push(x); }); } catch (e) { /* ignore */ }
    event.waitUntil((async () => { for (const a of heavy) { if (!(await cache.match(a))) await cacheOne(cache, a); } })());
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION && k !== IMG_CACHE && k !== LIB_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

async function pageFast(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req, { ignoreSearch: true });
  const net = (async () => {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    try { const res = await fetch(req, { signal: ctl.signal }); if (res && res.ok) cache.put(req, res.clone()); return res; }
    finally { clearTimeout(t); }
  })();
  if (hit) { net.catch(() => {}); return hit; }
  try { return await net; } catch (e) { return (await cache.match('offline.html')) || new Response('offline', { status: 503 }); }
}
async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || new Response('', { status: 504 });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    if (LIBS.indexOf(req.url) >= 0) { event.respondWith(caches.open(LIB_CACHE).then(async c => (await c.match(req.url)) || fetch(req).then(r => { try { c.put(req.url, r.clone()); } catch (e) { /* ignore */ } return r; }))); return; }
    if (req.destination === 'image') event.respondWith(staleWhileRevalidate(req, IMG_CACHE));
    return;
  }
  if (url.pathname.endsWith('/sw.js')) return;
  if (req.mode === 'navigate' || req.destination === 'document') event.respondWith(pageFast(req));
  else event.respondWith(staleWhileRevalidate(req, VERSION));
});

/* ضغطة على الإشعار: افتح/ركّز على الموقع */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { try { await c.focus(); if ('navigate' in c) await c.navigate(target); return; } catch (e) { /* ignore */ } } }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
