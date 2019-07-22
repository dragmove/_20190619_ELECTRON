const SERVICE_WORKER_NAME = 'serviceworker';

let mainClientId = '';
console.log('[sw] mainClientId :', mainClientId);

function isMainClient(client) {
  return client.url === 'http://localhost:9001/' && client.focused === true;
}

//
// + implementation
//

// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/oninstall
self.addEventListener('install', evt => {
  console.log('[sw] install event. service worker installed. evt :', evt);

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
  /*
  // 서비스워커가 활성화 이후, 새로고침 하여 제어권을 가지게 되면, 이 'activate' 이벤트는 발생하지 않으므로 mainClientId 지정이 여기서는 불가하다.
  postAllClients(_clients => {
    console.log('clients :', _clients);

    const focusedMainClient = _clients.filter(isMainClient)[0];
    console.log('focusedMainClient :', focusedMainClient);

    if (focusedMainClient) {
      mainClientId = focusedMainClient.id;
    }
    console.log('mainClientId :', mainClientId);
  });
  */
});

// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/onfetch
self.addEventListener('fetch', function(evt) {
  console.log('[sw] Fetch request for :', evt.request.url);
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
  console.log('//');
  console.log('[sw] message event :', evt);

  const client = evt.source,
    data = evt.data,
    port = evt.ports[0]; // client의 MessageChannel의 port2를 전달 받는다.

  console.log(`[sw] evt.data from client ${evt.source.id}`);
  // console.log('[sw] evt.source :', evt.source); // e.g: { focused: true, frameType: "top-level", id: "893e3eef-1f4b-4eec-b1ae-e7a68eb70ffc", type: "window", url: "http://localhost:8443/", visibilityState: "visible" }

  switch (data.action) {
    case 'getClientsNum':
      console.group('+ [sw] ✉️ GET_CLIENTS_NUM');
      console.log('[sw] get action:getClientsNum');
      postAllClients(_clients => {
        console.log('[sw] clients :', _clients);

        // 현재 서비스워커가 제어하고 있는 client 갯수를 특정 port의 client에게만 전달한다.
        port.postMessage({
          action: 'clientsNum',
          value: _clients.length,
          from: SERVICE_WORKER_NAME,
        });
      });
      console.groupEnd();
      break;

    case 'skipWaiting':
      console.group('+ [sw] ✉️ SKIP_WAITING');
      console.log('[sw] get action:skipWaiting');
      self.skipWaiting().then(() => {
        console.log('[sw] resolve skipWaiting() promise');

        postAllClients(clients => {
          console.log(
            `[sw] 모든 client 들에게 'skipWaitingComplete' action을 postMessage로 전달한다. clients :`,
            clients
          );

          clients.forEach(client => {
            client.postMessage({ action: 'skipWaitingComplete', from: SERVICE_WORKER_NAME });
          });
        });
      });
      console.groupEnd();
      break;

    case 'openWebSocket':
      console.group('+ [sw] ✉️ FROM_CLIENT');
      console.log('[sw] get action:openWebSocket. data :', data);
      console.groupEnd();
      break;

    case 'FROM_SOCKET_SERVER':
      console.group('+ [sw] ✉️ FROM_SOCKET_SERVER');
      console.log('[sw] get action:FROM_SOCKET_SERVER. data :', data);
      console.log(`[sw] 모든 client 들에게 'FROM_SERVICE_WORKER_FROM_SOCKET_SERVER' action을 postMessage로 전달한다`);
      console.groupEnd();

      // socket 서버 측으로부터, 각각의 index.html 에 연결된 socket 메세지가 전달된다.
      // focused client 로부터 전달된 메세지가 아닐 경우, 무시하도록 한다.

      console.log('[sw] client.focused :', client.focused);

      /*
      if (!client.focused) return;

      postAllClients(clients => {
        clients.forEach(client => {
          client.postMessage({
            action: 'FROM_SERVICE_WORKER_FROM_SOCKET_SERVER',
            value: data.value,
            clientId: client.id,
            from: SERVICE_WORKER_NAME,
          });
        });
      });
      */

      break;
  }

  /*
  // message를 전달한 한 client에게 message를 전달한다.
  this.self.clients.get(evt.source.id).then(client => {
    client.postMessage({
      value: `client.id from clients.get(evt.source.id): ${evt.source.id}`,
      from: SERVICE_WORKER_NAME,
    });
  });
  */

  /*
  // 모든 client들에게 message를 전달한다.
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      // console.log('[sw] client.id :', client.id);
      client.postMessage({
        value: `your client.id is ${client.id}.`,
        from: SERVICE_WORKER_NAME,
      });
    });
  });
  */
});

function postAllClients(resolveCallback) {
  self.clients.matchAll().then(resolveCallback);
}
