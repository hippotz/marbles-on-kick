const windowStateManager = require('electron-window-state');
const { app, dialog, BrowserWindow, ipcMain, ipcRenderer } = require('electron');
const contextMenu = require('electron-context-menu');
const serve = require('electron-serve');
const path = require('path');
const { getFilePath, getStateOfBinary, patchGameString, patchGame, unpatchGame } = require('./app/patch_game.cjs');
const { getKickChatroomId } = require('./app/kick.cjs');
const { runFakeServer } = require('./app/fake_irc_server.cjs');
const { spawn } = require('node:child_process');

try {
  require('electron-reloader')(module);
} catch (e) {
  console.error(e);
}

const serveURL = serve({ directory: '.' });
const port = process.env.PORT || 5173;
const dev = !app.isPackaged;
let mainWindow;

function createWindow() {
  let windowState = windowStateManager({
    defaultWidth: 800,
    defaultHeight: 600,
  });

  const mainWindow = new BrowserWindow({
    backgroundColor: 'whitesmoke',
    autoHideMenuBar: true,
    /*
		trafficLightPosition: {
			x: 17,
			y: 32,
		},*/
    minHeight: 450,
    minWidth: 500,
    webPreferences: {
      enableRemoteModule: true,
      contextIsolation: true,
      nodeIntegration: true,
      spellcheck: false,
      devTools: dev,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
  });

  windowState.manage(mainWindow);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('close', () => {
    windowState.saveState(mainWindow);
  });

  return mainWindow;
}

contextMenu({
  showLookUpSelection: false,
  showSearchWithGoogle: false,
  showCopyImage: false,
  prepend: (defaultActions, params, browserWindow) => [
    {
      label: 'Make App 💻',
    },
  ],
});

function loadVite(port) {
  mainWindow.loadURL(`http://localhost:${port}`).catch((e) => {
    console.log('Error loading URL, retrying', e);
    setTimeout(() => {
      loadVite(port);
    }, 200);
  });
}

function createMainWindow() {
  mainWindow = createWindow();
  mainWindow.once('close', () => {
    mainWindow = null;
  });

  if (dev) loadVite(port);
  else serveURL(mainWindow);
}

app.once('ready', createMainWindow);
app.on('activate', () => {
  if (!mainWindow) {
    createMainWindow();
  }
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
ipcMain.on('run-init', () => {
  try {
    sendMarblesData(getFilePath());
  } catch (e) {
    console.log('failed to run-init', e);
  }
  mainWindow.webContents.send('run-init-done');
});

function sendMarblesData(path) {
  if (path) {
    const [hasTwitchUrl, hasKickUrl] = getStateOfBinary(path);
    mainWindow.webContents.send('set-marbles-exe-data', {
      path,
      hasTwitchUrl,
      hasKickUrl,
    });
  }
}

ipcMain.on('setup-marbles-location', (event, count) => {
  // 	return mainWindow.webContents.send('from-main', `next count is ${count + 1}`);
  console.log('setup called');
  const pathes = dialog.showOpenDialogSync({
    properties: ['openFile'],
    filters: [{ name: 'Executable', extensions: ['exe'] }],
  });
  sendMarblesData(pathes?.[0]);
});

ipcMain.on('patch-marbles-exe', (_, path) => {
  patchGame(path);
  sendMarblesData(path);
});
ipcMain.on('unpatch-marbles-exe', (_, path) => {
  unpatchGame(path);
  sendMarblesData(path);
});

ipcMain.on('set-kick-username', (_, kickData) => {
  const chatroomId = getKickChatroomId(kickData.username.toLocaleLowerCase());
  mainWindow.webContents.send('set-kick-data', {
    username: kickData.username.toLocaleLowerCase(),
    chatroomId: chatroomId ? chatroomId : kickData.chatroomId,
  });
});
ipcMain.on('set-kick-chatroom-id', (_, kickData) => {
  mainWindow.webContents.send('set-kick-data', {
    username: kickData.username,
    chatroomId: kickData.chatroomId,
  });
});
// Really shouldn't do this, but override the global logger
global.log = (msg) => {
  mainWindow.webContents.send('log-message', msg.toString());
};
global.logError = (msg) => {
  mainWindow.webContents.send('log-error', msg.toString());
};

const { clipboard } = require('electron');

ipcMain.on('copy-to-clipboard', (_, log) => {
  clipboard.writeText(log.toString(), 'selection');
});

let marblesRunning = false;
let closeFakeServer = () => {};
let spawnedProcess;

ipcMain.on('launch-marbles', (_, kickDataAndPath) => {
  // make sure to only run everything once, if there are issues restart the app
  if (!marblesRunning) {
    marblesRunning = true;
    closeFakeServer = runFakeServer(kickDataAndPath.username, kickDataAndPath.chatroomId);
    spawnedProcess = spawn(kickDataAndPath.path);
    spawnedProcess.on('close', (code) => {
      log('Marbles closed with exit code: ' + code);
    });
    mainWindow.webContents.send('marbles-started');
    mainWindow.webContents.send('server-started');
  }
});

ipcMain.on('kill-marbles', () => {
  closeFakeServer?.();
  closeFakeServer = () => {};
  marblesRunning = false;
  spawnedProcess?.kill();
  mainWindow.webContents.send('server-killed');
});

ipcMain.on('launch-server', (kickData) => {
  marblesRunning = true;
  closeFakeServer = runFakeServer(kickData.username, kickData.chatroomId);
  mainWindow.webContents.send('server-started');
});

ipcMain.on('kill-server', () => {
  closeFakeServer?.();
  closeFakeServer = () => {};
  marblesRunning = false;
  mainWindow.webContents.send('server-killed');
});
