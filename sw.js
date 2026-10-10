// Service Worker - DepilClear (offline-first para o sistema de agendamentos)
const CACHE_NAME = 'depilclear-offline-v3';

const LOCAL_ASSETS = [
  '/',
  '/index.html',
  '/caixa.html',
  '/caixa.css',
  '/caixa.js',
  '/style.css',
  '/app.js',
  '/logo.png'
];

// Bibliotecas externas das quais as telas dependem (sem elas o layout quebra offline)
const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of LOCAL_ASSETS) {
        try { await cache.add(asset); }
        catch (err) { console.warn(`Não foi possível salvar ${asset}:`, err); }
      }
      // CDNs: no-cors gera resposta "opaque", suficiente para <script> e <link>
      for (const url of CDN_ASSETS) {
        try { await cache.add(new Request(url, { mode: 'no-cors' })); }
        catch (err) { console.warn(`Não foi possível salvar ${url}:`, err); }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isCacheable(response) {
  return response && (response.status === 200 || response.type === 'opaque');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Só intercepta GET; APIs (login, WhatsApp, fidelidade) sempre vão direto à rede
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  // Navegação entre páginas: rede primeiro; cada página é guardada na SUA própria URL
  // (antes, abrir o caixa sobrescrevia o index.html no cache)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (isCacheable(networkResponse)) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;
          const fallback = url.pathname.endsWith('caixa.html')
            ? await caches.match('/caixa.html')
            : await caches.match('/index.html');
          return fallback || (await caches.match('/')) || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // CDNs e fontes: usa o cache e atualiza em segundo plano
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (isCacheable(res)) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Arquivos locais: rede primeiro (pega atualizações do app.js), cache se estiver offline
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (isCacheable(res)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request).then((c) => c || new Response('', { status: 408, statusText: 'Offline' })))
  );
});
