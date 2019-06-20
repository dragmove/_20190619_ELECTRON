const isSupportServiceWorker = 'serviceWorker' in navigator,
  isSupportMessageChannel = 'MessageChannel' in window;

function showRefreshUI(registration) {
  // TODO: Display a toast or refresh UI.
  // This demo creates and injects a button.

  const skipWaitingBtn = document.querySelector('#btn-skip-waiting');
  skipWaitingBtn.onclick = evt => {
    if (!registration.waiting) {
      console.log('Just to ensure registration.waiting is available before calling postMessage()');
      return;
    }

    registration.waiting.postMessage('skipWaiting');

    skipWaitingBtn.disabled = true;
  };
}

function onNewServiceWorker(registration, callback) {
  function listenInstalledStateChange() {
    registration.installing.addEventListener('statechange', function(evt) {
      if (evt.target.state === 'installed') {
        // A new service worker is available, inform the user
        callback();
      }
    });
  }

  if (registration.waiting) {
    console.log('.waiting');
    console.log('SW is waiting to activate. Can occur if multiple clients open and one of the clients is refreshed.');
    return callback();
  }

  if (registration.installing) {
    console.log('.installing');
    listenInstalledStateChange();
    return;
  }

  console.log('We are currently controlled so a new SW may be found... Add a listener in case a new SW is found,');
  registration.addEventListener('updatefound', listenInstalledStateChange);
}

// add service worker
if (isSupportServiceWorker) {
  // install service worker
  navigator.serviceWorker
    .register('serviceworker.js')
    .then(function(registration) {
      console.log('[app] service worker registered :', registration);

      const { active, installing, waiting } = registration;
      console.log('active :', active);
      console.log('installing :', installing);
      console.log('waiting :', waiting);
      console.log('navigator.serviceWorker.controller :', navigator.serviceWorker.controller);

      // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration
      /*
      registration.addEventListener('updatefound', function() {
        // If updatefound is fired, it means that there's
        // a new service worker being installed.
        const installingServiceWorker = registration.installing;
        console.log('A new service worker is being installed:', installingServiceWorker);

        // You can listen for changes to the installing service worker's
        // state via installingWorker.onstatechange
        installingServiceWorker.onstatechange = evt => {
          console.log('installingServiceWorker.onstatechange :', evt);
        };
      });
      */

      if (!navigator.serviceWorker.controller) {
        console.log(
          `The window client isn't currently controlled by serview worker. so, it's a new service worker that will activate immediately`
        );
        return;
      }

      registration.update();

      onNewServiceWorker(registration, function() {
        showRefreshUI(registration);
      });
    })
    .catch(function(err) {
      console.log('[app] service worker registration failed :', err);
    });

  navigator.serviceWorker.addEventListener('controllerchange', function(evt) {
    console.log('[app] navigator.serviceWorker controllerchange :', evt);
  });

  navigator.serviceWorker.addEventListener('message', function(event) {
    console.log('[app] event.data from service worker :', event.data);
  });
}

document.addEventListener('DOMContentLoaded', function(evt) {
  console.log('[app] DOMContentLoaded');

  const openWindowBtn = document.querySelector('#btn-open');
  openWindowBtn.onclick = evt => {
    evt.preventDefault();

    const tmpWindowId = Math.floor(Math.random() * 10000000);
    const browserWindowProxy = window.open('./index.html', tmpWindowId, 'width=800,height=600;');
    console.log('browserWindowProxy instance :', browserWindowProxy);
  };

  const postMessageBtn = document.querySelector('#btn-send');
  postMessageBtn.onclick = evt => {
    evt.preventDefault();

    if (!isSupportServiceWorker) {
      throw new Error('[app] This browser does not support ServiceWorker.');
    }

    /*
    // send message to service worker
    navigator.serviceWorker.controller.postMessage({
      msg: 'this is message from page'
    });
    */

    // use message channel
    if (!isSupportMessageChannel) {
      throw new Error('[app] This browser does not support MessageChannel.');
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
});

/*
window.addEventListener('beforeunload', function(evt) {
  evt.preventDefault();
  evt.returnValue = 'message';
});
*/
