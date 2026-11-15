const CACHE_NAME = 'redsea-v1.7.1';
const PRECACHE = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // لا تتدخل في طلبات الطقس (API)
  if (url.hostname.includes('open-meteo.com')) return;

  // Cache-first للخطوط/الـ tiles/المكتبات
  const isAsset = (
    url.origin === location.origin ||
    url.hostname.includes('arcgisonline') ||
    url.hostname.includes('unpkg') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('jsdelivr') ||
    url.hostname.includes('fonts.g')
  );

  if (!isAsset) return;

  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached || caches.match('./index.html'));

      return cached || fetchPromise;
    })
  );
});