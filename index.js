/*
const { runFakeServer } = require('./fake_irc_server.js');
const { patchGameString } = require('./patch_game.js');

// Patch the executable's string containing the irc url
patchGameString().then(() => {
  console.log('Proxy server starting');
  // Run fake irc server that facilitates marbles <-> kick communication
  runFakeServer();
});

*/
const { app, dialog, ipcMain, BrowserWindow, contextBridge } = require('electron');
const path = require('node:path');

/*
contextBridge.exposeInMainWorld('electron', {
  setMarblesLocation: () => {
    console.log(dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] }))
  },
})
*/

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');
};

app.whenReady().then(() => {
  ipcMain.handle('ping', () => 'pong');
  ipcMain.handle('setMarblesLocation', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Marbles Executable', extensions: ['exe'] }],
    });
    return result.filePaths[0];
  });
  // ipc: https://stackoverflow.com/questions/55164360/with-contextisolation-true-is-it-possible-to-use-ipcrenderer
  /*
  ipcMain.addListener('ipctest', () => {
    console.log('ipctest called');
  });
  */
  createWindow();
});
