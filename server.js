console.log('[server] start server.js');

// https://www.npmjs.com/package/ws
var WebSocket = require('ws');

var wss = new WebSocket.Server({ port: 9002 });

wss.on('connection', ws => {
  // client 와의 connection 완료시, client 측으로 메세지 전송
  console.log('[socket server] success connection');

  ws.on('message', message => {
    console.log('[socket server] message :', message);

    switch (message.action) {
      case 'REQUEST_SOCKET_MESSAGE':
        // TODO: socket 서버 측으로부터 index.js 측으로 메세지가 전달되는 동작이 되어야 하는데? 'ㅅ')?
        /*
        ws.send(
          JSON.stringify({
            value: `This is dummy message from socket server`,
            from: 'server',
            createdAt: new Date().getTime(),
          })
        );
        */
        break;
    }
  });

  /*
  setTimeout(() => {
    ws.send(
      JSON.stringify({
        value: `hello! I'm socket server. 1st message`,
        from: 'server',
        createdAt: new Date().getTime(),
      })
    );
  }, 5000);

  setTimeout(() => {
    ws.send(
      JSON.stringify({
        value: `hello! I'm socket server. 2nd message`,
        from: 'server',
        createdAt: new Date().getTime(),
      })
    );
  }, 10000);
  */

  /*
  // send message to client
  var messageIndex = 0;

  setTimeout(() => {
    for (var i = 0; i < 10; i++) {
      ws.send(JSON.stringify({ value: `hello! ${messageIndex}`, from: 'server', createdAt: new Date().getTime() }));
      messageIndex++;
    }
  }, 3000);

  setTimeout(() => {
    for (var i = 0; i < 10; i++) {
      ws.send(JSON.stringify({ value: `hello! ${messageIndex}`, from: 'server', createdAt: new Date().getTime() }));
      messageIndex++;
    }
  }, 3250);

  setTimeout(() => {
    for (var i = 0; i < 10; i++) {
      ws.send(JSON.stringify({ value: `hello! ${messageIndex}`, from: 'server', createdAt: new Date().getTime() }));
      messageIndex++;
    }
  }, 3500);

  setTimeout(() => {
    for (var i = 0; i < 10; i++) {
      ws.send(JSON.stringify({ value: `hello! ${messageIndex}`, from: 'server', createdAt: new Date().getTime() }));
      messageIndex++;
    }
  }, 3900);

  setTimeout(() => {
    for (var i = 0; i < 10; i++) {
      ws.send(JSON.stringify({ value: `hello! ${messageIndex}`, from: 'server', createdAt: new Date().getTime() }));
      messageIndex++;
    }
  }, 4500);

  setTimeout(() => {
    for (var i = 0; i < 50; i++) {
      ws.send(JSON.stringify({ value: `hello! ${messageIndex}`, from: 'server', createdAt: new Date().getTime() }));
      messageIndex++;
    }
  }, 7000);
  */
});
