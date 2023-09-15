const WebSocket = require('ws');

// connect to twitch, grab userId, close connection
async function getTwichUserId(nickline, passline) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    ws.on('open', () => {
      log('=== CONNECTED TO TWITCH ===');
      ws.send('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands\r\n');
      ws.send(passline + '\r\n');
      ws.send(nickline + '\r\n');
    });
    ws.on('close', () => {
      log('=== DISCONNECTED FROM TWITCH ===');
      reject?.('abruptly disconnected');
    });
    ws.on('error', (err) => {
      log(' === TWITCH ERROR === ', err);
      reject?.(err);
    });
    ws.on('message', (buffer) => {
      const msg = buffer.toString('utf8');
      log('TWITCH IRC MESSAGE: ' + msg);
      const match = msg.match(/user-id=(\d+)/);
      if (match) {
        resolve(match[1]);
        reject = undefined;
        ws.close();
      }
    });
  });
}
module.exports = {
  getTwichUserId,
};
