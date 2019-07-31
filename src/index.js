import { isSupportServiceWorker, isSupportWebSocket } from './utils';

// + Reference
// https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle#%EC%88%98%EB%8F%99_%EC%97%85%EB%8D%B0%EC%9D%B4%ED%8A%B8

const CLIENT_IDENTIFIER = 'serviceworker';
const INTERVAL_CHECK_UPDATE_SERVICEWORKER = 15000;
const isIndexPage = window.isIndex; // window.isIndex 라면 index.html 페이지

let clientId = null;
let clientInfos = null;

let ws;
let postMessageBtn, openWindowBtn, skipWaitingBtn, refreshBtn, requestSocketMessageBtn;

// 서비스워커를 설치한다.
if (isSupportServiceWorker) {
  navigator.serviceWorker
    // 새로운 버전의 서비스워커를 배포할 때, serviceworker.js 파일의 URL을 변경하지 말라.
    .register('serviceworker.js')
    .then(registration => {
      console.log('[app] service worker registered. registration :', registration);

      const { active: activeWorker, installing: installingWorker, waiting: waitingWorker } = registration;
      console.log('[app] register.then. active service worker :', activeWorker);
      console.log('[app] register.then. installing service worker :', installingWorker);
      console.log('[app] register.then. waiting service worker :', waitingWorker);
      console.log('[app] register.then. current activated service worker :', navigator.serviceWorker.controller);

      // installing 서비스워커의 상태 변화를 감지할 수 있다.
      // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

      if (!navigator.serviceWorker.controller) {
        // 기존에 설치되어 있는 서비스워커가 존재하지 않을 경우에만 발생
        console.log(
          `[app] window client는 현재 서비스워커에 의해 제어되고 있지 않다. 첫번째 서비스워커가 즉각 activate 될 것이다.`
        );

        // https://developer.mozilla.org/ko/docs/Web/API/ServiceWorkerRegistration#Examples
        registration.addEventListener('updatefound', () => {
          console.log('[app] registration.onupdatefound event. 첫번째 서비스워커가 updating 중이다.');

          registration.installing.onstatechange = evt => {
            console.log('[app] installingServiceWorker.onstatechange. 첫번째 서비스워커의 상태 :', evt.target.state); // 'installed' => 'activating' => 'activated'

            if (evt.target.state === 'activated') {
              console.log(
                '[app] 첫번째 서비스워커가 installed 후 activated 되었다. 첫번째 서비스워커를 사용하기 위해, 사용자는 현재 app 을 새로고침 해야 한다.'
              );
              console.log('[app] 첫번째 navigator.serviceWorker.controller :', navigator.serviceWorker.controller);

              showElement(document.querySelector('#guide-refresh'));
            }
          };
        });

        if (activeWorker && !installingWorker && !waitingWorker) {
          console.log('TODO: Check this case');
        }

        if (activeWorker && waitingWorker) {
          console.log(
            '[app] active, waiting 상태의 서비스워커가 존재하는 것이 확인될 경우, waiting 상태의 서비스워커로 업데이트'
          );
          if (activeWorker.state === 'activated' && waitingWorker.state === 'installed')
            waitingWorker.postMessage({
              action: 'REQUIRE_SKIP_WAITING',
              value: { clientInfos },
              from: CLIENT_IDENTIFIER,
            });
        }

        return;
      } else {
        console.log('[app] navigator.serviceWorker.controller가 존재한다.');

        // TODO: Check
        // if (activeWorker && waitingWorker) {
        //   console.log('[app] active, waiting 상태의 서비스워커가 존재하는 것이 확인될 경우, waiting 상태의 서비스워커로 업데이트');
        //   if (activeWorker.state === 'activated' && waitingWorker.state === 'installed') waitingWorker.postMessage({ action: 'REQUIRE_SKIP_WAITING', value: { clientInfos }, from: CLIENT_IDENTIFIER });
        // }

        // message를 action data와 함께 MessageChannel의 port로 전달한다.
        if (isSupportWebSocket) {
          navigator.serviceWorker.controller.postMessage({
            action: 'REQUIRE_CONNECT_SOCKET',
            value: { isIndexPage },
            from: CLIENT_IDENTIFIER,
          });
        } else {
          window.alert('[app] 이 브라우저는 웹 소켓을 지원하지 않는다.');
        }

        // 새로운 서비스워커가 업데이트되었는지 주기적으로 확인한다.
        // https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle#%EC%88%98%EB%8F%99_%EC%97%85%EB%8D%B0%EC%9D%B4%ED%8A%B8
        setIntervalToDetectNewServiceWorker();
      }

      showElement(openWindowBtn);

      onNewServiceWorker(registration, () => setSkipWaitingBtn(registration));
    })
    .catch(function(err) {
      console.log('[app] service worker registration 실패. error :', err);
      window.alert('[app] service worker registration 실패. 서비스워커 재설치를 위한 안내 UI 표기 필요.');
    });

  navigator.serviceWorker.addEventListener('controllerchange', evt => {
    console.log('[app] navigator.serviceWorker controllerchange event. evt :', evt);
  });

  navigator.serviceWorker.addEventListener('message', evt => {
    const data = evt.data;
    console.log('[app] 서비스워커 측으로부터 전달되는 evt.data :', data);

    // 모든 client 들은 동시에 서비스워커로부터 message 를 받을 수 있다.
    if (!data) return;

    switch (data.action) {
      case 'CONFIRM_BAN_CONNECT_SOCKET':
        console.log('[app] "CONFIRM_BAN_CONNECT_SOCKET" : 소켓 연결 비허용');
        clientId = data.value.id;

        console.log('[app] clientId :', clientId);
        break;

      case 'CONFIRM_CAN_CONNECT_SOCKET':
        console.log('[app] "CONFIRM_CAN_CONNECT_SOCKET" : 소켓 연결 허용');
        clientId = data.value.id;
        console.log('[app] clientId :', clientId);

        if (isIndexPage) connectWebSocket();
        break;

      case 'SHOULD_CONNECT_SOCKET':
        console.log('[app] 서비스워커로부터 SHOULD_CONNECT_SOCKET action을 받았다');
        clientId = data.value.id;
        console.log('[app] clientId :', clientId);

        if (isIndexPage) connectWebSocket();
        break;

      case 'UPDATE_CLIENT_INFOS': // received by all clients
        console.log('[app] "UPDATE_CLIENT_INFOS" : 모든 client 에게 전달');
        clientInfos = data.value.clientInfos;
        console.log('[app] UPDATE_CLIENT_INFOS - clientInfos :', clientInfos);
        break;

      case 'COMPLETE_SKIP_WAITING_NEW_SERVICE_WORKER': // received by all clients
        console.log('[app] 서비스워커로부터 COMPLETE_SKIP_WAITING_NEW_SERVICE_WORKER action을 받았다');
        console.log('[app] 새로운 서비스워커를 사용할 수 있게 되었다.');

        hideElement(skipWaitingBtn);
        break;

      case 'TEST_SEND_FROM_SW_CLIENT_SERVER':
        console.log(
          '[app] 소켓 서버 => 소켓 연결된 클라이언트 => 서비스워커 => 모든 클라이언트로 전달된 TEST_SEND_FROM_SW_CLIENT_SERVER action을 받았다. :',
          data.value
        );
        break;

      case 'SHOULD_CLOSE_ALL_POPUPS':
        clientInfos = data.value.clientInfos;

        // close only popup clients
        if (!isIndexPage) {
          if (clientId in clientInfos) {
            window.alert('[app] index client 가 모두 close 되었으므로, popup 페이지의 client 를 닫는다.');
            window.close();
          }
        }
        break;
    }
  });
} else {
  window.alert('[app] 이 브라우저는 서비스워커를 지원하지 않는다.');
}

