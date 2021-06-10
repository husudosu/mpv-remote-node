#!/usr/bin/env node

/*
Launcher came from here.
https://github.com/mrxdst/webtorrent-mpv-hook/blob/master/src/bin.ts
*/
const path = require("path");
const os = require("os");
const fs = require("fs");

const target = path.join(__dirname, 'remote.socketio.js');
const link = path.join(getScriptFolder(), 'mpvremote', 'remote.socketio.js');

// const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

console.log([
  `mpv-remote`,
  '',
  'You need to symlink the script file to your mpv scripts folder:',
  '',
  `  ${os.platform() === 'win32' ? `mklink "${link}" "${target}"\n  or\n  New-Item -ItemType SymbolicLink -Path "${link}" -Target "${target}"` : `ln -s "${target}" "${link}"`}`,
  '',
  ''
].join('\n'));

function getScriptFolder() {
  let mpvHome;

  if (os.platform() === 'win32') {
    mpvHome = process.env['MPV_HOME'] || '%APPDATA%/mpv';
  } else {
    mpvHome = process.env['MPV_HOME'];
    if (!mpvHome) {
      const xdgConfigHome = process.env['XDG_CONFIG_HOME'] || '$HOME/.config';
      mpvHome = path.join(xdgConfigHome, 'mpv');
    }
  }

  return path.join(mpvHome, 'scripts');
}