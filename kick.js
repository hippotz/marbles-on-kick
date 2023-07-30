const WebSocket = require('ws');
const { readFileSync } = require('node:fs');
const hardcodedRooms = require('./chatroomIds.json');

const SUBLEVEL = {
  subscriber: 1,
  broadcaster: 2,
  vip: 4, // TODO: not used on kick
};

const kickChatUrl = 'wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.6.0&flash=false';

// Check the hardcoded list first, if not found check for a file inside the same directory
function getKickChatroomId(channelName) {
  if (hardcodedRooms[channelName]) {
    return hardcodedRooms[channelName];
  } else {
    try {
      return JSON.parse(readFileSync('./chatroomIds.json'))?.[channelName] || '';
    } catch (err) {
      console.log('Failed to load chatroomIds.json!', err);
    }
  }
}

async function getKickChatStream(chatroom, onChatCallback) {
  const chatroomId = getKickChatroomId(chatroom);
  if (!chatroomId) {
    console.log('=== ERROR === Missing chatroomId check the README');
    exit();
  }
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
    console.log('sending:');
    console.log(str);
    ws.send(Buffer.from(str));
  }

  ws.on('error', console.error);

  ws.on('open', () => {
    console.log('=== CONNECTED TO KICK ===');
    connected = true;
  });

  ws.on('close', () => {
    console.log('=== KICK CONNECTION CLOSED ===');
    connected = false;
  });

  ws.on('message', (buffer) => {
    const received = buffer.toString('utf8');
    const msg = JSON.parse(received);
    console.log('received: ' + received);
    let data = msg.data;
    if (data) {
      const isEmptyObject = data === '{}';
      if (typeof data === 'string') {
        data = JSON.parse(data);
        if (!isEmptyObject) {
          console.log(data);
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
      let sublevel = 0;
      data.sender.identity.badges
        .map((b) => {
          switch (b.type) {
            case 'subscriber':
              return SUBLEVEL.subscriber;
            case 'broadcaster': //This doesnt seem to matter, roomId has to equal userId for broadcaster to be red
              return SUBLEVEL.broadcaster;
          }
          return 0;
        })
        .forEach((val) => {
          sublevel |= val;
        });
      onChatCallback(sublevel, data.sender.username.toLowerCase(), data.sender.username, data.content);
    }
  });
  return ws;
}

module.exports = {
  getKickChatStream,
  SUBLEVEL,
};
