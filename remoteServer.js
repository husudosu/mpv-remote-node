import { platform } from "os";
import path from "path";
import { lstatSync, existsSync, promises as fs_async } from "fs";
import child_process from "child_process";

import yargs from "yargs";
import { getPortPromise } from "portfinder";
import express, { json, Router } from "express";
import cors from "cors";

import mpvAPI from "node-mpv";

import { initDB } from "./crud.js";
import filebrowser, { detectFileType } from "./filebrowser.js";
import collections from "./collections.js";
import { loadSettings, settings, CORSOPTIONS } from "./settings.js";
import { stringIsAValidUrl, formatTime } from "./util.js";

const TEMPDIR = process.env.TEMP || process.env.TMP || "/tmp"; // Temp dir
const FILE_LOCAL_OPTIONS_PATH = path.join(TEMPDIR, "file-local-options.txt");
const WIN_SHUTDOWN_COMMAND = "shutdown /s /t 1";
const WIN_REBOOT_COMMAND = "shutdown /r /t 1";
const UNIX_SHUTDOWN_COMMAND = "/usr/sbin/shutdown now";
const UNIX_REBOOT_COMMAND = "/usr/sbin/reboot";
// TODO: Get version from package.json
const VERSION = "1.0.8";

// Returning cached properties if the CPU usage high.
let cachedProps = {};

const argv = yargs(process.argv.slice(2))
  .options({
    webport: {
      description: "First available server port",
      alias: "p",
      type: "number",
      default: 8000,
    },
    webportrangeend: {
      description: "Last available server port",
      alias: "e",
      type: "number",
      default: 8005,
    },
    uselocaldb: {
      description: "Use database for storing collection & mediastatus",
      type: "boolean",
      default: false,
    },
    filebrowserpaths: {
      description: "File browser paths, which can be accessed by the server",
      type: "array",
    },
    unsafefilebrowsing: {
      description: "Allows to browse your filesystem",
      type: "boolean",
      default: false,
    },
    verbose: {
      description: "Activates MPV node verbose log",
      type: "boolean",
      default: false,
    },
    "osd-messages": {
      description: "Enables OSD messages",
      type: "boolean",
      default: false,
    },
  })
  .help()
  .alias("help", "h").argv;

if (argv._.length == 0) {
  console.log("No socket provided");
  process.exit();
}

loadSettings(argv);

const app = express();
const APIRouter = Router();
const mpv = new mpvAPI({
  socket: settings.socketName,
  verbose: settings.verbose,
});

app.use(cors(CORSOPTIONS));
app.use(json());

APIRouter.use("/", filebrowser);
APIRouter.use("/collections", collections);

app.use("/api/v1", APIRouter);

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

