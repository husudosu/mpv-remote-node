#!/usr/bin/env node
/*
Launcher came from here.
https://github.com/mrxdst/webtorrent-mpv-hook/blob/master/src/bin.ts
*/
import { join, dirname } from "path";
import { platform } from "os";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

const pluginDir = join(__dirname, "mpvremote");
const MPVHome = getMPVHome();
const scriptFolder = join(MPVHome, "scripts");
const scriptOptsFolder = join(MPVHome, "script-opts");

const target = join(__dirname, "remoteServer.js");
const target1 = join(__dirname, "watchlisthandler.js");
const target2 = join(__dirname, "mpvremote.conf");
const powershellInstaller = join(__dirname, "install.ps1");
const bashInstaller = join(__dirname, "install.sh");

const link = join(scriptFolder, "mpvremote", "remoteServer.js");
const link1 = join(scriptFolder, "mpvremote", "watchlisthandler.js");

import { createInterface } from "readline";
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function printInsturctions() {
  console.log(
    [
      `mpv-remote`,
      "",
      `${
        platform() === "win32"
          ? "On Windows you can't create symlink without Administrator privileges!"
          : ""
      }`,
      "First copy mpvremote plugin to your MPV plugins folder:",
      "",
      `  ${
        platform() === "win32"
          ? `xcopy /i "${pluginDir}" "${join(scriptFolder, "mpvremote")}"`
          : `mkdir -p "${scriptFolder}" && cp -r "${pluginDir}" "${scriptFolder}"`
      }`,
      "",
      "You need to symlink the script file to your MPV scripts folder:",
      "",
      `  ${
        platform() === "win32"
          ? `mklink "${link}" "${target}"\n  or\n  New-Item -ItemType SymbolicLink -Path "${link}" -Target "${target}"`
          : `ln -s "${target}" "${link}"`
      }`,
      "Copy default config file by using:",
      `  ${
        platform() === "win32"
          ? `echo f | xcopy /f /y "${target2}" "${scriptOptsFolder}"`
          : `mkdir -p "${scriptOptsFolder}" && cp -r "${target2}" "${scriptOptsFolder}"`
      }`,
      "If you want save media status do this:",
      `  ${
        platform() === "win32"
          ? `mklink "${link1}" "${target1}"\n  or\n  New-Item -ItemType SymbolicLink -Path "${link1}" -Target "${target1}"`
          : `ln -s "${target1}" "${link1}"`
      }`,
      "Download the Android app here: https://github.com/husudosu/mpv-remote-app/blob/master/android/app/release/app-release.apk",
    ].join("\n")
  );
}

function getMPVHome() {
  let mpvHome;

  if (platform() === "win32") {
    mpvHome = process.env["MPV_HOME"] || "%APPDATA%/mpv";
  } else {
    mpvHome = process.env["MPV_HOME"];
    if (!mpvHome) {
      const xdgConfigHome = process.env["XDG_CONFIG_HOME"] || "$HOME/.config";
      mpvHome = join(xdgConfigHome, "mpv");
    }
  }
  return mpvHome;
}

function automatedInstaller() {
  // If Win32 check if user runs powershell
  if (platform() === "win32") {
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
