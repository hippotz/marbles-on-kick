const { closeSync, copyFileSync, existsSync, openSync, readSync, statSync, writeFileSync } = require('fs');
const { Buffer } = require('node:buffer');
const { createInterface } = require('node:readline');

const defaultFileLocations = [
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Marbles on Stream\\MarblesOnStream\\Binaries\\Win64\\MarblesOnStream-Win64-Shipping.exe',
  'C:\\Steam\\steamapps\\common\\Marbles on Stream\\MarblesOnStream\\Binaries\\Win64\\MarblesOnStream-Win64-Shipping.exe',
  'D:\\Program Files (x86)\\Steam\\steamapps\\common\\Marbles on Stream\\MarblesOnStream\\Binaries\\Win64\\MarblesOnStream-Win64-Shipping.exe',
  'D:\\Steam\\steamapps\\common\\Marbles on Stream\\MarblesOnStream\\Binaries\\Win64\\MarblesOnStream-Win64-Shipping.exe',
];

// Return the first default path that exists or a file location given by the user
async function getFilePath() {
  for (const path of defaultFileLocations) {
    if (existsSync(path)) {
      return path;
    }
  }

  const prompter = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve, reject) => {
    const doPrompt = (invalidPath) => {
      prompter.question(`Couldn't find file at given location (${invalidPath}).\nEnter the file location:`, (input) => {
        if (existsSync(input)) {
          prompter.close();
          resolve(input);
        } else {
          doPrompt(input);
        }
      });
    };
    try {
      doPrompt(defaultFileLocations[0]);
    } catch (e) {
      reject(e);
    }
  });
}

const findReplace = {
  //.rdata:00007FF698E6C3E0		                text "UTF-16LE", 'wss://irc-ws.chat.twitch.tv:443',0
  find: Buffer.from('wss://irc-ws.chat.twitch.tv:443', 'utf16le'),
  replace: Buffer.from('ws://localhost:8069', 'utf16le'),
};
async function patchGameString() {
  let fd;
  try {
    const filePath = await getFilePath();
    console.log('getFilePath returned: ' + filePath);
    const stats = statSync(filePath);
    fd = openSync(filePath, 'r+');
    const buf = Buffer.alloc(stats.size);
    const bytesRead = readSync(fd, buf, 0, stats.size, 0);
    if (bytesRead !== stats.size) {
      console.log(`Failed to read only file, only read ${bytesRead}`);
    }

    let findIndex = 0;
    let startLocation = 0;
    let foundLocations = [];
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === findReplace.find[findIndex]) {
        if (findIndex === 0) {
          startLocation = i;
        } else if (findIndex === findReplace.find.length - 1) {
          foundLocations.push(startLocation);
          findIndex = 0;
          startLocation = 0;
          break;
        }
        findIndex++;
      } else {
        findIndex = 0;
      }
    }
    if (foundLocations.length > 0) {
      console.log(`Found string ${foundLocations.length} times at ${foundLocations}`);
    } else {
      console.log('Unable to patch binary. Maybe it was already patched?');
    }

    if (foundLocations.length === 1) {
      copyFileSync(filePath, filePath + '.bak');
      const loc = foundLocations[0];
      const findSize = findReplace.find.length;
      for (let i = 0; i < findSize; i++) {
        if (i < findSize) {
          buf[loc + i] = findReplace.replace[i];
        } else {
          buf[loc + i] = 0;
        }
      }
      writeFileSync(fd, buf);
    }
  } catch (e) {
    console.log('Failed to patch file: ' + e);
    exit();
  } finally {
    if (fd) {
      closeSync(fd);
    }
  }
}
module.exports = {
  patchGameString,
};
