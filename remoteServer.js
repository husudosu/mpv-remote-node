const os = require("os");
const process = require("process");
const fs = require("fs");
const fs_async = require("fs").promises;
const path = require("path");
const URL = require("url").URL;
const exec = require("child_process").exec;

const express = require("express");
const cors = require("cors");
const mpvAPI = require("node-mpv");

const yargs = require("yargs");
const portfinder = require("portfinder");

const WIN_SHUTDOWN_COMMAND = "shutdown /s /t 1";
const WIN_REBOOT_COMMAND = "shutdown /r /t 1";
const UNIX_SHUTDOWN_COMMAND = "/usr/sbin/shutdown now";
const UNIX_REBOOT_COMMAND = "/usr/sbin/reboot";

const { initDB } = require("./crud");

const tempdir = process.env.TEMP || process.env.TMP || "/tmp"; // Temp dir
const FILE_LOCAL_OPTIONS_PATH = path.join(tempdir, "file-local-options.txt");
const filebrowser = require("./filebrowser");
const collections = require("./collections");
const { detectFileType } = require("./filebrowser");
const { loadSettings, settings, CORSOPTIONS } = require("./settings");
const { version } = require("./package.json");
// Returning cached properties if the CPU usage high.
let cachedProps = {};

const argv = yargs
  .option("webport", {
    description: "First available server port",
    alias: "p",
    type: "number",
    default: 8000,
  })
  .option("webportrangeend", {
    description: "Last available server port",
    alias: "e",
    type: "number",
    default: 8005,
  })
  .option("uselocaldb", {
    description: "Use database for storing collection & mediastatus",
    type: "boolean",
    default: false,
  })
  .option("filebrowserpaths", {
    description: "File browser paths, which can be accessed by the server",
    type: "array",
  })
  .option("unsafefilebrowsing", {
    description: "Allows to browse your filesystem",
    type: "boolean",
    default: false,
  })
  .option("verbose", {
    description: "Activates MPV node verbose log",
    type: "boolean",
    default: false,
  })
  .option("osd-messages", {
    description: "Enables OSD messages",
    type: "boolean",
    default: false,
  })
  .help()
  .alias("help", "h").argv;
if (argv._.length == 0) {
  console.log("No socket provided");
  process.exit();
}

loadSettings(argv);

const app = express();
app.use(cors(CORSOPTIONS));
app.use(express.json());

app.use("/", filebrowser);
app.use("/api/v1/collections", collections);

const mpv = new mpvAPI({
  socket: settings.socketName,
  verbose: settings.verbose,
});

function stringIsAValidUrl(s) {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
}

// Thanks: https://javascript.plainenglish.io/how-to-add-a-timeout-limit-to-asynchronous-javascript-functions-3676d89c186d
const asyncCallWithTimeout = async (asyncPromise, timeLimit) => {
  let timeoutHandle;

  const timeoutPromise = new Promise((_resolve, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("Async call timeout limit reached")),
      timeLimit
    );
  });

  return Promise.race([asyncPromise, timeoutPromise]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  });
};

app.get("/api/v1/status", async (req, res) => {
  try {
    const result = await asyncCallWithTimeout(
      getMPVProps(req.query.exclude),
      500
    );
    // Returning cached properties if the CPU usage high.
    cachedProps = Object.assign(cachedProps, result);
    return res.json(result);
  } catch (exc) {
    if (exc.message == "Async call timeout limit reached")
      return res.json(cachedProps);
    else return res.status(500).json({ message: exc });
  }
});

/*
MEDIA CONTROLS
*/

