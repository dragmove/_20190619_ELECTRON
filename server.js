console.log('[server] start server.js');

// https://www.npmjs.com/package/ws
var WebSocket = require('ws');

var wss = new WebSocket.Server({ port: 9002 });

wss.on('connection', ws => {
  // client 와의 connection 완료시, client 측으로 메세지 전송
  console.log('[socket server] success connection');

  ws.on('message', message => {
    console.log(`[socket server] from client : ${message}`);
  });

  // send message to client
  var messageIndex = 0;

  setTimeout(() => {
    for (var i = 0; i < 10; i++) {
      ws.send(JSON.stringify({ value: `hello! ${messageIndex}`, from: 'server' }));
      messageIndex++;
    }
  }, 5000);

  setTimeout(() => {
    for (var i = 0; i < 10; i++) {
      ws.send(JSON.stringify({ value: `hello! ${messageIndex}`, from: 'server' }));
      messageIndex++;
    }
  }, 5250);

  setTimeout(() => {
    for (var i = 0; i < 10; i++) {
      ws.send(JSON.stringify({ value: `hello! ${messageIndex}`, from: 'server' }));
      messageIndex++;
    }
  }, 5500);

  setTimeout(() => {
    for (var i = 0; i < 10; i++) {
      ws.send(JSON.stringify({ value: `hello! ${messageIndex}`, from: 'server' }));
      messageIndex++;
    }
  }, 5500);

  setTimeout(() => {
    for (var i = 0; i < 10; i++) {
      ws.send(JSON.stringify({ value: `hello! ${messageIndex}`, from: 'server' }));
      messageIndex++;
    }
  }, 6500);
});
