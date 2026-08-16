const CACHE="tubi-v4";
const CORE=["./","./index.html","./manifest.webmanifest","./tubi-icon.png","./tubi-icon-192.png","./tubi-icon-512.png"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const u=new URL(event.request.url);
  if(u.origin!==location.origin)return;

  // HTML/navigation is network-first so a GitHub -> Vercel deployment
  // becomes visible without waiting for an old cached index.html.
  if(event.request.mode==="navigate" || u.pathname.endsWith("/") || u.pathname.endsWith("/index.html")){
    event.respondWith(
      fetch(event.request,{cache:"no-store"})
        .then(res=>{
          if(res.ok){
            const copy=res.clone();
            caches.open(CACHE).then(c=>c.put("./index.html",copy)).catch(()=>{});
          }
          return res;
        })
        .catch(()=>caches.match("./index.html"))
    );
    return;
  }

  // Static assets remain cache-first for speed.
  event.respondWith(
    caches.match(event.request)
      .then(hit=>hit || fetch(event.request).then(res=>{
        if(res.ok){
          const copy=res.clone();
          caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});
        }
        return res;
      }))
      .catch(()=>caches.match("./index.html"))
  );
});