app.post("/api/v1/controls/play-pause", async (req, res) => {
  try {
    await mpv.togglePause();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/controls/play", async (req, res) => {
  try {
    await mpv.play();
    return res.json({ messsage: "success" });
  } catch (exc) {
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/controls/pause", async (req, res) => {
  try {
    await mpv.pause();
    return res.json({ messsage: "success" });
  } catch (exc) {
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/controls/stop", async (req, res) => {
  try {
    await mpv.stop();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

async function playlistPrev(req, res) {
  try {
    await mpv.prev();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
}

async function playlistNext(req, res) {
  try {
    await mpv.next();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
}

app.post("/api/v1/controls/prev", playlistPrev);
app.post("/api/v1/playlist/prev", playlistPrev);

app.post("/api/v1/controls/next", playlistNext);
app.post("/api/v1/playlist/next", playlistNext);

app.post("/api/v1/controls/fullscreen", async (req, res) => {
  try {
    await mpv.toggleFullscreen();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/controls/volume/:value", async (req, res) => {
  try {
    await mpv.volume(req.params.value);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/controls/mute", async (req, res) => {
  try {
    await mpv.mute();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/controls/seek", async (req, res) => {
  try {
    if (!req.body.flag) req.body.flag = "relative";
    await mpv.seek(req.body.target, req.body.flag);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

/*
  TRACKS
*/
app.get("/api/v1/tracks", async (req, res) => {
  try {
    return res.json(await getTracks());
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

/*
  AUDIO TRACKS
*/
app.post("/api/v1/tracks/audio/reload/:id", async (req, res) => {
  try {
    await mpv.selectAudioTrack(req.params.id);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/tracks/audio/cycle", async (req, res) => {
  try {
    await mpv.cycleAudioTracks();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/tracks/audio/add", async (req, res) => {
  try {
    if (!req.body.flag) req.body.flag = "select";
    await mpv.addAudioTrack(req.body.filename, req.body.flag);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/tracks/audio/timing/:seconds", async (req, res) => {
  try {
    await mpv.adjustAudioTiming(req.params.seconds);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

/*
  SUB TRACKS
*/
app.post("/api/v1/tracks/sub/timing/:seconds", async (req, res) => {
  try {
    await mpv.adjustSubtitleTiming(req.params.seconds);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/tracks/sub/ass-override/:value", async (req, res) => {
  try {
    await mpv.setProperty("sub-ass-override", req.params.value);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/tracks/sub/font-size/:size", async (req, res) => {
  try {
    await mpv.setProperty("sub-font-size", req.params.size);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/tracks/sub/toggle-visibility", async (req, res) => {
  try {
    await mpv.toggleSubtitleVisibility();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/tracks/sub/visibility/:value", async (req, res) => {
  try {
    let val = req.params.value.toLowerCase() == "true" ? true : false;
    await mpv.setProperty("sub-visibility", val);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/tracks/sub/add", async (req, res) => {
  try {
    // TODO: title, lang
    if (!req.body.flag) req.body.flag = "select";
    await mpv.addSubtitles(req.body.filename, req.body.flag);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/tracks/sub/reload/:id", async (req, res) => {
  try {
    await mpv.selectSubtitles(req.params.id);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

/*
  PLAYLIST
*/
app.get("/api/v1/playlist", async (req, res) => {
  try {
    return res.json(await getPlaylist());
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

async function writeFileLocalOptions(options) {
  await fs_async.writeFile(
    FILE_LOCAL_OPTIONS_PATH,
    JSON.stringify(options),
    "utf-8"
  );
}

async function readFileLocalOptions() {
  const content = await fs_async.readFile(FILE_LOCAL_OPTIONS_PATH, "utf-8");
  return JSON.parse(content);
}

app.post("/api/v1/playlist", async (req, res) => {
  try {
    console.log(req.body);
    if (!req.body.flag) req.body.flag = "append-play";
    if (
      !stringIsAValidUrl(req.body.filename) &&
      fs.lstatSync(req.body.filename).isDirectory()
    ) {
      for (const item of await fs_async.readdir(req.body.filename)) {
        let type = detectFileType(path.extname(item));
        if (type === "video" || type == "audio") {
          await mpv.load(item, "append-play");
        }
      }
    } else {
      if (req.body["file-local-options"]) {
        let fileLocalOptions = await readFileLocalOptions();
        fileLocalOptions[req.body.filename] = req.body["file-local-options"];
        // Have to write cach file here
        await writeFileLocalOptions(fileLocalOptions);
      }
      await mpv.load(req.body.filename, req.body.flag);
      if (req.body.seekTo) {
        await mpv.seek(req.body.seekTo, "absolute");
      }
    }
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.delete("/api/v1/playlist/remove/:index", async (req, res) => {
  try {
    await mpv.playlistRemove(req.params.index);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/playlist/move", async (req, res) => {
  try {
    if (!req.query.fromIndex)
      return res
        .status(400)
        .json({ message: "fromIndex query param required!" });
    if (!req.query.toIndex)
      return res.status(400).json({ message: "toIndex query param required!" });

    await mpv.playlistMove(req.query.fromIndex, req.query.toIndex);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/playlist/play/:index", async (req, res) => {
  try {
    await mpv.command("playlist-play-index", [req.params.index]);
    await mpv.play();
    // return res.json({ message: "success" });
    return res.json(await getPlaylist());
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/playlist/clear", async (req, res) => {
  try {
    await mpv.clearPlaylist();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.post("/api/v1/playlist/shuffle", async (req, res) => {
  try {
    await mpv.shuffle();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

app.get("/api/v1/mpvinfo", async (req, res) => {
  try {
    res.json(await getMPVInfo());
  } catch (exc) {
    return res.status(500).json({ message: exc });
  }
});

async function shutdownAction(action) {
  switch (action) {
    case "shutdown":
      // First stop MPV playback to save playback data
      await mpv.stop();
      exec(
        os.platform == "win32" ? WIN_SHUTDOWN_COMMAND : UNIX_SHUTDOWN_COMMAND
      );
      break;
    case "reboot":
      await mpv.stop();
      exec(os.platform == "win32" ? WIN_REBOOT_COMMAND : UNIX_REBOOT_COMMAND);
      break;
    case "quit":
      await mpv.stop();

      break;
  }
}

app.post("/api/v1/computer/:action", async (req, res) => {
  try {
    switch (req.params.action) {
      case "shutdown":
      case "reboot":
      case "quit":
        shutdownAction(req.params.action);
        break;
      default:
        return res.status(400).json({ message: "Invalid action" });
    }
  } catch (exc) {
    console.log(exc);
  }
});

mpv.on("status", async (status) => {
  try {
    switch (status.property) {
      case "pause":
        await showOSDMessage(status.value ? "Pause" : "Play");
        break;
      case "volume":
        await showOSDMessage(`Volume: ${status.value}%`);
        break;
      case "mute":
        let volume = await mpv.getProperty("volume");
        await showOSDMessage(status.value ? "Mute" : `Volume ${volume}`);
        break;
      case "playlist-count":
      case "playlist-pos":
        break;
      case "path":
        playerData = await getMPVProps();
        if (status.value) {
          // Reset subdelay to 0
          await mpv.setProperty("sub-delay", 0);
          // Also reset audio delay to 0
          await mpv.adjustAudioTiming(0);
          await showOSDMessage(
            `Playing: ${playerData["media-title"] || playerData.filename}`
          );
        }
        break;
    }
  } catch (exc) {
    console.log(exc);
  }
});

mpv.on("seek", async (data) => {
  await showOSDMessage(`Seek: ${formatTime(data.end)}`);
});

function formatTime(param) {
  var sec_num = parseInt(param);
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - hours * 3600) / 60);
  var seconds = sec_num - hours * 3600 - minutes * 60;

  if (hours < 10) {
    hours = "0" + hours;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  return hours + ":" + minutes + ":" + seconds;
}

function handle(promise) {
  return promise
    .then((data) => [data, undefined])
    .catch((error) => Promise.resolve([undefined, error]));
}

async function getMPVInfo() {
  return {
    "ffmpeg-version": await handle(mpv.getProperty("ffmpeg-version"))
      .then((resp) => resp[0])
      .catch(() => null),
    "mpv-version": await handle(mpv.getProperty("mpv-version"))
      .then((resp) => resp[0])
      .catch(() => null),
    "libass-version": await handle(mpv.getProperty("libass-version"))
      .then((resp) => resp[0])
      .catch(() => null),
    mpvremoteConfig: settings,
    mpvremoteVersion: version,
  };
}

async function getTracks() {
  const count = await mpv.getProperty("track-list/count");
  let tracks = [];
  for (let i = 0; i < count; i++) {
    try {
      let track = {
        index: i,
        id: await handle(mpv.getProperty(`track-list/${i}/id`)).then(
          (resp) => resp[0]
        ),
        type: await handle(mpv.getProperty(`track-list/${i}/type`)).then(
          (resp) => resp[0]
        ),
        selected: await handle(
          mpv.getProperty(`track-list/${i}/selected`)
        ).then((resp) => resp[0]),
        codec: await handle(mpv.getProperty(`track-list/${i}/codec`)).then(
          (resp) => resp[0]
        ),
      };
      // Get specific stuff
      if (track.type === "video") {
        track["demux-w"] = await handle(
          mpv.getProperty(`track-list/${i}/demux-w`)
        ).then((resp) => resp[0]);
        track["demux-h"] = await handle(
          mpv.getProperty(`track-list/${i}/demux-h`)
        ).then((resp) => resp[0]);
      } else if (track.type === "audio") {
        track["demux-channel-count"] = await handle(
          mpv.getProperty(`track-list/${i}/demux-channel-count`)
        ).then((resp) => resp[0]);
        track["demux-channels"] = await handle(
          mpv.getProperty(`track-list/${i}/demux-channels`)
        ).then((resp) => resp[0]);
        track["demux-samplerate"] = await handle(
          mpv.getProperty(`track-list/${i}/demux-samplerate`)
        ).then((resp) => resp[0]);
        track["demux-bitrate"] = await handle(
          mpv.getProperty(`track-list/${i}/demux-bitrate`)
        ).then((resp) => resp[0]);
        track.lang = await handle(mpv.getProperty(`track-list/${i}/lang`)).then(
          (resp) => resp[0]
        );
        track["external-filename"] = await handle(
          mpv.getProperty(`track-list/${i}/external-filename`)
        ).then((resp) => resp[0]);
      } else if (track.type === "sub") {
        track.lang = await handle(mpv.getProperty(`track-list/${i}/lang`)).then(
          (resp) => resp[0]
        );
        track["external-filename"] = await handle(
          mpv.getProperty(`track-list/${i}/external-filename`)
        ).then((resp) => resp[0]);
      }

      tracks.push(track);
    } catch (exc) {
      console.log(exc);
    }
  }
  return tracks;
}

async function getPlaylist() {
  const count = await mpv.getProperty("playlist-count");
  let playlist = [];
  for (let i = 0; i < count; i++) {
    try {
      let item = {
        index: i,
        id: await handle(mpv.getProperty(`playlist/${i}/id`)).then(
          (resp) => resp[0]
        ),
        filePath: await handle(mpv.getProperty(`playlist/${i}/filename`)).then(
          (resp) => resp[0]
        ),
        current: await handle(mpv.getProperty(`playlist/${i}/current`)).then(
          (resp) => resp[0]
        ),
        title: await handle(mpv.getProperty(`playlist/${i}/title`)).then(
          (resp) => resp[0]
        ),
      };

      if (item.filePath) item.filename = path.basename(item.filePath);
      playlist.push(item);
    } catch (exc) {
      console.log(exc);
    }
  }
  return playlist;
}

async function getChapters() {
  const count = await mpv.getProperty("chapter-list/count");
  let chapters = [];
  for (let i = 0; i < count; i++) {
    chapters.push({
      title: await handle(mpv.getProperty(`chapter-list/${i}/title`)).then(
        (resp) => resp[0]
      ),
      time: await handle(mpv.getProperty(`chapter-list/${i}/time`)).then(
        (resp) => resp[0]
      ),
    });
  }
  return chapters;
}

async function getMetaData() {
  const count = await mpv.getProperty("metadata/list/count");
  let metadata = {};
  for (let i = 0; i < count; i++) {
    const key = await handle(mpv.getProperty(`metadata/list/${i}/key`)).then(
      (resp) => resp[0]
    );
    if (key) {
      const value = await handle(
        mpv.getProperty(`metadata/list/${i}/value`)
      ).then((resp) => resp[0]);

      if (value) {
        metadata[key] = value;
      }
    }
  }
  return metadata;
}

async function getMPVProp(key) {
  try {
    switch (key) {
      case "playlist":
        return await getPlaylist();
      case "chapter-list":
        return await getChapters();
      case "track-list":
        return await getTracks();
      case "metadata":
        return await getMetaData();
      case "position":
        return await mpv.getProperty("time-pos");
      case "remaining":
        return await mpv.getProperty("time-remaining");
      default:
        return await mpv.getProperty(key);
    }
  } catch (exc) {
    if (exc.errmessage != "property unavailable") {
      console.log(exc);
    }
    return null;
  }
}

async function getMPVProps(exclude = []) {
  let props = {
    pause: false,
    mute: false,
    filename: null,
    duration: 0,
    position: 0,
    remaining: 0,
    "media-title": null,
    chapter: 0,
    volume: 0,
    "volume-max": 100,
    fullscreen: false,
    speed: 1,
    "sub-delay": 0,
    "sub-visibility": true,
    "audio-delay": 0,
    "sub-font-size": 55,
    "sub-ass-override": "no",
    playlist: [],
    "chapter-list": [],
    "track-list": [],
    metadata: {},
  };

  retval = {};
  for (key of Object.keys(props)) {
    if (!exclude.includes(key)) {
      const val = (await getMPVProp(key)) || props[key];
      retval[key] = val;
    }
  }
  return retval;
}

portfinder
  .getPortPromise({
    port: settings.serverPort,
    stopPort: settings.serverPortRangeEnd,
  })
  .then((port) => {
    app.listen(port, () => {
      settings.serverPort = port;
      console.log(`listening on ${settings.serverIP}:${port}`);
      main();
    });
  })
  .catch(() => {
    console.log(
      "There is no free port available, mpv-remote not started check your settings."
    );
  });

async function showOSDMessage(text, timeout = null) {
  /*
  Shows OSD message on MPV if it's enabled on settings.
  */
  if (settings.osdMessages) {
    if (timeout) return await mpv.command("show-text", [text, timeout]);
    else return await mpv.command("show-text", [text]);
  } else {
    console.log(`OSD message: ${text}`);
  }
}

async function main() {
  try {
    // Creates/clears file local options file.
    await mpv.start();

    // Create file-local-options if not exists.
    if (!fs.existsSync(FILE_LOCAL_OPTIONS_PATH)) writeFileLocalOptions({});
    if (settings.uselocaldb) await initDB();

    await showOSDMessage(
      `Remote access on: ${settings.serverIP}:${settings.serverPort}`,
      5000
    );
  } catch (error) {
    // handle errors here
    console.log(error);
  }
}

process.on("unhandledRejection", (error) => {
  // Will print "unhandledRejection err is not defined"
  console.log("unhandledRejection", JSON.stringify(error));
});
