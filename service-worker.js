const CACHE = 'stqa-cards-v4';
const ASSETS = ['./','index.html','style.css','script.js','manifest.json',
  'assets/logo-data.js','assets/signature-data.js','assets/stamp-data.js','assets/signature.png','assets/stamp.png','assets/watermark-data.js','assets/watermark.png','assets/association-logo.png','assets/application-icon.png','assets/application-icon-192.png','assets/application-icon-maskable.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    // also cache Google Fonts (Cairo) at runtime so Arabic text looks identical offline
    if (res && (res.ok || res.type === 'opaque') && /fonts\.(googleapis|gstatic)\.com/.test(e.request.url)) { const c = res.clone(); caches.open(CACHE).then(ch => ch.put(e.request, c)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
