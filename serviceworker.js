// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/oninstall
self.addEventListener('install', evt => {
  console.log('[sw] install event. service worker installed.. evt :', evt);

  /*
  // TODO: this method rescue the situation that user have to refresh app.
  // https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle#skip_the_waiting_phase
  // https://bitsofco.de/what-self-skipwaiting-does-to-the-service-worker-lifecycle/
  // 새로운 서비스워커가 install시, 즉시 이전의 서비스워커와 교체를 시도한다.
  self.skipWaiting().then(() => {
    console.log('[sw] 새 서비스워커 설치 후, resolve skipWaiting() promise');

    // 이 단계에서는 client들의 확인은 불가하다.
    postAllClients(clients => {
      console.log(
        `[sw] 새 서비스워커가 install되면, 자동으로 skipWaiting 실행 후 clients 갯수 확인 시도한다. clients :`,
        clients
      );
    });
  });
  */

  /*
  // 특정 파일들의 caching 이 완료될 때까지 'install' event 의 발생을 지연시킨다.
  evt.waitUntil(
    caches.open('gih-cache').then(function(cache) {
      return cache.add('/index-offline.html')
    })
  )
  */
});

// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/onactivate
self.addEventListener('activate', evt => {
  console.log('[sw] activate event. service worker activated. evt :', evt);

  // 서비스워커가 최초로 설치되면서 install 이벤트와 activate 이벤트가 발생했더라도, 그 즉시 서비스워커가 제어하고 있는 client 는 찾을 수 없다.
  // 새로 고침 이후부터 서비스워커가 client 들을 제어할 수 있다.
});

// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/onfetch
self.addEventListener('fetch', function(evt) {
  // console.log('Fetch request for :', evt.request.url);
  // # payload response
  // evt.respondWith(fetch(evt.request));
  /*
  // # replace response with new fetch
  if (evt.request.url.includes('/img/logo.png')) {
    evt.respondWith(fetch('/img/logo-flipped.png'));
  }
  */
  /*
  // # detect fetch error and replace response
  evt.respondWith(
    fetch(evt.request).catch(function() {
      return new Response('[sw] Welcome to the offline mode');
      // return new Response('some html', { headers: { 'Content-Type': 'text/html' } })
    })
  );
  */
  /*
  // # replace response
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
// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/onmessage
self.addEventListener('message', evt => {
  console.log('[sw] message event :', evt);

  const data = evt.data,
    port = evt.ports[0]; // client의 MessageChannel의 port2를 전달 받는다.

  console.log(`[sw] evt.data from client ${evt.source.id} :`, data);
  console.log('[sw] evt.source :', evt.source); // e.g: { focused: true, frameType: "top-level", id: "893e3eef-1f4b-4eec-b1ae-e7a68eb70ffc", type: "window", url: "http://localhost:8443/", visibilityState: "visible" }

  switch (data.action) {
    case 'getClientsNum':
      self.clients.matchAll().then(_clients => {
        console.log('[sw] clients :', _clients);

        // 현재 서비스워커가 제어하고 있는 client 갯수를 client 측에 전달한다.
        port.postMessage({
          action: 'getClientNum',
          value: _clients.length,
        });
      });

      break;

    case 'skipWaiting':
      self.skipWaiting().then(() => {
        console.log('[sw] resolve skipWaiting() promise');

        postAllClients(clients => {
          console.log(
            `[sw] 모든 client 들에게 'skipWaitingComplete' action을 postMessage로 전달한다. clients :`,
            clients
          );

          clients.forEach(client => {
            client.postMessage({ action: 'skipWaitingComplete' });
          });
        });
      });
      break;
  }

  /*
  // message를 전달한 한 client에게 message를 전달한다.
  this.self.clients.get(evt.source.id).then(client => {
    client.postMessage(`client.id from clients.get(evt.source.id): ${evt.source.id}`);
  });
  */

  /*
  // 모든 client들에게 message를 전달한다.
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      // console.log('[sw] client.id :', client.id);
      client.postMessage(`your client.id is ${client.id}.`);
    });
  });
  */
});

function postAllClients(resolveCallback) {
  self.clients.matchAll().then(resolveCallback);
}