document.addEventListener('DOMContentLoaded', init);

function init() {
  console.log('[app] DOMContentLoaded');

  postMessageBtn = document.querySelector('#btn-send');
  if (postMessageBtn) {
    postMessageBtn.onclick = evt => {
      evt.preventDefault();

      if (!isSupportServiceWorker) {
        window.alert('[app] 이 브라우저는 서비스워커를 지원하지 않는다.');
        throw new Error('[app] 이 브라우저는 서비스워커를 지원하지 않는다.');
      }
      if (!navigator.serviceWorker.controller) {
        window.alert('[app] navigator.serviceWorker.controller 미존재. postMessage 사용 불가.');
        throw new Error('[app] navigator.serviceWorker.controller 미존재. postMessage 사용 불가');
      }

      navigator.serviceWorker.controller.postMessage({
        action: 'TEST_PRINT_CLIENTS_NUM',
        value: { isIndexPage },
        from: CLIENT_IDENTIFIER,
      });
    };
  }

  openWindowBtn = document.querySelector('#btn-open');
  if (openWindowBtn) {
    openWindowBtn.onclick = evt => {
      evt.preventDefault();
      const tmpWindowId = Math.floor(Math.random() * 10000000);
      const newWindow = window.open('./popup.html', tmpWindowId, 'width=640,height=240;');
      console.log('[app] new window 또는 Electron browserWindowProxy 객체 :', newWindow);
    };
  }

  skipWaitingBtn = document.querySelector('#btn-skip-waiting');

  refreshBtn = document.querySelector('#btn-refresh');
  if (refreshBtn) {
    refreshBtn.onclick = evt => {
      evt.preventDefault();
      window.location.reload(false);
    };
  }

  requestSocketMessageBtn = document.querySelector('#btn-request-socket-message');
  if (requestSocketMessageBtn) {
    requestSocketMessageBtn.onclick = evt => {
      evt.preventDefault();

      if (!ws) {
        window.alert('[app] no web socket connection');
        return;
      }

      ws.send(
        JSON.stringify({
          action: 'TEST_REQUEST_SEND_SOCKET_MESSAGE',
          from: CLIENT_IDENTIFIER,
          createdAt: new Date().getTime(),
        })
      );
    };
  }

  window.onbeforeunload = function(evt) {
    if (!navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({
      action: 'CLOSED_CLIENT',
      value: { isIndexPage },
      from: CLIENT_IDENTIFIER,
    });
  };
}

function setIntervalToDetectNewServiceWorker() {
  window.setInterval(() => {
    navigator.serviceWorker.register('serviceworker.js').then(registration => {
      onNewServiceWorker(registration, () => setSkipWaitingBtn(registration));

      registration.update();
      console.log('[app] 서비스워커의 수동 업데이트 시도');
    });
  }, INTERVAL_CHECK_UPDATE_SERVICEWORKER);
}

function onNewServiceWorker(registration, callback) {
  const { active, installing, waiting } = registration;

  console.log('[app] active service worker :', active); // current service worker
  console.log('[app] installing service worker :', installing);
  console.log('[app] waiting service worker :', waiting);

  if (waiting) {
    console.log(
      '[app] 새 서비스워커가 activate 되기를 기다리고 있다. 여러 개의 client 중 하나가 새로고침되거나 새로운 client 가 열리면 발생할 수 있다.'
    );

    return callback.call(null);
  }

  if (installing) {
    console.log('[app] 새 서비스워커가 installing 상태이다.');
    return listenInstalledStateChange();
  }

  console.log(
    '[app] 현재 기존 서비스워커에 의해 제어되고 있다. 새로운 서비스워커가 발견될 수 있다. 서비스워커가 발견되는 경우에 대해 listener 를 등록한다.'
  );

  // installing 서비스워커의 상태 변화를 감지할 수 있다.
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration
  registration.addEventListener('updatefound', listenInstalledStateChange);

  function listenInstalledStateChange() {
    registration.installing.onstatechange = function(evt) {
      if (evt.target.state === 'installed') {
        console.log(
          '[app] 새로운 서비스워커가 installed 되었고, 사용 가능하지만 아직 waiting 상태이다. 사용자에게 이 상태를 알리도록 한다.'
        );
        callback.call(null);
      }

      if (evt.target.state === 'activated') {
        console.log('[app] 새로운 서비스워커가 activated 되었다. serviceworker.controller가 변경되었다.');
      }
    };
  }
}

function setSkipWaitingBtn(registration) {
  console.log('[app] setSkipWaitingBtn() called');
  if (!skipWaitingBtn) return;

  showElement(skipWaitingBtn);

  skipWaitingBtn.onclick = evt => {
    evt.preventDefault();

    const waitingServiceWorker = registration.waiting,
      activeServiceWorker = registration.active;
    if (!waitingServiceWorker || !activeServiceWorker) {
      window.alert('[app] 서비스워커의 skipWaiting 실행을 위한 active or waiting 서비스워커가 존재하지 않는다.');
      return;
    }

    waitingServiceWorker.postMessage({
      action: 'REQUIRE_SKIP_WAITING',
      value: { clientInfos },
      from: CLIENT_IDENTIFIER,
    });
  };
}

function showElement(ele) {
  if (ele) ele.classList.add('visible');
}

function hideElement(ele) {
  if (ele) ele.classList.remove('visible');
}

function connectWebSocket() {
  console.log('[app] web socket 접속 시도');

  if (ws) {
    ws.close();

    ws.onopen = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws = null;
  }

  ws = new WebSocket('ws://localhost:9002'); // 'ws://echo.websocket.org/'

  ws.onopen = evt => {
    console.log('[client-socket] open a socket connection :', evt);

    navigator.serviceWorker.controller.postMessage({
      action: 'OPENED_SOCKET',
      from: CLIENT_IDENTIFIER,
    });
  };

  ws.onerror = error => {
    console.log('[client-socket] error :', error);
    window.alert('[client-socket] socket 연결을 할 수 없습니다.');

    // socket 연결 시도 도중, 에러가 발생하는 경우
    navigator.serviceWorker.controller.postMessage({
      action: 'ERROR_SOCKET',
      from: CLIENT_IDENTIFIER,
    });
  };

  ws.onclose = evt => {
    console.log('[client-socket] close');

    // socket 연결 이후 정상 작동 중, socket 측 이상으로 connection close
    navigator.serviceWorker.controller.postMessage({
      action: 'CLOSED_SOCKET',
      from: CLIENT_IDENTIFIER,
    });

    // destroyBufferInterval();
  };

  ws.onmessage = evt => {
    console.log('[client-socket] onmessage');

    const data = evt && evt.data ? JSON.parse(evt.data) : null;
    console.log('[client-socket] dummy message from socket server :', data);

    switch (data.action) {
      case 'TEST_SEND_FROM_SOCKET_SERVER':
        navigator.serviceWorker.controller.postMessage({
          action: 'TEST_SEND_FROM_SOCKET_CLIENT_SERVER',
          value: data.value,
          from: CLIENT_IDENTIFIER,
        });
        break;
    }
  };

  /*
  // 1초 내에 10개 이상 들어오면, 메세지를 쌓는다. 남아 있는 메세지가 없을 때까지 10개씩 묶어서 1초마다 방출한다.
  // 1초 내에 10개 미만이면, 모두 방출한다.
  const INTERVAL_FLUSH_MESSAGES = 1000;
  const NUM_MESSAGES_PER_FLUSH = 10;

  let isBuffering = false,
    messagesBuffer = [],
    bufferInterval = null;

  function flushMessages() {
    const messeagesToFlush = messagesBuffer.splice(0, NUM_MESSAGES_PER_FLUSH);

    navigator.serviceWorker.controller.postMessage({
      action: 'FLUSH_MESSAGES',
      value: messeagesToFlush,
      from: CLIENT_IDENTIFIER,
    });

    if (messagesBuffer.length > 0) {
      // has messages to flush
    } else {
      // all messages are flushed
      isBuffering = false;

      destroyBufferInterval();
    }
  }

  function destroyBufferInterval() {
    window.clearInterval(bufferInterval);
    bufferInterval = null;
  }

  ws.onmessage = evt => {
    const data = evt && evt.data ? JSON.parse(evt.data) : null;
    if (data) messagesBuffer.push(data);

    if (!isBuffering) {
      isBuffering = true;

      destroyBufferInterval();
      bufferInterval = window.setInterval(flushMessages, INTERVAL_FLUSH_MESSAGES);
    }
  };
  */
}
