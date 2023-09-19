const WebSocket = require('ws');
const { readFileSync } = require('node:fs');
const hardcodedRooms = require('./chatroomIds.json');

const BADGES = {
  subscriber: 1,
  broadcaster: 2,
  vip: 4,
  founder: 8,
  moderator: 16,
};

const kickChatUrl = 'wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.6.0&flash=false';

// Check the hardcoded list first, if not found check for a file inside the same directory
function getKickChatroomId(channelName) {
  if (hardcodedRooms[channelName]) {
    return hardcodedRooms[channelName];
  }
  return '';
}

async function getKickChatStream(chatroomId, onChatCallback) {
  const longChatroomId = `chatrooms.${chatroomId}.v2`;

  const ws = new WebSocket(kickChatUrl);
  let connected = false;
  let pingTime = 120;

  function doDelayedPing() {
    setTimeout(() => {
      if (connected) {
        sendJson({ event: 'pusher:ping', data: {} });
      }
    }, pingTime * 1000);
  }

  function sendJson(json) {
    const str = JSON.stringify(json);
    log('sending: ' + str);
    ws.send(Buffer.from(str));
  }

  ws.on('error', logError);

  ws.on('open', () => {
    log('=== CONNECTED TO KICK ===');
    connected = true;
  });

  ws.on('close', () => {
    log('=== KICK CONNECTION CLOSED ===');
    connected = false;
  });

  ws.on('message', (buffer) => {
    const received = buffer.toString('utf8');
    const msg = JSON.parse(received);
    log('received: ' + received);
    let data = msg.data;
    if (data) {
      const isEmptyObject = data === '{}';
      if (typeof data === 'string') {
        data = JSON.parse(data);
        if (!isEmptyObject) {
          log(data);
        }
      }
    }
    if (msg.event === 'pusher:pong') {
      doDelayedPing();
    } else if (msg.event === 'pusher:connection_established') {
      if (data.activity_timeout) {
        pingTime = data.activity_timeout;
        doDelayedPing();
      }
      /* example message
        {
          "id": "04fdef1c-7046-4aec-a05c-3c3872ac6145",
          "chatroom_id": 4416890,
          "content": "!btop",
          "type": "message",
          "created_at": "2023-07-28T00:43:33+00:00",
          "sender": {
            "id": 8481935,
            "username": "xqc_small_dick",
            "slug": "xqc-small-dick",
            "identity": {
              "color": "#F2708A",
              "badges": [{ "type": "subscriber", "text": "Subscriber", "count": 1 }]
            }
          }
        }
      */
      sendJson({ event: 'pusher:subscribe', data: { auth: '', channel: longChatroomId } });
    } else if (msg.event === 'App\\Events\\ChatMessageEvent' && msg.channel === longChatroomId) {
      let badges = 0;
      data.sender.identity.badges
        .map((b) => {
          switch (b.type) {
            case 'subscriber':
              return BADGES.subscriber;
            case 'broadcaster': //This doesnt seem to matter, roomId has to equal userId for broadcaster to be red
              return BADGES.broadcaster;
            case 'vip':
              return BADGES.vip;
            case 'founder':
              return BADGES.founder;
            case 'moderator':
              return BADGES.moderator;
          }
          return 0;
        })
        .forEach((val) => {
          badges |= val;
        });
      onChatCallback(badges, data.sender.username.toLowerCase(), data.sender.username, data.content);
    }
  });
  return ws;
}

module.exports = {
  BADGES,
  getKickChatStream,
  getKickChatroomId,
};
