const { WebSocketServer } = require('ws');
const { getTwichUserId } = require('./get_twitch_userid.js');
const { getKickChatStream, SUBLEVEL } = require('./kick.js');

const wss = new WebSocketServer({ port: 8069 });
const serverName = 'tmi.twitch.tv';

function getUserHostName(nickname) {
  return nickname + '!' + nickname + '@' + nickname + '.' + serverName;
}

function runFakeServer() {
  wss.on('connection', (ws) => {
    let pingInterval;
    let kickWebSocket;
    let nickname;
    let twitchIrcChannel;
    let twitchUserId;
    let userHostName;

    function onKickChatCallback(sublevel, username, displayName, message) {
      console.log(
        `on kick callback sublevel: ${sublevel}, username: ${username}, displayName: ${displayName}, message: ${message} `
      );
      let ircMessage = `@badge-info=ohhay/1,`;
      if (sublevel & SUBLEVEL.subscriber) {
        ircMessage += ',subscriber/1';
      }
      if (sublevel & SUBLEVEL.vip) {
        ircMessage += ',vip/1';
      }
      ircMessage += `;display-name=${displayName}`;
      if (nickname === username) {
        ircMessage += `;user-id=${twitchUserId};user-type=`;
      }

      // Broadcaster flag is based on user-id matching room-id (think ;user-type= is required because marbles has a .split bug)
      ircMessage += ' :' + getUserHostName(username) + ' PRIVMSG ' + twitchIrcChannel + ' :' + message;
      send(ircMessage);
    }

    ws.on('error', console.error);
    ws.on('close', () => {
      console.log('=== MARBLES CONNECTION CLOSED ===');
      if (kickWebSocket) {
        kickWebSocket.close();
      }
      clearTimeout(pingInterval);
    });

    function send(str) {
      console.log('sent: %s', str);
      ws.send(str + '\r\n');
    }

    ws.on('open', () => {
      console.log('=== CONNECTED TO MARBLES ===');
    });

    let passline; // retain this so we can grab the userId from twitch's irc server in get_twitch_userid.js

    ws.on('message', async function message(data) {
      // weird web client sends :twitch.tv but the game sends : twitch.tv
      const command = data.toString().trim();
      // Print each line except the oauth token line
      if (command && !command.startsWith('PASS')) {
        console.log('received: %s', data.toString());
      }
      if (command.startsWith('CAP REQ')) {
        const capabilities = command.split(':', 2)[1].trim().split(/\s+/);
        send(`:${serverName} CAP * ACK :${capabilities.join(' ')}`);
      } else if (command.startsWith('PASS')) {
        // Kind of goofy, we connect to twitch irc to get the userid then disconnect
        // Only use for the twitch auth is to lookup the broadcaster's userId so they will show up as the Broadcaster
        passline = command;
      } else if (command.startsWith('NICK')) {
        // Grab the twitch userId so the broadcaster will show up as Red
        twitchUserId = await getTwichUserId(command, passline);
        // Remove the pass line so it can't be accidentally leaked later
        passline = null;
        nickname = command.split(/\s+/, 2)[1];
        userHostName = nickname + '!' + nickname + '@' + nickname + '.' + serverName;
        pingInterval = setInterval(() => {
          send(`PING ${serverName}`);
        }, 1000 * 60);
        send(`:${serverName} 001 ${nickname} :Welcome, GLHF!`);
      } else if (command.startsWith('PING')) {
        send(`PONG ${serverName}`);
      } else if (command.startsWith('JOIN')) {
        twitchIrcChannel = command.split(/\s+/, 2)[1].trim();
        if (twitchIrcChannel !== '#' + nickname) {
          console.error(`somehow the channel (${twitchIrcChannel}) isn't the same as the nick (${nickname})`);
          exit();
        }
        send(`:${userHostName} JOIN ${twitchIrcChannel}`);
        // upon connection connect to kick
        kickWebSocket = await getKickChatStream(nickname, onKickChatCallback);

        // Setup a retry
        kickWebSocket.on('close', async () => {
          const reconnectFn = async (backoff) => {
            console.log('Reconnecting to kick...');
            try {
              kickWebSocket = await getKickChatStream(nickname, onKickChatCallback);
            } catch (e) {
              console.error(e);
              setTimeout(() => reconnectFn(backoff * 2), Math.min(1000 * backoff, 30 * 1000));
            }
          };
          reconnectFn(1);
        });
      }
    });
  });
}
module.exports = {
  runFakeServer,
  SUBLEVEL,
};
