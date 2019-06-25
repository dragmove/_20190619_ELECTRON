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
  setTimeout(() => {
    ws.send(
      JSON.stringify({
        value: 'message from socket server',
        from: 'server',
      })
    );
  }, 5000);
});
