const SERVICE_WORKER_NAME = 'serviceworker';

let clientInfos = {};

function findByCondition(obj, conditionFunc) {
  let val;
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    val = obj[key];

    if (conditionFunc.call(null, val)) return val;
  }

  return undefined;
}

function syncClientInfos(clientIds = []) {
  for (const id in clientInfos) {
    if (clientIds.indexOf(id) >= 0) {
      console.log(`clientInfos 내 client id ${id} 가 실제 clients 로 존재하므로 제거하지 않음.`);
    } else {
      console.log(`clientInfos 내 client id ${id} 가 실제 clients 로 존재하지 않으므로 제거.`);
      delete clientInfos[id];
    }
  }
}

function getAllClients(resolveCallback) {
  self.clients.matchAll().then(resolveCallback);
}

function getClientIds(clients = []) {
  return clients.map(client => client && client.id);
}

function postMessageToClient(client, action, value) {
  client && client.postMessage({ action, value, from: SERVICE_WORKER_NAME });
}

function broadcastMessageToAllClients(clients, action, value) {
  clients.forEach(client => client && client.postMessage({ action, value, from: SERVICE_WORKER_NAME }));
}

//
// + implementation
//
// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/oninstall
self.addEventListener('install', evt => {
  console.log('[sw] install event. service worker installed. evt :', evt);

  /*
  // This way is not recommended.
  // https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle#skip_the_waiting_phase
  // https://bitsofco.de/what-self-skipwaiting-does-to-the-service-worker-lifecycle/
  self.skipWaiting().then(() => {
    // 새로운 서비스워커 install시, 즉시 이전의 서비스워커와 교체를 시도한다.
    console.log('[sw] 새 서비스워커 설치 후, resolve skipWaiting() promise');

    // 이 단계에서는 client들의 확인은 불가하다.
    getAllClients(clients => {
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
    caches.open('gih-cache').then(function(cache) { return cache.add('/index-offline.html') })
  )
  */
});

// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/onactivate
self.addEventListener('activate', evt => {
  console.log('[sw] activate event. service worker activated. evt :', evt);

  // 서비스워커가 최초로 설치되면서 install 이벤트와 activate 이벤트가 발생했더라도, 그 즉시 서비스워커가 제어하고 있는 client 는 찾을 수 없다.
  // 새로고침 이후부터 서비스워커가 client 들을 제어할 수 있다.
});

// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/onfetch
self.addEventListener('fetch', function(evt) {
  // console.log('[sw] Fetch request for :', evt.request.url);
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
  console.log('// message //');

  const client = evt.source,
    data = evt.data;

  console.log('[sw] message event :', evt);
  console.log(`[sw] client id: ${client.id}`);
  console.log('[sw] client :', client);

  let clientObj = null;
  let hasClientRelatedSocket = false;

  switch (data.action) {
    case 'REQUIRE_CONNECT_SOCKET':
      console.log('+ [sw] ✉️ REQUIRE_CONNECT_SOCKET :', data);

      if (!clientInfos[client.id]) {
        clientInfos[client.id] = {
          frameType: client.frameType,
          id: client.id,
          type: client.type,
          url: client.url,
          isIndexPage: data.value.isIndexPage,
          isConnectingSocket: false,
          isConnectedSocket: false,
        };
      }
      clientObj = clientInfos[client.id];

      getAllClients(_clients => {
        syncClientInfos(getClientIds(_clients));

        if (_clients.length <= 1) {
          // one client
          console.log(`[sw] 새 client ${evt.source.id} 의 소켓 연결을 허용한다.`);

          clientObj.isConnectingSocket = true;

          postMessageToClient(client, 'CONFIRM_CAN_CONNECT_SOCKET', { id: client.id });
          broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
        } else {
          // multi clients
          const otherClientsConnectingSocket = Object.values(clientInfos).filter(
              obj => obj.id !== client.id && obj.isConnectingSocket === true
            ),
            otherClientsConnectedSocket = Object.values(clientInfos).filter(
              obj => obj.id !== client.id && obj.isConnectedSocket === true
            );

          if (otherClientsConnectingSocket.length > 0) {
            console.log(
              `[sw] 기존 clientS 중 소켓 연결 중인 client 가 존재한다. 새 client 는 소켓 연결할 필요가 없다. 
              소켓 연결 중인 client 의 연결이 성공적으로 이루어지지 않는지, OPENED_SOCKET 또는 ERROR_SOCKET 이벤트를 단지 기다린다.`
            );

            postMessageToClient(client, 'CONFIRM_BAN_CONNECT_SOCKET', { id: client.id });
            broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
          } else if (otherClientsConnectedSocket.length > 0) {
            console.log(
              `[sw] 이미 소켓 연결이 되어 있는 client ${otherClientsConnectedSocket[0].id} 가 존재하므로, 새 client ${
                evt.source.id
              } 는 소켓 연결을 하지 않는다.`
            );

            postMessageToClient(client, 'CONFIRM_BAN_CONNECT_SOCKET', { id: client.id });
            broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
          } else {
            console.log(
              '[sw] 소켓 연결중(connecting)이거나 연결되어 있는(connected) client 가 존재하지 않으므로, 소켓 연결을 요청한 client 에 소켓 연결을 시도한다.'
            );
            clientObj.isConnectingSocket = true;

            postMessageToClient(client, 'CONFIRM_CAN_CONNECT_SOCKET', { id: client.id });
            broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
          }

          console.log('[sw] clientInfos :', clientInfos);

          // + 멀티 clients 소켓 연결 관리를 위한 테스트 케이스
          // 첫번째 client(1) 열린 후에 소켓 연결 이후

          // 1. 새 client(2) 열기
          // 1-1. 소켓 연결 상태의 client(1) 가 존재하므로, client(2) 에 소켓 연결이 되지 않아야 한다.
          // 1-2. 소켓 비연결 상태의 client(2) 닫기 => client(1) 의 소켓 연결 변화 없음. 서비스워커의 client 관리 업데이트
          // 1-3. 소켓 비연결 상태의 client(2) 새로고침 => 새로고침한 client(2) id 의 변경 => 새로고침한 client(2) 에 소켓 연결이 되지 않아야 한다. 서비스워커의 client 관리 업데이트

          // 2. 새 client(2) 열기
          // 2-1. 소켓 연결 상태의 client(1) 새로고침 => 소켓 비연결 상태의 client(2) 에 소켓 연결 시도 => client(1) 은 client id 변경되며 소켓 연결하지 않음. 서비스워커의 client 관리 업데이트.
          // 2-2-1. 소켓 비연결 상태의 client(2) 에 소켓 연결 성공 => 서비스워커의 client 관리 업데이트.
          // 2-2-2. 소켓 비연결 상태의 client(2) 에 소켓 연결 실패 => 소켓 연결된 client 없음. 사용자를 위한 안내 및 소켓 재접속 UI 표기, 서비스워커의 client 관리 업데이트
          // 2-2-3. 소켓 비연결 상태의 client(2) 에 소켓 연결 도중 client(2) 닫기 => 소켓 비연결 상태의 client(1) 이 존재하므로, client(1) 에 소켓 연결 시도 // TODO: 실테스트 환경 구성 후, 테스트 필요.
          // 2-2-4. 소켓 비연결 상태의 client(2) 에 소켓 연결 도중 client(2) 새로고침 => 새로고침한 client(2) 는 client id 변경. 소켓 비연결 상태의 client(1) 이 존재하므로, client(1) 에 소켓 연결 시도 // TODO: 실테스트 환경 구성 후, 테스트 필요.

          // 2-3. 소켓 연결 상태의 client(1) 닫기 => 소켓 비연결 상태의 client(2) 에 소켓 연결 시도
          // 2-3-1. 소켓 비연결 상태의 client(2) 에 소켓 연결 성공 => 서비스워커의 client 관리 업데이트.
          // 2-3-2. 소켓 비연결 상태의 client(2) 에 소켓 연결 실패 => 소켓 연결된 client 없음. 사용자를 위한 안내 및 소켓 재접속 UI 표기, 서비스워커의 client 관리 업데이트
          // 2-3-3. 소켓 비연결 상태의 client(2) 에 소켓 연결 도중 client(2) 닫기 => 앱 종료 및 모든 팝업의 종료 // TODO: 비즈니스 로직 구현 필요
          // 2-3-3. 소켓 비연결 상태의 client(2) 에 소켓 연결 도중 client(2) 새로고침 => client(2) 는 client id 변경되며 소켓 연결 시도 // // TODO: 실테스트 환경 구성 후, 테스트 필요.

          // 3. 소켓 연결 상태의 client 가 존재하나, 소켓 서버 측 등의 이슈로 소켓 연결 해제
          // 3-1. 소켓 연결된 client 없음. 사용자를 위한 안내 및 소켓 재접속 UI 표기, 서비스워커의 client 관리 업데이트
        }
      });

      break;

    case 'OPENED_SOCKET':
      // client 의 소켓 연결
      console.log('+ [sw] ✉️ OPENED_SOCKET :', data);

      clientObj = clientInfos[client.id] || null;
      if (clientObj) {
        clientObj.isConnectingSocket = false;
        clientObj.isConnectedSocket = true;
      }

      getAllClients(_clients => {
        syncClientInfos(getClientIds(_clients));
        broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
      });
      break;

    case 'ERROR_SOCKET':
      // client 의 소켓 연결 실패
      console.log('+ [sw] ✉️ ERROR_SOCKET :', data);

      clientObj = clientInfos[client.id] || null;
      if (clientObj) {
        clientObj.isConnectingSocket = false;
        clientObj.isConnectedSocket = false;
      }

      hasClientRelatedSocket =
        Object.values(clientInfos).filter(obj => obj.isConnectingSocket === true || obj.isConnectedSocket === true)
          .length > 0;
      if (!hasClientRelatedSocket) {
        console.log(
          '[sw] 소켓 연결중 or 연결되어 있는 client 는 없다. TODO: 사용자를 위한 안내 및 소켓 재접속 UI 표기 필요.'
        );
      }

      getAllClients(_clients => {
        syncClientInfos(getClientIds(_clients));
        broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
      });
      break;

    case 'CLOSED_SOCKET':
      // client 웹 페이지는 열려 있으나, socket connection 이 close 된 경우
      clientObj = clientInfos[client.id] || null;
      if (clientObj) {
        clientObj.isConnectingSocket = false;
        clientObj.isConnectedSocket = false;
      }

      hasClientRelatedSocket =
        Object.values(clientInfos).filter(obj => obj.isConnectingSocket === true || obj.isConnectedSocket === true)
          .length > 0;
      if (!hasClientRelatedSocket) {
        console.log(
          '[sw] 소켓 연결중 or 연결되어 있는 client 는 없다. TODO: 사용자를 위한 안내 및 소켓 재접속 UI 표기 필요.'
        );
      }

      getAllClients(_clients => {
        syncClientInfos(getClientIds(_clients));
        broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
      });
      break;

    case 'CLOSED_CLIENT':
      // client 가 닫힐 때 index 페이지였다면, 이 프로세스를 수행한다.
      console.log('+ [sw] ✉️ CLOSED_CLIENT :', data);

      const closedClientInfo = clientInfos[client.id] || null;
      if (closedClientInfo) {
        if (closedClientInfo.isIndexPage === true) {
          // in index page

          if (closedClientInfo.isConnectingSocket === true || closedClientInfo.isConnectedSocket === true) {
            // 소켓 연결중 or 연결되어 있던 client 가 닫혔으므로, 소켓 연결할 새로운 client 를 찾는다.
            delete clientInfos[client.id];

            const clientInfo = findByCondition(clientInfos, obj => obj && obj.isIndexPage === true);
            if (clientInfo) {
              console.log('[sw] 소켓 연결 중인 페이지가 close 되어, 이후 소켓 연결할 client info :', clientInfo);

              self.clients
                .get(clientInfo.id)
                .then(client => {
                  clientInfo.isConnectingSocket = true;
                  clientInfo.isConnectedSocket = false;
                  console.log('[sw] resolved. clientInfos :', clientInfos);

                  postMessageToClient(client, 'SHOULD_CONNECT_SOCKET', { id: clientInfo.id, clientInfos });

                  getAllClients(_clients => {
                    syncClientInfos(getClientIds(_clients));
                    broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
                  });
                })
                .catch(error => {
                  clientInfo.isConnectingSocket = false;
                  clientInfo.isConnectedSocket = false;
                  console.log('[sw] rejected. clientInfos :', clientInfos);

                  console.log(
                    '[sw] 소켓 연결중 or 연결되어 있던 client close 후, 새롭게 소켓을 연결할 client 찾기 실패'
                  );
                });
            } else {
              console.log(
                '[sw] 소켓 연결중 or 연결되어 있던 client close 후, 소켓 연결할 index page 의 client 가 존재하지 않는다.'
              );
            }
          } else {
            // 소켓 연결중이 아닌 and 연결되어 있지 않았던 client 가 닫혔으므로, 닫힌 client 에 대한 정보 제거
            delete clientInfos[client.id];

            console.log('[sw] clientInfos :', clientInfos);

            getAllClients(_clients => {
              syncClientInfos(getClientIds(_clients));
              broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
            });
          }
        } else {
          // TODO: // in popup
          console.log('[sw] TODO: popup 이 닫혔어요.');
        }
      }
      break;

    /*
    case 'REQUIRE_CLIENT_INFOS_FOR_SKIP_WAITING':
      console.log('[sw] REQUIRE_CLIENT_INFOS_FOR_SKIP_WAITING : ', clientInfos);

      getAllClients(_clients => {
        const clientIds = _clients.map(c => c.id);
        syncClientInfos(clientIds);

        client.postMessage({
          action: 'SEND_CLIENT_INFOS_FOR_SKIP_WAITING',
          value: clientInfos,
          from: SERVICE_WORKER_NAME,
        });
      });
      break;
    */

    case 'REQUIRE_SKIP_WAITING':
      console.group('+ [sw] ✉️ REQUIRE_SKIP_WAITING');
      console.log('[sw] before skipWaiting clientInfos :', JSON.stringify(clientInfos));

      /*
      self
        .skipWaiting()
        .then(() => {
          console.log('[sw] resolve skipWaiting() promise');

          getAllClients(clients => {
            console.log(
              `[sw] 모든 client 들에게 'skipWaitingComplete' action을 postMessage로 전달한다. clients :`,
              clients
            );

            console.log('[sw] after skipWaiting clientInfos :', JSON.stringify(clientInfos));

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

      // getAllClients(clients => {
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

    case 'PRINT_CLIENTS_NUM':
      console.group('+ [sw] ✉️ PRINT_CLIENTS_NUM');
      getAllClients(_clients => {
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
