const CACHE="mmoc-cache-v6";
const CORE=['./', './index.html', './app.html', './library.html', './review.html', './styles.css', './app.js', './manifest.json', './favicon.png', './cover-emerald.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{const keys=await caches.keys();
await Promise.all(keys.map(k=>k!==CACHE?caches.delete(k):null)); await self.clients.claim();})());});
self.addEventListener("fetch",e=>{
  const url=new URL(e.request.url); if(url.origin!==location.origin) return;
  const isHTML=e.request.headers.get("accept")?.includes("text/html");
  if(isHTML){
    e.respondWith((async()=>{try{const fresh=await fetch(e.request);
      (await caches.open(CACHE)).put(e.request,fresh.clone()); return fresh;}
      catch{return (await caches.match(e.request))||(await caches.match("./index.html"));}})());
    return;
  }
  e.respondWith((async()=>{const cached=await caches.match(e.request); if(cached) return cached;
    const fresh=await fetch(e.request); (await caches.open(CACHE)).put(e.request,fresh.clone()); return fresh;})());
});
