const CACHE_NAME = 'depilclear-offline-v2';

// Ficheiros locais estritamente essenciais da sua aplicação
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

// Instalação: grava os arquivos locais sem deixar o processo falhar
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of LOCAL_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`Não foi possível salvar o recurso ${asset} no cache:`, err);
        }
      }
    })
  );
});

// Ativação: assume o controlo imediato das abas abertas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceção de pedidos de rede
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignora chamadas de API do servidor (login)
  if (request.url.includes('/api/')) {
    return;
  }

  // Se o utilizador estiver a recarregar a página ou a aceder à raiz
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put('/index.html', responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          // OFFLINE: devolve o index.html guardado para não dar tela de dinossauro
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Para estilos, imagens e scripts: tenta a cache primeiro; se não tiver, busca na rede
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Recurso sem rede e sem cache prévio
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});