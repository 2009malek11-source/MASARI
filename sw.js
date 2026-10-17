/* Service Worker — offline app shell + runtime cache for map tiles/styles/fonts. */
const V='mp-v1',SHELL='mp-shell-'+V,TILES='mp-tiles-'+V;
const FILES=['./','index.html','style.css','app.js','maplibre-gl.js','maplibre-gl.css','manifest.json','icon.png','icon-192.png'];
const MAX_TILES=900;
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function trim(c){const ks=await c.keys();if(ks.length>MAX_TILES)for(const k of ks.slice(0,ks.length-MAX_TILES))await c.delete(k)}
/* cache-first for tiles/fonts (immutable-ish), network-first for style json */
async function cacheFirst(req){const c=await caches.open(TILES);const hit=await c.match(req);if(hit)return hit;
 try{const r=await fetch(req);if(r&&(r.ok||r.type==='opaque')){c.put(req,r.clone());trim(c)}return r}catch(e){return hit||Response.error()}}
async function netFirst(req,name){const c=await caches.open(name);try{const r=await fetch(req);if(r&&r.ok)c.put(req,r.clone());return r}catch(e){const hit=await c.match(req);return hit||Response.error()}}
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.origin===location.origin){
  if(r.mode==='navigate'){e.respondWith(netFirst(r,SHELL).then(x=>x.ok?x:caches.match('index.html')));return}
  e.respondWith(caches.match(r).then(h=>{const n=fetch(r).then(x=>{if(x&&x.ok)caches.open(SHELL).then(c=>c.put(r,x.clone()));return x}).catch(()=>h);return h||n}));return}
 if(/tiles\.openfreemap\.org\/styles\//.test(r.url)){e.respondWith(netFirst(r,TILES));return}
 if(/openfreemap\.org|amazonaws\.com\/elevation|fonts\.(googleapis|gstatic)\.com/.test(u.host+u.pathname+r.url)){e.respondWith(cacheFirst(r));return}
 /* routing / search / places: always live, never cached */
});
