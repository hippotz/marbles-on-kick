const { runFakeServer } = require('./fake_irc_server.js');
const { patchGameString } = require('./patch_game.js');

// Patch the executable's string containing the irc url
patchGameString().then(() => {
  console.log('Proxy server starting');
  // Run fake irc server that facilitates marbles <-> kick communication
  runFakeServer();
});
