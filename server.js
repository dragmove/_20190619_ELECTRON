// https://www.npmjs.com/package/ws
var WebSocket = require('ws');

var wss = new WebSocket.Server({ port: 9002 });

wss.on('connection', ws => {
  // client 와의 connection 완료시, client 측으로 메세지 전송
  ws.send('[socket server] Hello! I am a socket server.');

  ws.on('message', message => {
    console.log(`[socket server] from client : ${message}`);
  });
});
