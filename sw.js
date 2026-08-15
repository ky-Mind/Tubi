const CACHE="tubi-shell-v5";
const CORE=["./","./index.html","./app.js","./firebase-config.js","./manifest.webmanifest","./assets/icon.svg","./assets/icon-192.png","./assets/icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET"||e.request.url.includes("gstatic.com")||e.request.url.includes("google.com"))return;
 e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{
   const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
 }).catch(()=>caches.match("./index.html"))));
});
