const CACHE="tubi-v3";
const CORE=["./","./index.html","./manifest.webmanifest","./tubi-icon.png","./tubi-icon-192.png","./tubi-icon-512.png"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const u=new URL(event.request.url);if(u.origin!==location.origin)return;event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}return res}).catch(()=>caches.match("./index.html"))))});
