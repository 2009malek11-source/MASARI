/* مساري — Service Worker.
 * - App shell is cached at install (cache-first => instant, works offline).
 * - Map tiles / styles / fonts are cached at runtime.
 * - A NEW version waits until the user taps "تحديث الآن" (app.js posts SKIP_WAITING).
 * To publish an update: change VERSION below, then upload the files. */
const VERSION='2.0.0';
const SHELL='mp-shell-'+VERSION,TILES='mp-tiles-v2';
const FILES=['./','index.html','style.css','app.js','maplibre-gl.js','maplibre-gl.css','manifest.json','icon.png','icon-192.png','icon-maskable.png','qr.png'];
const MAX_TILES=1200;
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>Promise.all(FILES.map(f=>c.add(new Request(f,{cache:'reload'})).catch(()=>{})))))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
async function trim(c){const ks=await c.keys();if(ks.length>MAX_TILES)for(const k of ks.slice(0,ks.length-MAX_TILES))await c.delete(k)}
async function cacheFirst(req){const c=await caches.open(TILES);const hit=await c.match(req);if(hit)return hit;
 try{const r=await fetch(req);if(r&&(r.ok||r.type==='opaque')){c.put(req,r.clone());trim(c)}return r}catch(e){return Response.error()}}
async function netFirst(req){const c=await caches.open(TILES);try{const r=await fetch(req);if(r&&r.ok)c.put(req,r.clone());return r}catch(e){return (await c.match(req))||Response.error()}}
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.origin===location.origin){
  e.respondWith(caches.open(SHELL).then(async c=>{const hit=await c.match(r,{ignoreSearch:true});if(hit)return hit;
   try{return await fetch(r)}catch(err){return r.mode==='navigate'?(await c.match('index.html')):Response.error()}}));return}
 if(/tiles\.openfreemap\.org\/styles\//.test(r.url)){e.respondWith(netFirst(r));return}
 if(/openfreemap\.org|amazonaws\.com\/elevation|fonts\.(googleapis|gstatic)\.com/.test(r.url)){e.respondWith(cacheFirst(r));return}
 /* routing / search / places: always live, never cached */
});
