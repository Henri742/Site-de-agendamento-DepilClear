// Service Worker - DepilClear (offline-first para o sistema de agendamentos)
// v5: Tailwind compilado (sem CDN), logo WebP, página de privacidade e manifest.
// ATENÇÃO: respostas de CDN guardadas aqui são "opacas" (no-cors): o navegador NÃO consegue conferir o
// hash SRI delas ao servir do cache. A verificação de integridade acontece na 1ª carga pela rede; a cópia
// em cache é confiável apenas se a 1ª carga foi legítima. Ao trocar de versão de CDN, suba o número do cache.
const CACHE_NAME = 'depilclear-offline-v9';

const LOCAL_ASSETS = [
  '/',
  '/index.html',
  '/caixa.html',
  '/caixa.css',
  '/caixa.js',
  '/style.css',
  '/tema.css',
  '/app.js',
  '/security.js',
  '/sync.js',
  '/import.js',
  '/vendor/supabase.js',
  '/usuarios.html',
  '/usuarios.js',
  '/logo.webp',
  '/icon-192.webp',
  '/icon-512.webp',
  '/tailwind.css',
  '/manifest.webmanifest',
  '/privacidade.html',
  '/termos.html',
  '/404.html'
];

// Bibliotecas externas das quais as telas dependem (sem elas o layout quebra offline)
const CDN_HOSTS = [
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

const CDN_ASSETS = [
  'https://unpkg.com/lucide@0.462.0/dist/umd/lucide.min.js',
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

  // Banco (Supabase) e qualquer outro domínio: nunca guardar no cache (dados pessoais e sempre atuais)
  if (url.origin !== self.location.origin) return;

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
