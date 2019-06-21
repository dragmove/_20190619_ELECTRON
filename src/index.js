const isSupportServiceWorker = 'serviceWorker' in navigator,
  isSupportMessageChannel = 'MessageChannel' in window;

let postMessageBtn, openWindowBtn, skipWaitingBtn, refreshBtn;

// install service worker
if (isSupportServiceWorker) {
  navigator.serviceWorker
    .register('serviceworker.js')
    .then(registration => {
      console.log('[app] service worker registered. registration :', registration);

      const { active, installing, waiting } = registration;
      console.log('[app] register.then. active service worker :', active);
      console.log('[app] register.then. installing service worker :', installing); // state value is 'installing'
      console.log('[app] register.then. waiting service worker :', waiting);
      console.log('[app] register.then. current activated service worker :', navigator.serviceWorker.controller);

      // can detect changing state of installing service worker
      // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration
      /*
      registration.addEventListener('updatefound', () => {
        console.log('[app] registration.onupdatefound');

        // If updatefound is fired, it means that there is a new service worker being installed.
        // You can listen for changes to the installing service worker's state via installingWorker.onstatechange
        const installingServiceWorker = registration.installing;
        console.log('[app] A new service worker is being installed:', installingServiceWorker);
        installingServiceWorker.onstatechange = evt => {
          console.log('[app] installingServiceWorker.onstatechange :', evt.target.state); // 'installed' => 'activating' => 'activated'
        };
      });
      */

      if (!navigator.serviceWorker.controller) {
        console.log(
          `[app] The window client isn't currently controlled by serview worker. so, it's a new service worker that will activate immediately`
        );

        registration.addEventListener('updatefound', () => {
          console.log('[app] registration.onupdatefound event. 1st service worker is updating.');

          // TODO: you can set loading bar to inform installing service worker

          const installingServiceWorker = registration.installing;
          installingServiceWorker.onstatechange = evt => {
            console.log('[app] installingServiceWorker.onstatechange. state of 1st service worker :', evt.target.state); // 'installed' => 'activating' => 'activated'

            if (evt.target.state === 'activated') {
              console.log(
                '[app] 1st service worker is installed and activated. but you should refresh page to use your 1st service worker.'
              );
              console.log('[app] 1st navigator.serviceWorker.controller :', navigator.serviceWorker.controller);

              showElement(document.querySelector('#guide-refresh'));
            }
          };
        });

        return;
      }

      showElement(openWindowBtn);

      onNewServiceWorker(registration, () => {
        setSkipWaitingBtn(registration);
      });
    })
    .catch(function(err) {
      console.log('[app] service worker registration failed :', err);
    });

  navigator.serviceWorker.addEventListener('controllerchange', evt => {
    console.log('[app] navigator.serviceWorker controllerchange. evt :', evt);
  });

  navigator.serviceWorker.addEventListener('message', evt => {
    const data = evt.data;

    console.log('[app] evt.data from service worker. evt.data :', data);

    // all browser/tab/app can get message from service worker at the same time.
    if (!data) return;

    switch (data.action) {
      case 'skipWaitingComplete':
        console.log('[app] receive skipWaitingComplete action from service worker :', data);

        hideElement(skipWaitingBtn);
        break;
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

function init() {
  console.log('[app] DOMContentLoaded');

  postMessageBtn = document.querySelector('#btn-send');
  postMessageBtn.onclick = evt => {
    evt.preventDefault();

    if (!isSupportServiceWorker) throw new Error('[app] This browser does not support ServiceWorker.');

    // send message to service worker
    // navigator.serviceWorker.controller.postMessage({ msg: 'this is message from page' });

    // use message channel
    if (!isSupportMessageChannel) throw new Error('[app] This browser does not support MessageChannel.');

    if (!navigator.serviceWorker.controller) {
      console.log('[app] navigator.serviceWorker :', navigator.serviceWorker);
      throw new Error('[app] navigator.serviceWorker.controller is not defined.');
    }

    const msgChannel = new MessageChannel();
    msgChannel.port1.onmessage = function(evt) {
      const data = evt.data;
      console.log('[app] data received by port1 of message channel :', data);

      if (!data) return;

      switch (data.action) {
        case 'getClientNum':
          console.log('[app] result of "getClientsNum" action :', data.value);
          break;
      }
    };

    // send message with action, a port of message channel
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
    console.log('[app] new window or Electron browserWindowProxy instance :', newWindow);
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
      '[app] new service worker is waiting to activate. Can occur if multiple clients open and one of the clients is refreshed.'
    );

    return callback.call(null);
  }

  if (installing) {
    console.log('[app] new service worker is installing');
    return listenInstalledStateChange();
  }

  console.log(
    '[app] currently controlled by service worker. a new service worker may be found. Add a listener in case a new service worker is found.'
  );
  // can detect changing state of installing service worker
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration
  registration.addEventListener('updatefound', listenInstalledStateChange);

  function listenInstalledStateChange() {
    registration.installing.onstatechange = function(evt) {
      if (evt.target.state === 'installed') {
        console.log('[app] new service worker is installed and available but its state is waiting. inform the user');
        callback.call(null);
      }
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
      console.log('[app] ensure registration.waiting is available before calling postMessage()');
      return;
    }

    waitingServiceWorker.postMessage({
      action: 'skipWaiting',
    });
    // => receive 'skipWaitingComplete' action from service worker after call .skipWaiting() in service worker
  };
}

function showElement(ele) {
  if (ele) ele.classList.add('visible');
}

function hideElement(ele) {
  if (ele) ele.classList.remove('visible');
}
