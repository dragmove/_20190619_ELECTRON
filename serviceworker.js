const SERVICE_WORKER_NAME = 'serviceworker';

let clientsInfoObj = {};

function findFromObject(obj, conditionFunc) {
  let val;
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    val = obj[key];

    if (conditionFunc.call(null, val)) return val;
  }

  return undefined;
}

function syncClientsInfoObj(clientIds = []) {
  for (const id in clientsInfoObj) {
    if (clientIds.indexOf(id) >= 0) {
      console.log(`clientsInfoObj 관리 하의 ${id} 가 실제 client id 에 존재하므로 삭제하지 않음.`);
    } else {
      console.log(`clientsInfoObj 관리 하의 ${id} 가 실제 client id 에 존재하므로 삭제하지 않음.`);
      delete clientsInfoObj[id];
    }
  }
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
  console.log('clientsInfoObj :', clientsInfoObj);

  console.log('[sw] message event :', evt);

  const client = evt.source,
    data = evt.data;
  // port = evt.ports[0]; // client의 MessageChannel의 port2를 전달 받는다.

  console.log(`[sw] client id: ${evt.source.id}`);
  console.log('[sw] client :', client);
  // console.log('port :', port);
  // console.log('[sw] evt.source :', evt.source); // e.g: { focused: true, frameType: "top-level", id: "893e3eef-1f4b-4eec-b1ae-e7a68eb70ffc", type: "window", url: "http://localhost:8443/", visibilityState: "visible" }

  let clientObj = null;
  switch (data.action) {
    case 'REQUIRE_CONNECT_SOCKET':
      console.log('+ [sw] ✉️ REQUIRE_CONNECT_SOCKET :', data);

      clientObj = clientsInfoObj[client.id] || null;
      if (!clientObj) {
        clientsInfoObj[client.id] = {
          frameType: client.frameType,
          id: client.id,
          type: client.type,
          url: client.url,
          isIndexPage: data.value.isIndexPage,
          isConnectingSocket: false,
          isConnectedSocket: false,
        };
      }
      console.log('clientsInfoObj :', clientsInfoObj);

      postAllClients(_clients => {
        const clientIds = _clients.map(c => c.id); // []

        if (_clients.length <= 1) {
          // client 가 하나 뿐이므로, 이 client 에 socket 을 연결하도록 허용한다.
          syncClientsInfoObj(clientIds);
          console.log('[sw] clientsInfoObj :', clientsInfoObj);

          if (clientObj) clientObj.isConnectingSocket = true;

          client.postMessage({
            action: 'CONFIRM_CAN_CONNECT_SOCKET',
            from: SERVICE_WORKER_NAME,
          });
        } else {
          // client 가 여러 개이므로 주의가 필요하다.
          syncClientsInfoObj(clientIds);

          const clientInfos = Object.values(clientsInfoObj);
          const clientsConnectingSocket = clientInfos.filter(
            obj => obj.id !== client.id && obj.isConnectingSocket === true
          );
          const clientsConnectedSocket = clientInfos.filter(
            obj => obj.id !== client.id && obj.isConnectedSocket === true
          );

          if (clientsConnectingSocket.length > 0) {
            console.log(
              `[sw] 기존 clientS 중 소켓 연결 중인 client 가 존재한다. 새 client 는 소켓 연결할 필요가 없다. 
              소켓 연결 중인 client 의 연결이 성공적으로 이루어지지 않는지, OPENED_SOCKET 또는 ERROR_SOCKET 이벤트를 단지 기다린다.`
            );
          } else if (clientsConnectedSocket.length > 0) {
            console.log(
              `[sw] 이미 소켓 연결이 되어 있는 client ${
                clientsConnectedSocket[0].id
              } 가 존재하므로, 새 client 는 소켓 연결을 하지 않는다.`
            );
          } else {
            console.log(
              '[sw] 소켓 연결 중이거나 연결이 되어 있는 client 가 존재하지 않으므로, 새 client 에 소켓 연결을 시도한다.'
            );

            // TODO: 새로운 client 에 소켓 연결을 시도하도록 한다.
          }

          // TODO: 테스트
          // 소켓 연결되어 있는 첫번째 탭 이후에

          // 1. 새로운 탭 열기 => 새로운 client 가 등록되는 것을 확인할 수 있다. => 테스트 필요
          // 2. 열린 새로운 탭의 새로고침 => client id 가 변경되는 것을 확인할 수 있다. => 테스트 필요
          // 3. 기존에 socket 연결되어 있던 탭의 새로고침 => close 되는 순간에 'CLOSED_CLIENT' 이벤트가 전달되어, 다른 탭의 소켓 연결이 시작되는 상황에서

          /*
          clientObj = clientsInfoObj[client.id] || null;
          if (clientObj) clientObj.isConnectedSocket = true;

          client.postMessage({
            action: 'CONFIRM_BAN_CONNECT_SOCKET',
            from: SERVICE_WORKER_NAME,
          });
          */
        }
      });

      break;

    case 'OPENED_SOCKET':
      console.log('+ [sw] ✉️ OPENED_SOCKET :', data);
      clientObj = clientsInfoObj[client.id] || null;
      if (clientObj) {
        clientObj.isConnectingSocket = false;
        clientObj.isConnectedSocket = true;
      }

      postAllClients(_clients => {
        console.log('[sw] OPENED_SOCKET clients 재조사 :', _clients);
      });

      break;

    case 'ERROR_SOCKET':
      // client 웹 페이지에서 socket connection 이 실패한 경우
      console.log('+ [sw] ✉️ ERROR_SOCKET :', data);
      clientObj = clientsInfoObj[client.id] || null;
      if (clientObj) {
        clientObj.isConnectingSocket = false;
        clientObj.isConnectedSocket = false;
      }

      // TODO: 소켓 연결을 시도하려고 하다가 실패했는데, 이 경우 현재 모든 clients 어디에도 소켓 연결이 안 되어 있는지 체크하여 조치를 취해야 한다.

      break;

    case 'CLOSED_SOCKET':
      // client 웹 페이지는 열려 있으나, socket connection 이 close 된 경우
      clientObj = clientsInfoObj[client.id] || null;
      if (clientObj) {
        clientObj.isConnectingSocket = false;
        clientObj.isConnectedSocket = false;
      }

      // TODO: 소켓 연결되어 있던 페이지의 소켓 연결이 어떠한 이유로 인하여 끊겼는데, 재연결을 하는 조치를 취해야 한다.

      break;

    case 'CLOSED_CLIENT':
      // client 웹 페이지가 닫힐 때 index 페이지였다면, 이 프로세스를 수행한다.
      console.log('+ [sw] ✉️ CLOSED_CLIENT :', data);

      const closedClientObj = clientsInfoObj[client.id] || null;
      if (closedClientObj) {
        if (closedClientObj.isIndexPage) {
          if (closedClientObj.isConnectingSocket || closedClientObj.isConnectedSocket) {
            // 대체 소켓 연결할 페이지를 찾는다.
            delete clientsInfoObj[client.id];

            const obj = findFromObject(clientsInfoObj, obj => obj && obj.isIndexPage === true);
            if (obj) {
              console.log('소켓 연결 중인 페이지가 close 되어, 이후 소켓 연결할 index 페이지 :', obj);

              self.clients
                .get(obj.id)
                .then(clientToConnectSocket => {
                  obj.isConnectingSocket = true;
                  obj.isConnectedSocket = false;

                  clientToConnectSocket.postMessage({
                    action: 'SHOULD_CONNECT_SOCKET',
                    from: SERVICE_WORKER_NAME,
                  });
                })
                .catch(error => {
                  obj.isConnectingSocket = false;
                  obj.isConnectedSocket = false;

                  // TODO: 소켓 연결하려고 했던 client 에 접근하지 못 한 상황.
                  // 어떻게 할 것인가?
                });
            } else {
              console.log('다음에 소켓 연결할, 다른 index 페이지가 없다.');
              // TODO:
            }
          } else {
            delete clientsInfoObj[client.id];
          }
        } else {
          // TODO: 팝업 페이지
        }
      }

      console.log('CLOSED_CLIENT 작업 후 clientsInfoObj :', clientsInfoObj);
      break;

    case 'REQUIRE_SKIP_WAITING':
      console.group('+ [sw] ✉️ REQUIRE_SKIP_WAITING');
      console.log('[app] before skipWaiting clientsInfoObj :', JSON.stringify(clientsInfoObj));

      /*
      self
        .skipWaiting()
        .then(() => {
          console.log('[sw] resolve skipWaiting() promise');

          postAllClients(clients => {
            console.log(
              `[sw] 모든 client 들에게 'skipWaitingComplete' action을 postMessage로 전달한다. clients :`,
              clients
            );

            console.log('[app] after skipWaiting clientsInfoObj :', JSON.stringify(clientsInfoObj));

            // 모든 client 들에게 skipWaiting 이 성공했음을 전달한다.
            clients.forEach(client => {
              client.postMessage({ action: 'SKIP_WAITING_COMPLETE', from: SERVICE_WORKER_NAME });
            });

            // TODO: 소켓에 연결되어 있던 client 를 찾아서 이 녀석에게만 어떠한 일을 해주어야 할까? 'ㅅ')?
          });
        })
        .catch(error => {
          // TODO: 새로운 서비스워커를 skip waiting 하는 과정에서 error 가 발생한다면 어떻게 해야 하는가?
        });
        */
      console.groupEnd();
      break;

    /*
    case 'FROM_SOCKET_SERVER':
      console.group('+ [sw] ✉️ FROM_SOCKET_SERVER');
      console.log('[sw] get action:FROM_SOCKET_SERVER. data :', data);
      console.log(`[sw] 모든 client 들에게 'FROM_SERVICE_WORKER_FROM_SOCKET_SERVER' action을 postMessage로 전달한다`);
      console.groupEnd();

      // socket 서버 측으로부터, 각각의 index.html 에 연결된 socket 메세지가 전달된다.
      // focused client 로부터 전달된 메세지가 아닐 경우, 무시하도록 한다.

      // console.log('[sw] client.focused :', client.focused);

      // if (!client.focused) return;

      // postAllClients(clients => {
      //   clients.forEach(client => {
      //     client.postMessage({
      //       action: 'FROM_SERVICE_WORKER_FROM_SOCKET_SERVER',
      //       value: data.value,
      //       clientId: client.id,
      //       from: SERVICE_WORKER_NAME,
      //     });
      //   });
      // });

      break;
      */

    case 'GET_CLIENTS_NUM':
      console.group('+ [sw] ✉️ GET_CLIENTS_NUM');
      postAllClients(_clients => {
        console.log('[sw] clients :', _clients);
      });
      console.groupEnd();
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
