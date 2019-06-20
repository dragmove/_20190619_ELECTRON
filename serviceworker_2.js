self.addEventListener('install', function(event) {
  console.log('[sw] service worker 2 installed.');

  // postpone 'install' event after resolve promise
  // event.waitUntil( promise );

  /*
  // postpone 'install' event after finishing some files caching
  event.waitUntil(
    caches.open('gih-cache').then(function(cache) {
      return cache.add('/index-offline.html')
    })
  )
  */
});

self.addEventListener('activate', function() {
  console.log('[sw] service worker 2 activated.');
});

self.addEventListener('fetch', function(event) {
  // console.log('Fetch request for :', event.request.url);
  /*
  event.respondWith(
    fetch(event.request).catch(function() {
      return new Response('[sw] Welcome to the offline mode');
      // return new Response('some html', { headers: { 'Content-Type': 'text/html' } })
    })
  );
  */
  // payload response
  // event.respondWith(fetch(event.request));
  /*
  // replace response with new fetch
  if (event.request.url.includes('/img/logo.png')) {
    event.respondWith(fetch('/img/logo-flipped.png'));
  }
  */
  /*
  // replace response
  if (event.request.url.includes('bootstrap.min.css')) {
    event.respondWith(
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
self.addEventListener('message', function(evt) {
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
  }

  /*
  // send message to one client who posted message
  this.self.clients.get(evt.source.id).then(client => {
    client.postMessage(`client.id from clients.get(evt.source.id): ${evt.source.id}`);
  });
  */

  // send message to all clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      // console.log('[sw] client.id :', client.id);
      client.postMessage(`your client.id is ${client.id}.`);
    });
  });
});

/*
 * push process
 */
self.addEventListener('push', function() {
  console.log('[sw] push');
});
