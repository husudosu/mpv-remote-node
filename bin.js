#!/usr/bin/env node
/*
Launcher came from here.
https://github.com/mrxdst/webtorrent-mpv-hook/blob/master/src/bin.ts
*/
const path = require("path");
const os = require("os");

const pluginDir = path.join(__dirname, "mpvremote");
const MPVHome = getMPVHome();
const scriptFolder = path.join(MPVHome, "scripts");
const scriptOptsFolder = path.join(MPVHome, "script-opts");

const target = path.join(__dirname, "remoteServer.js");
const target1 = path.join(__dirname, "watchlisthandler.js");
const target2 = path.join(__dirname, "mpvremote.conf");
const powershellInstaller = path.join(__dirname, "install.ps1");
const bashInstaller = path.join(__dirname, "install.sh");

const link = path.join(scriptFolder, "mpvremote", "remoteServer.js");
const link1 = path.join(scriptFolder, "mpvremote", "watchlisthandler.js");

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function printInsturctions() {
  console.log(
    [
      `mpv-remote`,
      "",
      `${
        os.platform() === "win32"
          ? "On Windows you can't create symlink without Administrator privileges!"
          : ""
      }`,
      "First copy mpvremote plugin to your MPV plugins folder:",
      "",
      `  ${
        os.platform() === "win32"
          ? `xcopy /i "${pluginDir}" "${path.join(scriptFolder, "mpvremote")}"`
          : `mkdir -p "${scriptFolder}" && cp -r "${pluginDir}" "${scriptFolder}"`
      }`,
      "",
      "You need to symlink the script file to your MPV scripts folder:",
      "",
      `  ${
        os.platform() === "win32"
          ? `mklink "${link}" "${target}"\n  or\n  New-Item -ItemType SymbolicLink -Path "${link}" -Target "${target}"`
          : `ln -s "${target}" "${link}"`
      }`,
      "Copy default config file by using:",
      `  ${
        os.platform() === "win32"
          ? `echo f | xcopy /f /y "${target2}" "${scriptOptsFolder}"`
          : `mkdir -p "${scriptOptsFolder}" && cp -r "${target2}" "${scriptOptsFolder}"`
      }`,
      "If you want save media status do this:",
      `  ${
        os.platform() === "win32"
          ? `mklink "${link1}" "${target1}"\n  or\n  New-Item -ItemType SymbolicLink -Path "${link1}" -Target "${target1}"`
          : `ln -s "${target1}" "${link1}"`
      }`,
      "Download the Android app here: https://github.com/husudosu/mpv-remote-app/blob/master/android/app/release/app-release.apk",
    ].join("\n")
  );
}

function getMPVHome() {
  let mpvHome;

  if (os.platform() === "win32") {
    mpvHome = process.env["MPV_HOME"] || "%APPDATA%/mpv";
  } else {
    mpvHome = process.env["MPV_HOME"];
    if (!mpvHome) {
      const xdgConfigHome = process.env["XDG_CONFIG_HOME"] || "$HOME/.config";
      mpvHome = path.join(xdgConfigHome, "mpv");
    }
  }
  return mpvHome;
}

function automatedInstaller() {
  // If Win32 check if user runs powershell
  if (os.platform() === "win32") {
    console.log(
      `Open PowerShell as admin and run this command: ${powershellInstaller}`
    );
  } else {
    console.log(`Run this script: ${bashInstaller}`);
  }
}

rl.question("Would you like use wizzard installer? [Y/N]:", (answer) => {
  answer = answer.toUpperCase();
  switch (answer) {
    case "Y":
      automatedInstaller();
      rl.close();
      break;
    case "N":
    default:
      printInsturctions();
      rl.close();
      break;
  }
});
