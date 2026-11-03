// 손안의도구 서비스 워커: 페이지는 항상 최신을 먼저, 끊기면 저장본으로
const V='sonandogu-v1';
self.addEventListener('install',e=>{self.skipWaiting(); e.waitUntil(caches.open(V).then(c=>c.addAll(['/','/assets/favicon.svg'])).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return; const u=new URL(r.url); if(u.origin!==location.origin) return;
  if(r.mode==='navigate'){ e.respondWith(fetch(r).then(res=>{const c=res.clone(); caches.open(V).then(x=>x.put(r,c)); return res;}).catch(()=>caches.match(r).then(m=>m||caches.match('/')))); return; }
  if(u.pathname.startsWith('/assets/')){ e.respondWith(caches.match(r).then(m=>{const net=fetch(r).then(res=>{const c=res.clone(); caches.open(V).then(x=>x.put(r,c)); return res;}).catch(()=>m); return m||net;})); }
});
