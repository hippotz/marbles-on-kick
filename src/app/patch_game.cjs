const { closeSync, copyFileSync, existsSync, openSync, readSync, statSync, writeFileSync } = require('fs');
const { Buffer } = require('node:buffer');

const defaultFileLocations = [
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Marbles on Stream\\MarblesOnStream\\Binaries\\Win64\\MarblesOnStream-Win64-Shipping.exe',
  'C:\\Steam\\steamapps\\common\\Marbles on Stream\\MarblesOnStream\\Binaries\\Win64\\MarblesOnStream-Win64-Shipping.exe',
  'D:\\Program Files (x86)\\Steam\\steamapps\\common\\Marbles on Stream\\MarblesOnStream\\Binaries\\Win64\\MarblesOnStream-Win64-Shipping.exe',
  'D:\\Steam\\steamapps\\common\\Marbles on Stream\\MarblesOnStream\\Binaries\\Win64\\MarblesOnStream-Win64-Shipping.exe',
];
function getFilePath() {
  for (const path of defaultFileLocations) {
    if (existsSync(path)) {
      return path;
    }
  }
}

const findReplace = {
  //.rdata:00007FF698E6C3E0		                text "UTF-16LE", 'wss://irc-ws.chat.twitch.tv:443',0
  find: Buffer.from('wss://irc-ws.chat.twitch.tv:443', 'utf16le'),
  replace: Buffer.from('ws://localhost:8069', 'utf16le'),
};

function containsBufferWithZeroFilledToLength(buf, bufLength, findBuffer, zeroFillLength) {
  console.log(
    `containsBufferWithZeroFilledToLength(buf, ${bufLength}, findBuffer (length=${findBuffer.length}), ${zeroFillLength}`
  );
  let findIndex = 0;
  for (let i = 0; i < bufLength; i++) {
    if (
      (findIndex < zeroFillLength && findIndex >= findBuffer.length && buf[i] === 0) ||
      (findIndex < findBuffer.length && buf[i] === findBuffer[findIndex])
    ) {
      if (findIndex === zeroFillLength - 1) {
        return true;
      }
      findIndex++;
    } else {
      findIndex = 0;
    }
  }
  return false;
}

function getStateOfBinary(filePath) {
  if (!filePath) {
    return;
  }
  let fd;
  try {
    log('loading filePath: ' + filePath);
    const stats = statSync(filePath);
    fd = openSync(filePath, 'r+');
    const buf = Buffer.alloc(stats.size);
    const bytesRead = readSync(fd, buf, 0, stats.size, 0);
    if (bytesRead !== stats.size) {
      log(`Failed to read only file, only read ${bytesRead}`);
    }

    const maxLength = Math.max(findReplace.find.length, findReplace.replace.length);

    const foundFind = containsBufferWithZeroFilledToLength(buf, bytesRead, findReplace.find, maxLength);
    const foundReplace = containsBufferWithZeroFilledToLength(buf, bytesRead, findReplace.replace, maxLength);

    return [foundFind, foundReplace];
  } catch (e) {
    log('Failed to read executable', e);
  } finally {
    if (fd) {
      closeSync(fd);
    }
  }
}

function patchGame(path) {
  patchGameString(path, findReplace.find, findReplace.replace);
}

function unpatchGame(path) {
  patchGameString(path, findReplace.replace, findReplace.find);
}

function patchGameString(filePath, findBuffer, replaceBuffer) {
  let fd;
  try {
    const stats = statSync(filePath);
    fd = openSync(filePath, 'r+');
    const buf = Buffer.alloc(stats.size);
    const bytesRead = readSync(fd, buf, 0, stats.size, 0);
    if (bytesRead !== stats.size) {
      log(`Failed to read only file, only read ${bytesRead}`);
    }

    let findIndex = 0;
    let findLength = Math.max(findBuffer.length, replaceBuffer.length);
    let startLocation = 0;
    let foundLocations = [];
    for (let i = 0; i < bytesRead; i++) {
      if (
        (findIndex < findLength && findIndex >= findBuffer.length && buf[i] === 0) ||
        (findIndex < findBuffer.length && buf[i] === findBuffer[findIndex])
      ) {
        if (findIndex === 0) {
          startLocation = i;
        } else if (findIndex === findLength - 1) {
          foundLocations.push(startLocation);
          findIndex = 0;
          startLocation = 0;
          continue;
        }
        findIndex++;
      } else {
        findIndex = 0;
      }
    }

    if (foundLocations.length > 0) {
      copyFileSync(filePath, filePath + '.bak');
      for (let locs = 0; locs < foundLocations.length; locs++) {
        const loc = foundLocations[locs];
        console.log('first found location replacing ' + loc);
        for (let i = loc; i < loc + findLength; i++) {
          if (i - loc < replaceBuffer.length) {
            buf[i] = replaceBuffer[i - loc];
          } else {
            buf[i] = 0;
          }
        }
      }
      writeFileSync(fd, buf);
    }
  } catch (e) {
    log('Failed to patch file: ' + e);
    exit();
  } finally {
    if (fd) {
      closeSync(fd);
    }
  }
}

module.exports = {
  getFilePath,
  getStateOfBinary,
  patchGame,
  unpatchGame,
};
