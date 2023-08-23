function showDialog() {
  // console.log('test');
  /*
  const func = async () => {
    const response = await window.versions.ping()
    console.log(response) // prints out 'pong'
  }
  func();
  */
  window.marbies.setMarblesLocation();
  // window.ipcRenderer.send('getMarblesLocation', '');
  // console.log(dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] }))
}
document.getElementById('showDialogButton').addEventListener('click', showDialog);