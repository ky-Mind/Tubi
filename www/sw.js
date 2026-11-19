const CACHE = "tubi-v22";
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Network-first: selalu ambil versi terbaru; cache hanya cadangan saat offline.
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(r, { cache: "no-store" }).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)).catch(() => {}); } return res; }).catch(() => caches.match(r).then(m => m || caches.match("./index.html"))));
});
// Ketuk notifikasi → buka / fokuskan tab Tubi di halaman terkait
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const href = e.notification.data?.href || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ href }); return c.focus(); }
    return self.clients.openWindow("./#" + href);
  }));
});
