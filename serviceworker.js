self.addEventListener('install', evt => {
  console.log('[sw] install event. service worker installed');

  // postpone trigger 'install' evt until resolve promise.
  // evt.waitUntil( promise );

  /*
  // postpone 'install' evt until finishing some files caching.
  evt.waitUntil(
    caches.open('gih-cache').then(function(cache) {
      return cache.add('/index-offline.html')
    })
  )
  */
});

self.addEventListener('activate', () => {
  console.log('[sw] activate event. service worker activated');
});

self.addEventListener('fetch', function(evt) {
  // console.log('Fetch request for :', evt.request.url);
  /*
  evt.respondWith(
    fetch(evt.request).catch(function() {
      return new Response('[sw] Welcome to the offline mode');
      // return new Response('some html', { headers: { 'Content-Type': 'text/html' } })
    })
  );
  */
  // payload response
  // evt.respondWith(fetch(evt.request));
  /*
  // replace response with new fetch
  if (evt.request.url.includes('/img/logo.png')) {
    evt.respondWith(fetch('/img/logo-flipped.png'));
  }
  */
  /*
  // replace response
  if (evt.request.url.includes('bootstrap.min.css')) {
    evt.respondWith(
      new Response('background-color: #ff0;', {
        headers: {
          'Content-Type': 'text/css'
        }
      })
    );
  }
  */
});

/*
 * message process
 */
self.addEventListener('message', evt => {
  console.log('[sw] message event :', evt);

  const data = evt.data,
    port = evt.ports[0]; // receive port2 of message channel from client page

  console.log(`[sw] evt.data from client ${evt.source.id} :`, data);
  console.log('[sw] evt.source :', evt.source); // { focused: true, frameType: "top-level", id: "893e3eef-1f4b-4eec-b1ae-e7a68eb70ffc", type: "window", url: "http://localhost:8443/", visibilityState: "visible" }

  switch (data.action) {
    case 'getClientsNum':
      self.clients.matchAll().then(_clients => {
        console.log('[sw] clients :', _clients);

        port.postMessage({
          action: 'getClientNum',
          value: _clients.length,
        });
      });

      break;

    case 'skipWaiting':
      self.skipWaiting().then(() => {
        console.log('[sw] complete skipWaiting()');

        postAllClients(clients => {
          console.log(`[sw] post 'skipWaitingComplete' message to all clients. clients :`, clients);

          clients.forEach(client => {
            client.postMessage({ action: 'skipWaitingComplete' });
          });
        });
      });
      break;
  }

  /*
  // send message to one client who posted message
  this.self.clients.get(evt.source.id).then(client => {
    client.postMessage(`client.id from clients.get(evt.source.id): ${evt.source.id}`);
  });
  */

  // send message to all clients
  /*
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      // console.log('[sw] client.id :', client.id);
      client.postMessage(`your client.id is ${client.id}.`);
    });
  });
  */
});

/*
 * push process
 */
self.addEventListener('push', function() {
  console.log('[sw] push');
});

function postAllClients(resolveCallback) {
  self.clients.matchAll().then(resolveCallback);
}
