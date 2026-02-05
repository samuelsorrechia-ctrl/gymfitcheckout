// Service Worker para GymFitCheckout
const CACHE_NAME = 'gymfitcheckout-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[Service Worker] Cacheando arquivos');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('[Service Worker] Instalação completa');
        return self.skipWaiting();
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Ativando...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('[Service Worker] Ativação completa');
      return self.clients.claim();
    })
  );
});

// Intercepta requisições
self.addEventListener('fetch', function(event) {
  console.log('[Service Worker] Fetch:', event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Retorna do cache se encontrado
        if (response) {
          console.log('[Service Worker] Retornando do cache:', event.request.url);
          return response;
        }
        
        // Se não está no cache, busca na rede
        console.log('[Service Worker] Buscando da rede:', event.request.url);
        return fetch(event.request)
          .then(function(networkResponse) {
            // Não cacheia requisições que não sejam GET
            if (event.request.method !== 'GET') {
              return networkResponse;
            }
            
            // Faz uma cópia da resposta para cache
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
                console.log('[Service Worker] Novo cache:', event.request.url);
              });
            
            return networkResponse;
          })
          .catch(function(error) {
            console.log('[Service Worker] Falha na rede:', error);
            
            // Se offline e não HTML, retorna página offline
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/');
            }
            
            // Para outras requisições, pode retornar um fallback
            return new Response('Modo offline - Sem conexão', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Mensagens do Service Worker
self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});