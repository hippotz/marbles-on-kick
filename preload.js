const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('marbies', {
  ping: () => ipcRenderer.invoke('ping'),
  setMarblesLocation: () => {
    ipcRenderer.invoke('setMarblesLocation');
  },
})