APIRouter.get("/status", async (req, res) => {
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

APIRouter.post("/controls/play-pause", async (req, res) => {
  try {
    await mpv.togglePause();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/controls/play", async (req, res) => {
  try {
    await mpv.play();
    return res.json({ messsage: "success" });
  } catch (exc) {
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/controls/pause", async (req, res) => {
  try {
    await mpv.pause();
    return res.json({ messsage: "success" });
  } catch (exc) {
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/controls/stop", async (req, res) => {
  try {
    await mpv.stop();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

const playlistPrev = async (req, res) => {
  try {
    await mpv.prev();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
};

const playlistNext = async (req, res) => {
  try {
    await mpv.next();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
};

APIRouter.post("/controls/prev", playlistPrev);
APIRouter.post("/playlist/prev", playlistPrev);

APIRouter.post("/controls/next", playlistNext);
APIRouter.post("/playlist/next", playlistNext);

APIRouter.post("/controls/fullscreen", async (req, res) => {
  try {
    await mpv.toggleFullscreen();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/controls/volume/:value", async (req, res) => {
  try {
    await mpv.volume(req.params.value);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/controls/mute", async (req, res) => {
  try {
    await mpv.mute();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/controls/seek", async (req, res) => {
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
APIRouter.get("/tracks", async (req, res) => {
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
APIRouter.post("/tracks/audio/reload/:id", async (req, res) => {
  try {
    await mpv.selectAudioTrack(req.params.id);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/tracks/audio/cycle", async (req, res) => {
  try {
    await mpv.cycleAudioTracks();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/tracks/audio/add", async (req, res) => {
  try {
    if (!req.body.flag) req.body.flag = "select";
    await mpv.addAudioTrack(req.body.filename, req.body.flag);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/tracks/audio/timing/:seconds", async (req, res) => {
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
APIRouter.post("/tracks/sub/timing/:seconds", async (req, res) => {
  try {
    await mpv.adjustSubtitleTiming(req.params.seconds);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/tracks/sub/ass-override/:value", async (req, res) => {
  try {
    await mpv.setProperty("sub-ass-override", req.params.value);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/tracks/sub/font-size/:size", async (req, res) => {
  try {
    await mpv.setProperty("sub-font-size", req.params.size);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/tracks/sub/toggle-visibility", async (req, res) => {
  try {
    await mpv.toggleSubtitleVisibility();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/tracks/sub/visibility/:value", async (req, res) => {
  try {
    let val = req.params.value.toLowerCase() == "true" ? true : false;
    await mpv.setProperty("sub-visibility", val);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/tracks/sub/add", async (req, res) => {
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

APIRouter.post("/tracks/sub/reload/:id", async (req, res) => {
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
APIRouter.get("/playlist", async (req, res) => {
  try {
    return res.json(await getPlaylist());
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

const writeFileLocalOptions = async (options) => {
  await fs_async.writeFile(
    FILE_LOCAL_OPTIONS_PATH,
    JSON.stringify(options),
    "utf-8"
  );
};

const readFileLocalOptions = async () => {
  const content = await fs_async.readFile(FILE_LOCAL_OPTIONS_PATH, "utf-8");
  return JSON.parse(content);
};

APIRouter.post("/playlist", async (req, res) => {
  try {
    console.log(req.body);
    if (!req.body.flag) req.body.flag = "append-play";
    if (
      !stringIsAValidUrl(req.body.filename) &&
      lstatSync(req.body.filename).isDirectory()
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

APIRouter.delete("/playlist/remove/:index", async (req, res) => {
  try {
    await mpv.playlistRemove(req.params.index);
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/playlist/move", async (req, res) => {
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

APIRouter.post("/playlist/play/:index", async (req, res) => {
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

APIRouter.post("/playlist/clear", async (req, res) => {
  try {
    await mpv.clearPlaylist();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.post("/playlist/shuffle", async (req, res) => {
  try {
    await mpv.shuffle();
    return res.json({ message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

APIRouter.get("/mpvinfo", async (req, res) => {
  try {
    res.json(await getMPVInfo());
  } catch (exc) {
    return res.status(500).json({ message: exc });
  }
});

const shutdownAction = async (action) => {
  switch (action) {
    case "shutdown":
      // First stop MPV playback to save playback data
      await mpv.stop();
      child_process.exec(
        platform == "win32" ? WIN_SHUTDOWN_COMMAND : UNIX_SHUTDOWN_COMMAND
      );
      break;
    case "reboot":
      await mpv.stop();
      child_process.exec(
        platform == "win32" ? WIN_REBOOT_COMMAND : UNIX_REBOOT_COMMAND
      );
      break;
    case "quit":
      await mpv.stop();

      break;
  }
};

APIRouter.post("/computer/:action", async (req, res) => {
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
        const playerData = await getMPVProps();
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

const handle = (promise) => {
  return promise
    .then((data) => [data, undefined])
    .catch((error) => Promise.resolve([undefined, error]));
};

const getMPVInfo = async () => {
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
    mpvremoteVersion: VERSION,
  };
};

const getTracks = async () => {
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
};

const getPlaylist = async () => {
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
};

const getMetaData = async () => {
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
};

const getMPVProp = async (key) => {
  try {
    switch (key) {
      case "playlist":
        return await getPlaylist();
      case "chapter-list":
        return await mpv.getChapters();
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
};

const getMPVProps = async (exclude = []) => {
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

  let retval = {};
  for (const key of Object.keys(props)) {
    if (!exclude.includes(key)) {
      const val = (await getMPVProp(key)) || props[key];
      retval[key] = val;
    }
  }
  return retval;
};

getPortPromise({
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

const showOSDMessage = async (text, timeout = null) => {
  /*
  Shows OSD message on MPV if it's enabled on settings.
  */
  if (settings.osdMessages) {
    if (timeout) return await mpv.command("show-text", [text, timeout]);
    else return await mpv.command("show-text", [text]);
  } else {
    console.log(`OSD message: ${text}`);
  }
};

const main = async () => {
  try {
    // Creates/clears file local options file.
    await mpv.start();

    // Create file-local-options if not exists.
    if (!existsSync(FILE_LOCAL_OPTIONS_PATH)) writeFileLocalOptions({});
    if (settings.uselocaldb) await initDB();

    await showOSDMessage(
      `Remote access on: ${settings.serverIP}:${settings.serverPort}`,
      5000
    );
  } catch (error) {
    // handle errors here
    console.log(error);
  }
};

process.on("unhandledRejection", (error) => {
  // Will print "unhandledRejection err is not defined"
  console.log("unhandledRejection", JSON.stringify(error));
});
