const isSupportServiceWorker = 'serviceWorker' in navigator,
  isSupportMessageChannel = 'MessageChannel' in window;

// add service worker
if (isSupportServiceWorker) {
  // install service worker
  navigator.serviceWorker
    .register('serviceworker.js')
    .then(function(registration) {
      console.log('[app] service worker registered with scope :', registration.scope);
    })
    .catch(function(err) {
      console.log('[app] service worker registration failed :', err);
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
