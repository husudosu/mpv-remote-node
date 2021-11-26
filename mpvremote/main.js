"use strict";
// This is the plugin file for MPV

/*Path handling, script idea came from webtorrent plugin :
https://github.com/mrxdst/webtorrent-mpv-hook
ES5 syntax works only.
*/

var options = {
  uselocaldb: 1,
  filebrowserpaths: "",
  webport: 8000,
  address: "",
  unsafefilebrowsing: 1,
  verbose: 0,
};

mp.options.read_options(options, "mpvremote");

var platform = mp.utils.getenv("windir") ? "win32" : "unix";
var pathsep = platform === "win32" ? "\\" : "/";

function getMPVSocket() {
  var socketName = mp.get_property("input-ipc-server");

  if (!socketName) {
    var fname =
      platform === "win32" ? "\\\\.\\pipe\\mpvremote" : "/tmp/mpvremote";
    mp.set_property("input-ipc-server", fname);
    // Check socket
    socketName = mp.get_property("input-ipc-server");
  }

  // TODO raise error if socket still not exists!
  return socketName;
}

function getScriptPath(filename) {
  var script = mp.get_script_file().replace(/\\/g, "\\\\");
  var p = mp.command_native({
    name: "subprocess",
    args: ["node", "-p", "require('fs').realpathSync('" + script + "')"],
    playback_only: false,
    capture_stdout: true,
  });
  var s = p.stdout.split(pathsep);
  s[s.length - 1] = filename;
  return s.join(pathsep);
}

var scriptPath = getScriptPath("remoteServer.js");
var watchlistHandlerPath = getScriptPath("watchlisthandler.js");

var socketName = getMPVSocket();

var serverArgs = ["node", scriptPath, socketName, "-p " + options.webport];

if (options.verbose) serverArgs.push("--verbose");
if (options.uselocaldb) serverArgs.push("--uselocaldb");
if (options.filebrowserpaths.length > 0) {
  var pathsArr = options.filebrowserpaths.split("';'");
  serverArgs.push("--filebrowserpaths");
  for (var i = 0; i < pathsArr.length; i++) {
    serverArgs.push(pathsArr[i]);
  }
}
if (options.unsafefilebrowsing) serverArgs.push("--unsafefilebrowsing");

mp.command_native_async(
  {
    name: "subprocess",
    args: serverArgs,
    playback_only: false,
    capture_stderr: true,
  },
  function (success, result, error) {
    mp.msg.info(success);
    mp.msg.info(result);
    mp.msg.info(error);
  }
);

function setFileLocalOptions(options) {
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      mp.msg.info(key);
      mp.msg.info(options[key]);

      mp.set_property(key, options[key]);
    }
  }
}
/* For handling file-local-option
Currently storing file-local-options via file-local-options.txt
because have to get file-local-options before the file fully loaded.
*/
mp.add_hook("on_load", 50, function () {
  try {
    /*
    JSON structure should be something like this:
    {
      "filename1": {"http-header-fields": ["test: a", "test1: b"]},
      "filename2": {"http-header-fields": ["test: a", "test1: b"]}
    }
    */
    mp.set_property("force-media-title", "");
    var scriptDir = mp.get_script_directory();
    var fileName = mp.get_property("path");
    var fileLocalOptions = mp.utils.read_file(
      scriptDir + "/" + "file-local-options.txt"
    );
    fileLocalOptions = JSON.parse(fileLocalOptions);

    // Find filename in the file-local-options
    for (var key in fileLocalOptions) {
      if (key === fileName) setFileLocalOptions(fileLocalOptions[key]);
    }
  } catch (exc) {
    mp.msg.info(exc);
  }
});

// On unload MPV, need this for saving playbacktime to database
if (options.uselocaldb) {
  mp.add_hook("on_unload", 50, function () {
    var currentPlaybackTime = mp.get_property("playback-time");
    var currentFilename = mp.get_property("path");
    var currentPercentPos = mp.get_property("percent-pos");

    /* Calling binary,
    not the ideal solution, but I can't find any information regarding hook supporting on JSON-IPC.
    Fetch API not supported by MuJS
    */
    mp.command_native_async({
      name: "subprocess",
      args: [
        "node",
        watchlistHandlerPath,
        currentFilename,
        currentPlaybackTime,
        currentPercentPos,
      ],
      playback_only: false,
      capture_stderr: true,
    });
    mp.msg.info("Mediastatus updated");
  });
}
