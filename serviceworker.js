const SERVICE_WORKER_IDENTIFIER = 'serviceworker';

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
  client && client.postMessage({ action, value, from: SERVICE_WORKER_IDENTIFIER });
}

function broadcastMessageToAllClients(clients, action, value) {
  clients.forEach(client => client && client.postMessage({ action, value, from: SERVICE_WORKER_IDENTIFIER }));
}

/*
 * implementation
 */
// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/oninstall
self.addEventListener('install', evt => {
  console.log('[sw] install event. service worker installed. evt :', evt);

  /*
  // + Ref: This way is not recommended.
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

  // 특정 파일들의 caching 이 완료될 때까지 'install' event 의 발생을 지연시킨다.
  // evt.waitUntil( caches.open('gih-cache').then(function(cache) { return cache.add('/index-offline.html') }) )
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
      console.log('!!![sw] clientObj :', clientObj);

      if (clientObj.isIndexPage === false) {
        // popup client
        console.log(`[sw] client ${client.id} 는 popup client 이므로 소켓 연결 비허용.`);

        postMessageToClient(client, 'CONFIRM_BAN_CONNECT_SOCKET', { id: client.id });

        getAllClients(_clients => {
          syncClientInfos(getClientIds(_clients));
          broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
        });

        return;
      }

      // index client
      getAllClients(_clients => {
        syncClientInfos(getClientIds(_clients));
        console.log('[sw] _clients :', _clients);
        console.log('[sw] clientInfos :', clientInfos);

        if (_clients.length <= 1) {
          // + one index client
          console.log(`[sw] 새 client ${client.id} 의 소켓 연결을 허용한다.`);

          clientObj.isConnectingSocket = true;

          postMessageToClient(client, 'CONFIRM_CAN_CONNECT_SOCKET', { id: client.id });
          broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
        } else {
          // + multi index clients
          const otherClientsConnectingSocket = Object.values(clientInfos).filter(
              obj => obj.id !== client.id && obj.isIndexPage === true && obj.isConnectingSocket === true
            ),
            otherClientsConnectedSocket = Object.values(clientInfos).filter(
              obj => obj.id !== client.id && obj.isIndexPage === true && obj.isConnectedSocket === true
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
                client.id
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

          // + 서비스워커 설치 프로세스 테스트 케이스
          // 첫번째 client(0) 열린 후 서비스워커 설치 진행
          // 0. 첫번째 client(0) 의 서비스워커 설치 실패 => 서비스워커 재설치를 위한 안내 UI 표기

          // 0-1. 첫번째 client(0) 새로고침 없이, 새 client(1) 열기 => 소켓 비연결 상태의 client(1) 에 소켓 연결 시도
          // 0-1-1. 소켓 비연결 상태의 client(1) 에 소켓 연결 성공 => 서비스워커의 client 관리 업데이트. 그러나, client(0) 은 서비스워커의 제어 범위 밖이므로 업데이트 불가. client(1) 은 업데이트 가능.
          // 0-1-2. 소켓 비연결 상태의 client(1) 에 소켓 연결 실패 => 소켓 연결된 client 없음. 사용자를 위한 안내 및 소켓 재접속 UI 표기, 서비스워커의 client 관리 업데이트.
          // 0-1-3. 소켓 비연결 상태의 client(1) 에 소켓 연결 도중 client(1) 닫기 => 소켓 비연결 상태의 client(0) 이 존재하지만 서비스워커의 제어 범위 밖이므로, 대응 불가.
          // 0-1-4. 소켓 비연결 상태의 client(1) 에 소켓 연결 도중 client(1) 새로고침 => 소켓 비연결 상태의 client(0) 이 존재하지만 서비스워커의 제어 범위 밖이므로, 대응 불가. => 새로고침된 client(1) 에 소켓 연결 시도(0-1 플로우로 돌아감)

          // 0-2. 첫번째 client(0) 새로고침
          // 0-2-1. 소켓 비연결 상태의 client(0) 에 소켓 연결 성공 => 서비스워커의 client 관리 업데이트.
          // 0-2-2. 소켓 비연결 상태의 client(0) 에 소켓 연결 실패 => 소켓 연결된 client 없음. 사용자를 위한 안내 및 소켓 재접속 UI 표기, 서비스워커의 client 관리 업데이트.
          // 0-2-3. 소켓 비연결 상태의 client(0) 에 소켓 연결 도중 client(0) 닫기 => 앱 종료 및 모든 팝업의 종료
          // 0-2-4. 소켓 비연결 상태의 client(0) 에 소켓 연결 도중 client(0) 새로고침 => 새로고침된 client(0) 에 소켓 연결 시도(0-1-2 플로우로 돌아감)

          // + 멀티 clients 소켓 연결 관리를 위한 테스트 케이스
          // 첫번째 client(1) 열린 후 client(1) 에 소켓 연결된 이후

          // 1. 새 client(2) 열기
          // 1-1. 소켓 연결 상태의 client(1) 가 존재하므로, client(2) 에 소켓 연결이 되지 않음.
          // 1-2. 소켓 비연결 상태의 client(2) 닫기 => client(1) 의 소켓 연결 변화 없음. 서비스워커의 client 관리 업데이트.
          // 1-3. 소켓 비연결 상태의 client(2) 새로고침 => 새로고침한 client(2) id 의 변경 => client(1) 의 소켓 연결 변화 없음. 새로고침한 client(2) 에 소켓 연결이 되지 않음. 서비스워커의 client 관리 업데이트.

          // 2. 새 client(2) 열기
          // 2-1. 소켓 연결 상태의 client(1) 새로고침 => 소켓 비연결 상태의 client(2) 에 소켓 연결 시도 => client(1) 은 client id 변경되며 소켓 연결하지 않음. 서비스워커의 client 관리 업데이트.

          // 2-1-1. 소켓 비연결 상태의 client(2) 에 소켓 연결 성공 => 서비스워커의 client 관리 업데이트.
          // 2-1-2. 소켓 비연결 상태의 client(2) 에 소켓 연결 실패 => 소켓 연결된 client 없음. 사용자를 위한 안내 및 소켓 재접속 UI 표기, 서비스워커의 client 관리 업데이트
          // 2-1-3. 소켓 비연결 상태의 client(2) 에 소켓 연결 도중 client(2) 닫기 => 소켓 비연결 상태의 client(1) 이 존재하므로, client(1) 에 소켓 연결 시도 // TODO: 실테스트 환경 구성 후, 테스트 필요.
          // 2-1-4. 소켓 비연결 상태의 client(2) 에 소켓 연결 도중 client(2) 새로고침 => 새로고침한 client(2) 는 client id 변경. 소켓 비연결 상태의 client(1) 이 존재하므로, client(1) 에 소켓 연결 시도 // TODO: 실테스트 환경 구성 후, 테스트 필요.

          // 2-2. 소켓 연결 상태의 client(1) 닫기 => 소켓 비연결 상태의 client(2) 에 소켓 연결 시도
          // 2-2-1. 소켓 비연결 상태의 client(2) 에 소켓 연결 성공 => 서비스워커의 client 관리 업데이트.
          // 2-2-2. 소켓 비연결 상태의 client(2) 에 소켓 연결 실패 => 소켓 연결된 client 없음. 사용자를 위한 안내 및 소켓 재접속 UI 표기, 서비스워커의 client 관리 업데이트
          // 2-2-3. 소켓 비연결 상태의 client(2) 에 소켓 연결 도중 client(2) 닫기 => 앱 종료 및 모든 팝업의 종료
          // 2-2-4. 소켓 비연결 상태의 client(2) 에 소켓 연결 도중 client(2) 새로고침 => client(2) 는 client id 변경되며 소켓 연결 시도 // // TODO: 실테스트 환경 구성 후, 테스트 필요.

          // 3. 소켓 연결 상태의 client 가 존재하나, 소켓 서버 측 등의 이슈로 소켓 연결 해제
          // 3-1. 소켓 연결된 client 없음. 사용자를 위한 안내 및 소켓 재접속 UI 표기, 서비스워커의 client 관리 업데이트

          // + 팝업 client 테스트 케이스
          // 첫번째 client(1) 열린 후 client(1) 에 소켓 연결된 이후

          // 4. 새 팝업(9) 열기
          // 4-1. 팝업(9) 이므로 소켓 연결 비허가. 서비스워커의 client 관리 업데이트. 팝업(9) 측에서도 서비스워커 측으로 메세지 전달 가능.
          // 4-2. 소켓 연결 상태의 client(1) 닫기 => 앱 종료 및 모든 팝업의 종료
          // 4-3. 소켓 연결 상태의 client(1) 새로고침 => 앱 새로고침 및 모든 팝업의 종료
          // 4-4. 소켓 비연결 상태의 client(1) 닫기 => 앱 새로고침 및 모든 팝업의 종료
          // 4-5. 소켓 비연결 상태의 client(1) 새로고침 => 앱 새로고침 및 모든 팝업의 종료

          // 5. 새 멀티 팝업(9, 8) 열기
          // 5-1. 팝업(8, 9) 이므로 소켓 연결 비허가. 서비스워커의 client 관리 업데이트. 팝업(8, 9) 측에서도 서비스워커 측으로 메세지 전달 가능.
          // 5-2. 소켓 연결 상태의 client(1) 닫기 => 앱 종료 및 모든 팝업의 종료
          // 5-3. 소켓 연결 상태의 client(1) 새로고침 => 앱 새로고침 및 모든 팝업의 종료
          // 5-4. 소켓 비연결 상태의 client(1) 닫기 => 앱 새로고침 및 모든 팝업의 종료
          // 5-5. 소켓 비연결 상태의 client(1) 새로고침 => 앱 새로고침 및 모든 팝업의 종료

          // 6. 새 client(2) 열기 + 새 멀티 팝업 열기
          // 6-1. 1, 2 플로우와 동일

          // + 서비스워커 업데이트 테스트 케이스
          // 7. 서비스워커 js 파일만 업데이트 이후 waiting 서비스워커의 활성화 를 위한 안내 UI 표기
          // 7-1. UI 클릭 이벤트 등을 통해 서비스워커 활성화 (skipWaiting). 서비스워커의 client 관리 업데이트. // TODO: skipWaiting 을 통한 서비스워커 활성화 실패에 대한 레퍼런스는 찾아볼 수 없었다.
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
              console.log('[sw] 소켓 연결중 페이지 close 이후, 새로 소켓 연결할 client info :', clientInfo);

              self.clients
                .get(clientInfo.id)
                .then(client => {
                  clientInfo.isConnectingSocket = true;
                  clientInfo.isConnectedSocket = false;
                  console.log('[sw] resolved. clientInfos :', clientInfos);

                  getAllClients(_clients => {
                    syncClientInfos(getClientIds(_clients));
                    broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
                  });

                  postMessageToClient(client, 'SHOULD_CONNECT_SOCKET', { id: clientInfo.id, clientInfos });
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
                `[sw] 소켓 연결중 or 연결되어 있던 client close 후, 소켓 연결할 index page 의 client 가 존재하지 않음. index client 는 모두 닫히고 popup client 만 열려 있을 때도 발생할 수 있음.`
              );

              getAllClients(_clients => {
                syncClientInfos(getClientIds(_clients));
                broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });

                // 소켓 연결할 index 페이지의 client 가 존재하지 않음. 모든 popup 페이지의 client 를 닫는다.
                broadcastMessageToAllClients(_clients, 'SHOULD_CLOSE_ALL_POPUPS', { clientInfos });
              });
            }
          } else {
            // 소켓 연결중이 아닌 and 연결되어 있지 않았던 client 가 닫혔으므로, 닫힌 client 에 대한 정보 제거
            delete clientInfos[client.id];

            getAllClients(_clients => {
              syncClientInfos(getClientIds(_clients));
              broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });

              console.log('[sw] clientInfos :', clientInfos);

              // popup 페이지의 client 만 존재할 경우, 모든 popup 페이지의 client 를 닫는다.
              const clientInfoArr = Object.values(clientInfos),
                indexClients = clientInfoArr.filter(obj => obj.isIndexPage === true),
                popupClients = clientInfoArr.filter(obj => obj.isIndexPage === false),
                hasOnlyPopupClients = indexClients.length <= 0 && popupClients.length > 0;
              console.log('[sw] popup client 만 존재하므로, 모든 popup client 를 close 시킨다.');

              if (hasOnlyPopupClients)
                broadcastMessageToAllClients(_clients, 'SHOULD_CLOSE_ALL_POPUPS', { clientInfos });
            });
          }
        } else {
          console.log('[sw] popup closed');

          delete clientInfos[client.id];
          console.log('[sw] clientInfos :', clientInfos);

          getAllClients(_clients => {
            syncClientInfos(getClientIds(_clients));
            broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
          });
        }
      }
      break;

    case 'REQUIRE_SKIP_WAITING':
      console.group('+ [sw] ✉️ REQUIRE_SKIP_WAITING');
      console.log('REQUIRE_SKIP_WAITING - data.value :', data.value);

      self.skipWaiting().then(() => {
        console.log('[sw] resolve skipWaiting() promise');

        clientInfos = data.value.clientInfos;

        getAllClients(_clients => {
          syncClientInfos(getClientIds(_clients));

          broadcastMessageToAllClients(_clients, 'UPDATE_CLIENT_INFOS', { clientInfos });
          broadcastMessageToAllClients(_clients, 'COMPLETE_SKIP_WAITING_NEW_SERVICE_WORKER');
        });
      });
      console.groupEnd();
      break;

    // postMessage 테스트
    case 'TEST_PRINT_CLIENTS_NUM':
      console.group('+ [sw] ✉️ TEST_PRINT_CLIENTS_NUM');
      getAllClients(_clients => {
        console.log('[sw] clients :', _clients);
      });
      console.groupEnd();
      break;

    // 소켓 서버 연동 테스트
    case 'TEST_SEND_FROM_SOCKET_CLIENT_SERVER':
      console.log('+ [sw] ✉️ TEST_SEND_FROM_SOCKET_CLIENT_SERVER');

      getAllClients(_clients => {
        broadcastMessageToAllClients(_clients, 'TEST_SEND_FROM_SW_CLIENT_SERVER', {
          value: data.value,
        });
      });
      break;
  }
});
