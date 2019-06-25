// TODO: confirm registration.update();
// https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle#%EC%88%98%EB%8F%99_%EC%97%85%EB%8D%B0%EC%9D%B4%ED%8A%B8

const isSupportServiceWorker = 'serviceWorker' in navigator,
  isSupportMessageChannel = 'MessageChannel' in window,
  isSupportWebSocket = 'WebSocket' in window;

let postMessageBtn, openWindowBtn, skipWaitingBtn, refreshBtn;

// 서비스워커를 설치한다.
if (isSupportServiceWorker) {
  navigator.serviceWorker
    // 새로운 버전의 서비스워커를 배포할 때, serviceworker.js 파일의 URL을 변경하지 말라.
    .register('serviceworker.js')
    .then(registration => {
      console.log('[app] service worker registered. registration :', registration);

      const { active, installing, waiting } = registration;
      console.log('[app] register.then. active service worker :', active);
      console.log('[app] register.then. installing service worker :', installing);
      console.log('[app] register.then. waiting service worker :', waiting);
      console.log('[app] register.then. current activated service worker :', navigator.serviceWorker.controller);

      // installing 서비스워커의 상태 변화를 감지할 수 있다.
      // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

      if (!navigator.serviceWorker.controller) {
        // 기존에 설치되어 있는 서비스워커가 존재하지 않을 경우에만 발생
        console.log(
          `[app] window client는 현재 서비스워커에 의해 제어되고 있지 않다. 첫번째 서비스워커가 즉각 activate 될 것이다.`
        );

        // TODO: ISSUE: updatefound event cannot reliable ?
        // https://developer.mozilla.org/ko/docs/Web/API/ServiceWorkerRegistration#Examples
        registration.addEventListener('updatefound', () => {
          console.log('[app] registration.onupdatefound event. 첫번째 서비스워커가 updating 중이다.');

          // 서비스워커가 installing 되고 있음을 알리기 위해, loading bar 등을 세팅할 수 있다.

          const installingServiceWorker = registration.installing;
          installingServiceWorker.onstatechange = evt => {
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

        /*
        // TODO: Check
        if (active && waiting) {
          console.log('[app] active, waiting 상태의 서비스워커가 존재하는 것이 확인될 경우, waiting 상태의 서비스워커로 업데이트');
          if (active.state === 'activated' && waiting.state === 'installed') waiting.postMessage({ action: 'skipWaiting' });
        }
        */

        return;
      } else {
        console.log('navigator.serviceWorker.controller is exist');

        /*
        // TODO: Check
        if (active && waiting) {
          console.log('[app] active, waiting 상태의 서비스워커가 존재하는 것이 확인될 경우, waiting 상태의 서비스워커로 업데이트');
          if (active.state === 'activated' && waiting.state === 'installed') waiting.postMessage({ action: 'skipWaiting' });
        }
        */

        // socket setting
        if (isSupportWebSocket) {
          const ws = new WebSocket('ws://localhost:9002'); // 'ws://echo.websocket.org/'

          ws.onopen = evt => {
            console.log('[client socket] open');
            ws.send('ping');
          };

          ws.onerror = evt => {
            console.log('[client socket] error');
          };

          ws.onmessage = evt => {
            console.log('[client socket] message. evt.data :', evt.data);
          };

          ws.onclose = evt => {
            console.log('[client socket] close');
          };
        }
      }

      showElement(openWindowBtn);

      onNewServiceWorker(registration, () => {
        setSkipWaitingBtn(registration);
      });
    })
    .catch(function(err) {
      console.log('[app] service worker registration 실패. error :', err);
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
      case 'skipWaitingComplete':
        console.log('[app] 서비스워커로부터 skipWaitingComplete action을 받았다. data :', data);

        hideElement(skipWaitingBtn);
        break;
    }
  });
} else {
  console.log('[app] 이 브라우저는 서비스워커를 지원하지 않는다.');
}

document.addEventListener('DOMContentLoaded', init);

function init() {
  console.log('[app] DOMContentLoaded');

  postMessageBtn = document.querySelector('#btn-send');
  postMessageBtn.onclick = evt => {
    evt.preventDefault();

    if (!isSupportServiceWorker) throw new Error('[app] 이 브라우저는 서비스워커를 지원하지 않는다.');

    // message를 서비스워커로 전달한다.
    // navigator.serviceWorker.controller.postMessage({ msg: 'this is message from page' });

    // message를 MessageChannel 을 사용하여, 서비스워커로 전달한다.
    if (!isSupportMessageChannel) throw new Error('[app] 이 브라우저는 MessageChannel을 지원하지 않는다.');

    if (!navigator.serviceWorker.controller) {
      console.log('[app] navigator.serviceWorker :', navigator.serviceWorker);
      throw new Error('[app] navigator.serviceWorker.controller가 정의되어 있지 않다.');
    }

    const msgChannel = new MessageChannel();
    msgChannel.port1.onmessage = function(evt) {
      const data = evt.data;
      console.log('[app] MessageChannel의 port1을 통해 전달 받은 data :', data);

      if (!data) return;

      switch (data.action) {
        case 'getClientNum':
          console.log('[app] "getClientsNum" action 호출 후, 서비스워커로부터 전달받은 결과. data.value :', data.value);
          break;
      }
    };

    // message를 action data와 함께 MessageChannel의 port로 전달한다.
    navigator.serviceWorker.controller.postMessage(
      {
        action: 'getClientsNum',
      },
      [msgChannel.port2]
    );
  };

  openWindowBtn = document.querySelector('#btn-open');
  openWindowBtn.onclick = evt => {
    evt.preventDefault();
    const tmpWindowId = Math.floor(Math.random() * 10000000);
    const newWindow = window.open('./index.html', tmpWindowId, 'width=800,height=600;');
    console.log('[app] new window 또는 Electron browserWindowProxy 객체 :', newWindow);
  };

  skipWaitingBtn = document.querySelector('#btn-skip-waiting');

  refreshBtn = document.querySelector('#btn-refresh');
  refreshBtn.onclick = evt => {
    evt.preventDefault();
    window.location.reload(false);
  };
}

function onNewServiceWorker(registration, callback) {
  const { active, installing, waiting } = registration;

  console.log('[app] active service worker :', active); // current service worker
  console.log('[app] installing service worker :', installing);
  console.log('[app] waiting service worker :', waiting);

  if (waiting) {
    console.log(
      '[app] 새 서비스워커가 activate 되기를 기다리고 있다. 여러 개의 client 들이 열려 있고, client 들 중 하나가 새로고침된다면 발생할 수 있다.'
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

      // if (evt.target.state === 'activated') { console.log('[app] 새로운 서비스워커가 activated 되었다. serviceworker.controller가 변경되었다.'); }
    };
  }
}

function setSkipWaitingBtn(registration) {
  console.log('setSkipWaitingBtn');
  showElement(skipWaitingBtn);

  skipWaitingBtn.onclick = evt => {
    evt.preventDefault();

    const waitingServiceWorker = registration.waiting;
    if (!waitingServiceWorker) {
      console.log('[app] postMessage() 실행 전에 registration.waiting 서비스워커가 사용가능한 상태인지 확인하라.');
      return;
    }

    waitingServiceWorker.postMessage({
      action: 'skipWaiting',
    });
    // => 서비스워커의 self.skipWaiting() 실행 완료 후, 서비스워커 측에서 'skipWaitingComplete' action 을 postMessage 로 전달할 것이다.
  };
}

function showElement(ele) {
  if (ele) ele.classList.add('visible');
}

function hideElement(ele) {
  if (ele) ele.classList.remove('visible');
}
