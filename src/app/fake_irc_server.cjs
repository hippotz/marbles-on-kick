const { WebSocketServer } = require('ws');
const { getTwichUserId } = require('./get_twitch_userid.cjs');
const { getKickChatStream, BADGES } = require('./kick.cjs');

const serverName = 'tmi.twitch.tv';

function getUserHostName(nickname) {
  return nickname + '!' + nickname + '@' + nickname + '.' + serverName;
}

function runFakeServer(kickUsername, kickChatroomId) {
  let kickWebSocket;
  const wss = new WebSocketServer({ port: 8069 });
  log('Starting server...');
  wss.on('connection', (ws) => {
    let pingInterval;
    let nickname;
    let twitchIrcChannel;
    let twitchUserId;
    let userHostName;

    function onKickChatCallback(badges, username, displayName, message) {
      log(
        `on kick callback badges: ${badges}, username: ${username}, displayName: ${displayName}, message: ${message} `
      );
      let ircMessage = `@badge-info=;badges=ohhay/1,`;
      if (badges & BADGES.broadcaster) {
        ircMessage += ',broadcaster/1';
      }
      if (badges & BADGES.moderator) {
        ircMessage += ',moderator/1';
      }
      if (badges & BADGES.vip) {
        ircMessage += ',vip/1';
      }
      if (badges & BADGES.founder) {
        ircMessage += ',founder/1';
      }
      if (badges & BADGES.subscriber) {
        ircMessage += ',subscriber/1';
      }
      ircMessage += `;display-name=${displayName}`;
      if (kickUsername === username) {
        ircMessage += `;user-id=${twitchUserId};user-type=`;
      }

      // Broadcaster flag is based on user-id matching room-id (think ;user-type= is required because marbles has a .split bug)
      ircMessage += ' :' + getUserHostName(username) + ' PRIVMSG ' + twitchIrcChannel + ' :' + message;
      send(ircMessage);
    }

    ws.on('error', logError);
    ws.on('close', () => {
      log('=== MARBLES CONNECTION CLOSED ===');
      if (kickWebSocket) {
        kickWebSocket.close();
      }
      clearTimeout(pingInterval);
    });

    function send(str) {
      log(`sent: ${str}`);
      ws.send(str + '\r\n');
    }

    ws.on('open', () => {
      log('=== CONNECTED TO MARBLES ===');
    });

    let passline; // retain this so we can grab the userId from twitch's irc server in get_twitch_userid.js

    ws.on('message', async function message(data) {
      // weird web client sends :twitch.tv but the game sends : twitch.tv
      const command = data.toString().trim();
      // Print each line except the oauth token line
      if (command && !command.startsWith('PASS')) {
        log(`received: ${data.toString()}`);
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
          logError(`somehow the channel (${twitchIrcChannel}) isn't the same as the nick (${nickname})`);
          exit();
        }
        send(`:${userHostName} JOIN ${twitchIrcChannel}`);
        // upon connection connect to kick
        kickWebSocket = await getKickChatStream(kickChatroomId, onKickChatCallback);

        // Setup a retry
        kickWebSocket.on('close', async () => {
          const reconnectFn = async (backoff) => {
            log('Reconnecting to kick...');
            try {
              kickWebSocket = await getKickChatStream(kickChatroomId, onKickChatCallback);
            } catch (e) {
              logError(e);
              setTimeout(() => reconnectFn(backoff * 2), Math.min(1000 * backoff, 30 * 1000));
            }
          };
          reconnectFn(1);
        });
      }
    });
  });
  return () => {
    log('Stopping server...');
    kickWebSocket?.terminate();
    wss?.close();
  };
}
module.exports = {
  runFakeServer,
  BADGES,
};
