const process = require("process");
const express = require("express");
const os = require("os");
const cors = require("cors");
const http = require("http");
const fs_async = require("fs").promises;
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const nodeDiskInfo = require("node-disk-info");
const mpvAPI = require("node-mpv");

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const DB_PATH = path.join(getScriptFolder(), "mpvremote", "remote.db");
let db;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app, function (req, res) {
  res.setHeader("Content-Type", "application/json");

  // FIXME: Find better method for database handling.
  console.log(DB_PATH);
});

// Enable foreign key handling

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

/* 
You can configure the port here!
*/
const SERVER_PORT = 8000;
const CORSOPTIONS = {
  origin: "*",
  methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
};

const cliArgs = process.argv.slice(2);
const socketName = cliArgs[0];
if (!socketName) {
  console.log("No socket provided");
  process.exit();
}

const mpv = new mpvAPI({
  socket: socketName,
  verbose: false,
});

/*
Supported file formats by MPV
Gonna render differently in frontend.
*/
const FILE_FORMATS = {
  audio: [
    ".ac3",
    ".a52",
    ".eac3",
    ".mlp",
    ".dts",
    ".dts-hd",
    ".dtshd",
    ".true-hd",
    ".thd",
    ".truehd",
    ".thd+ac3",
    ".tta",
    ".pcm",
    ".wav",
    ".aiff",
    ".aif",
    ".aifc",
    ".amr",
    ".awb",
    ".au",
    ".snd",
    ".lpcm",
    ".ape",
    ".wv",
    ".shn",
    ".adts",
    ".adt",
    ".mpa",
    ".m1a",
    ".m2a",
    ".mp1",
    ".mp2",
    ".mp3",
    ".m4a",
    ".aac",
    ".flac",
    ".oga",
    ".ogg",
    ".opus",
    ".spx",
    ".mka",
    ".weba",
    ".wma",
    ".f4a",
    ".ra",
    ".ram",
    ".3ga",
    ".3ga2",
    ".ay",
    ".gbs",
    ".gym",
    ".hes",
    ".kss",
    ".nsf",
    ".nsfe",
    ".sap",
    ".spc",
    ".vgm",
    ".vgz",
    ".cue",
  ],
  video: [
    ".yuv",
    ".y4m",
    ".m2ts",
    ".m2t",
    ".mts",
    ".mtv",
    ".ts",
    ".tsv",
    ".tsa",
    ".tts",
    ".trp",
    ".mpeg",
    ".mpg",
    ".mpe",
    ".mpeg2",
    ".m1v",
    ".m2v",
    ".mp2v",
    ".mpv",
    ".mpv2",
    ".mod",
    ".tod",
    ".vob",
    ".vro",
    ".evob",
    ".evo",
    ".mpeg4",
    ".m4v",
    ".mp4",
    ".mp4v",
    ".mpg4",
    ".h264",
    ".avc",
    ".x264",
    ".264",
    ".hevc",
    ".h265",
    ".x265",
    ".265",
    ".ogv",
    ".ogm",
    ".ogx",
    ".mkv",
    ".mk3d",
    ".webm",
    ".avi",
    ".vfw",
    ".divx",
    ".3iv",
    ".xvid",
    ".nut",
    ".flic",
    ".fli",
    ".flc",
    ".nsv",
    ".gxf",
    ".mxf",
    ".wm",
    ".wmv",
    ".asf",
    ".dvr-ms",
    ".dvr",
    ".wt",
    ".dv",
    ".hdv",
    ".flv",
    ".f4v",
    ".qt",
    ".mov",
    ".hdmov",
    ".rm",
    ".rmvb",
    ".3gpp",
    ".3gp",
    ".3gp2",
    ".3g2",
  ],
  playlist: [".m3u", ".m3u8", ".pls"],
  subtitle: [
    ".aqt",
    ".cvd",
    ".dks",
    ".jss",
    ".sub",
    ".ttxt",
    ".mpl",
    ".sub",
    ".pjs",
    ".psb",
    ".rt",
    ".smi",
    ".ssf",
    ".srt",
    ".ssa",
    ".ass",
    ".sub",
    ".svcd",
    ".usf",
    ".sub",
    ".idx",
    ".txt",
  ],
};

function detectFileType(extension) {
  extension = extension.toLowerCase();

  if (FILE_FORMATS.video.includes(extension)) {
    return "video";
  } else if (FILE_FORMATS.audio.includes(extension)) {
    return "audio";
  } else if (FILE_FORMATS.subtitle.includes(extension)) {
    return "subtitle";
  } else {
    return "file";
  }
}

async function getDirectoryContents(qpath) {
  let content = [];
  for (const item of await fs_async.readdir(qpath)) {
    if (fs.lstatSync(path.join(qpath, item)).isDirectory()) {
      content.push({
        priority: 1,
        type: "directory",
        name: item,
        fullPath: path.join(qpath, item),
      });
    } else {
      let fileType = detectFileType(path.extname(item));
      // Render only media, sub types.
      if (fileType !== "file") {
        content.push({
          priority: 2,
          type: fileType,
          name: item,
          fullPath: path.join(qpath, item),
        });
      }
    }
  }
  return content;
}

app.get("/fileman", cors(CORSOPTIONS), async (req, res) => {
  let qpath = req.query.path;
  let qcollection = req.query.collection;

  let retval = {};
  retval.content = [];

  if (qpath) {
    if (!fs.existsSync(qpath)) res.status(404).send("Path not exists!");
    retval.content = await getDirectoryContents(qpath);
    retval.dirname = path.basename(qpath);
    retval.prevDir = path.resolve(qpath, "..");
    retval.cwd = qpath;
  } else if (qcollection) {
    // Get collection
    let collection = await getCollections(qcollection);
    await Promise.all(
      collection.paths.map(async (item) => {
        if (fs.existsSync(item.path)) {
          const dir = await getDirectoryContents(item.path);
          retval.content = [...retval.content, ...dir];
        } else {
          console.log(`Path not exists ${item.path}`);
        }
      })
    );
    retval.collection_id = qcollection;
  } else {
    qpath = os.homedir();
    content = await getDirectoryContents(qpath);
    retval.dirname = path.basename(qpath);
    retval.prevDir = path.resolve(qpath, "..");
    retval.cwd = qpath;
    retval.content = content;
  }
  retval.content.sort((a, b) => {
    return (
      a.priority - b.priority ||
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  });

  res.json(retval);
});

app.get("/drivelist/", cors(CORSOPTIONS), async (req, res) => {
  try {
    res.json(nodeDiskInfo.getDiskInfoSync());
  } catch (e) {
    console.error(e);
  }
});

async function getCollectionEntries(collection_id) {
  return await db.all(
    "SELECT * FROM collection_entry WHERE collection_id=?",
    collection_id
  );
}

async function getCollections(id = null) {
  if (id) {
    let collection = await db.get("SELECT * FROM collection WHERE id=?", id);

    if (collection) {
      collection.paths = await getCollectionEntries(collection.id);
      return collection;
    } else {
      return null;
    }
  } else {
    let collections = await db.all("SELECT * FROM collection");
    return collections;
    // Snippet for mapping & async/await
    /*collections = await Promise.all(
      collections.map(async (collection) => {
        collection.paths = await getCollectionEntries(collection.id);
        return collection;
      })
    );*/
  }
}

app.options("/collections/", cors(CORSOPTIONS));
app.get("/collections/:id?", cors(CORSOPTIONS), async (req, res) => {
  try {
    if (req.params.id) {
      res.json(await getCollections(req.params.id));
    } else {
      res.json(await getCollections());
    }
  } catch (exc) {
    console.log(exc);
  }
});

app.post("/collections/", cors(CORSOPTIONS), async (req, res) => {
  // TODO Some validation.
  try {
    const dbres = await db.run(
      "INSERT INTO collection (name, type) VALUES (?, ?)",
      req.body.name,
      req.body.type || 1
    );

    // Get new object
    let collection = await db.get(
      "SELECT * FROM collection WHERE id=?",
      dbres.lastID
    );
    collection.paths = [];
    if (req.body.paths && req.body.paths.length > 0) {
      req.body.paths.forEach(async (element) => {
        // Add path
        const entryRes = await db.run(
          "INSERT INTO collection_entry (collection_id, path) VALUES (?, ?)",
          collection.id,
          element.path
        );
        // Get path
        const entry = await db.get(
          "SELECT * FROM collection_entry WHERE id=?",
          entryRes.lastID
        );
        collection.paths.push(entry);
      });
    }
    res.json(collection);
  } catch (exc) {
    console.log(exc);
    res.status(422).json({ error: exc });
  }
});

app.options("/collections/:collection_id/", cors(CORSOPTIONS));
app.delete(
  "/collections/:collection_id/",
  cors(CORSOPTIONS),
  async (req, res) => {
    const collection_id = req.params.collection_id;
    try {
      await db.run("DELETE FROM collection WHERE id=?", collection_id);
      res.json({});
    } catch (exc) {
      res.status(500).json({ error: exc });
    }
  }
);

app.post(
  "/collections/:collection_id/entries/",
  cors(CORSOPTIONS),
  async (req, res) => {
    const collection_id = req.params.collection_id;
    try {
      const dbres = await db.run(
        "INSERT INTO collection_entry (collection_id, path) VALUES (?, ?)",
        collection_id,
        req.body.path
      );
      const collection_entry = await db.get(
        "SELECT * FROM collection_entry WHERE id=?",
        dbres.lastID
      );
      res.json(collection_entry);
    } catch (exc) {
      res.status(422).json({ error: exc });
    }
  }
);

mpv.on("status", async (status) => {
  console.log(status);
  switch (status.property) {
    case "pause":
      await mpv.command("show-text", [status.value ? "Pause" : "Play"]);
      io.emit("pause", status.value);
      break;
    case "volume":
      io.emit("propChange", status);
      await mpv.command("show-text", [`Volume: ${status.value}%`]);
      break;
    case "mute":
      io.emit("propChange", status);
      let volume = await mpv.getProperty("volume");
      await mpv.command("show-text", [
        status.value ? "Mute" : `Volume ${volume}`,
      ]);
      break;
    case "playlist-count":
    case "playlist-pos":
      io.emit("propChange", {
        property: "playlist",
        value: await getPlaylist(),
      });
      break;
    case "duration":
      playerData = await getMPVProps();
      if (status.value) {
        await mpv.command("show-text", [
          `Playing: ${playerData.media_title || playerData.filename}`,
        ]);
        io.emit("playerData", playerData);
      }
      break;
  }
});

mpv.on("stopped", async () => {
  io.emit("stopped");
});

mpv.on("seek", async (data) => {
  // FIXME: Probably not the best solution
  console.log(data);
  await mpv.command("show-text", [`Seek: ${formatTime(data.end)}`]);
  io.emit("playbackTimeResponse", {
    playback_time: formatTime(data.end),
    percent_pos: Math.ceil(await mpv.getProperty("percent-pos")),
  });
});

// FIXME: This causes interval creation. started event
mpv.on("resumed", async (data) => {
  console.log(`Started playback ${JSON.stringify(data)}`);
  io.emit("pause", false);
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
        track.demuxW = await handle(
          mpv.getProperty(`track-list/${i}/demux-w`)
        ).then((resp) => resp[0]);
        track.demuxH = await handle(
          mpv.getProperty(`track-list/${i}/demux-h`)
        ).then((resp) => resp[0]);
      } else if (track.type === "audio") {
        track.demuxChannelCount = await handle(
          mpv.getProperty(`track-list/${i}/demux-channel-count`)
        ).then((resp) => resp[0]);
        track.demuxChannels = await handle(
          mpv.getProperty(`track-list/${i}/demux-channels`)
        ).then((resp) => resp[0]);
        track.demuxSamplerate = await handle(
          mpv.getProperty(`track-list/${i}/demux-samplerate`)
        ).then((resp) => resp[0]);
        track.demuxBitrate = await handle(
          mpv.getProperty(`track-list/${i}/demux-bitrate`)
        ).then((resp) => resp[0]);
        track.lang = await handle(mpv.getProperty(`track-list/${i}/lang`)).then(
          (resp) => resp[0]
        );
        track.external_filename = await handle(
          mpv.getProperty(`track-list/${i}/external-filename`)
        ).then((resp) => resp[0]);
      } else if (track.type === "sub") {
        track.lang = await handle(mpv.getProperty(`track-list/${i}/lang`)).then(
          (resp) => resp[0]
        );
        track.external_filename = await handle(
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

async function getMPVProps() {
  let props = {
    filename: null,
    duration: "00:00:00",
    playback_time: "00:00:00",
    percent_pos: 0,
    media_title: null,
    playlist: [],
    currentTracks: [],
  };

  try {
    props.pause = await mpv.getProperty("pause");
    props.volume = await mpv.getProperty("volume");
    props.mute = await mpv.getProperty("mute");

    // File related data, only send back if available.
    props.filename = await mpv.getProperty("filename");
    props.duration =
      formatTime(await mpv.getProperty("duration")) || "00:00:00";
    props.playback_time =
      formatTime(await mpv.getProperty("playback-time")) || "00:00:00";
    props.percent_pos = Math.ceil(await mpv.getProperty("percent-pos")) || 0;
    props.media_title = await mpv.getProperty("media-title");
    props.playlist = (await getPlaylist()) || [];
    props.currentTracks = await getTracks();
  } catch (exc) {
    console.log("No playback.");
  }

  return props;
}

io.on("connection", (socket) => {
  console.log("User connected");
  // TODO: Create a method for this!

  getMPVProps().then((resp) => {
    socket.emit("playerData", resp);
  });
  // Send duration for new connections.
  socket.on("playbackTime", async function (data) {
    const playbackTime = await mpv.getProperty("playback-time");
    const percentPos = Math.ceil(await mpv.getProperty("percent-pos"));
    socket.emit("playbackTimeResponse", {
      playback_time: formatTime(playbackTime),
      percent_pos: percentPos,
    });
  });

  socket.on("setPlayerProp", async function (data) {
    try {
      console.log(`Set ${data[0]} to ${data[1]}`);
      await mpv.setProperty(data[0], data[1]);
    } catch (exc) {
      console.log(exc);
    }
  });
  socket.on("openFile", async function (data) {
    try {
      if (fs.lstatSync(data.filename).isDirectory()) {
        for (const item of await fs_async.readdir(data.filename)) {
          let type = detectFileType(path.extname(item));
          if (type === "video" || type == "audio") {
            await mpv.load(item, "append-play");
          }
        }
      } else {
        await mpv.load(
          data.filename,
          data.appendToPlaylist ? "append-play" : "replace"
        );
      }
    } catch (exc) {
      console.log(exc);
    }
  });

  socket.on("stopPlayback", async function (data) {
    await mpv.stop();
  });

  socket.on("seek", async function (data) {
    try {
      await mpv.command("seek", [data, "absolute-percent"]);
    } catch (exc) {
      console.log(exc);
    }
  });

  socket.on("tracks", async function (data, cb) {
    let tracks = await getTracks();
    console.log(`Tracks ${JSON.stringify(tracks)}`);
    console.log("Calling callback");
    cb({ tracks: await getTracks() });
  });

  // Playlist events
  socket.on("playlistPlayIndex", async function (data) {
    console.log(`Playlist index change: ${JSON.stringify(data)}`);
    await mpv.command("playlist-play-index", [data]);
    await mpv.play();
  });

  socket.on("playlistMove", async function (data, cb) {
    console.log(`Moving playlist element ${JSON.stringify(data)}`);
    try {
      // let res = await mpv.command("playlist-move", [data.fromIndex, data.toIndex]);
      await mpv.playlistMove(data.fromIndex, data.toIndex);
      cb({ playlist: await getPlaylist() });
    } catch (exc) {
      console.log(exc);
    }
  });

  socket.on("playlistRemove", async function (data) {
    console.log(`Removing index ${data}`);
    await mpv.playlistRemove(data);
  });

  socket.on("playlistClear", async function () {
    await mpv.clearPlaylist();
  });

  socket.on("playlistNext", async function () {
    await mpv.next();
  });

  socket.on("playlistPrev", async function () {
    await mpv.prev();
  });

  socket.on("audioReload", async function (id) {
    await mpv.selectAudioTrack(id);
  });

  socket.on("subReload", async function (id) {
    await mpv.selectSubtitles(id);
  });

  socket.on("adjustSubtitleTiming", async function (seconds) {
    await mpv.adjustSubtitleTiming(seconds);
  });

  socket.on("subSettings", async function (data, cb) {
    cb({ subDelay: await mpv.getProperty("sub-delay") });
  });

  socket.on("fullscreen", async function () {
    const fullscreen = await mpv.getProperty("fullscreen");
    await mpv.setProperty("fullscreen", !fullscreen);
  });
});

server.listen(SERVER_PORT, () => {
  console.log(`listening on *:${SERVER_PORT}`);
});

// ! Move DB stuff to other file
async function init_tables() {
  // Collections
  // TYPE Can be: Movies - 1, TVShows - 2, Music - 3
  await db.exec(
    `CREATE TABLE IF NOT EXISTS collection(
        id INTEGER PRIMARY KEY ASC, name TEXT NOT NULL, type INTEGER NOT NULL
      )`
  );

  // Collection entry
  await db.exec(
    `CREATE TABLE IF NOT EXISTS collection_entry(
        id INTEGER PRIMARY KEY ASC,
        collection_id INTEGER NOT NULL,
        path TEXT NOT NULL,
        CONSTRAINT fk_collection
          FOREIGN KEY (collection_id)
          REFERENCES collection(id)
          ON DELETE CASCADE
      )`
  );

  // Media status
  await db.exec(
    `CREATE TABLE IF NOT EXISTS mediastatus(
        id INTEGER PRIMARY KEY ASC,
        file_name TEXT NOT NULL,
        current_time TEXT,
        finsihed INTEGER
      )`
  );
}

// Get scripts folder
function getScriptFolder() {
  let mpvHome;

  if (os.platform() === "win32") {
    // TODO Get appdata
    mpvHome =
      process.env["MPV_HOME"] ||
      path.join(os.homedir(), "AppData", "Roaming", "mpv");
  } else {
    mpvHome = process.env["MPV_HOME"];
    if (!mpvHome) {
      const xdgConfigHome =
        process.env["XDG_CONFIG_HOME"] || `${os.homedir()}/.config`;
      mpvHome = path.join(xdgConfigHome, "mpv");
    }
  }

  return path.join(mpvHome, "scripts");
}

async function main() {
  try {
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });
    await db.get("PRAGMA foreign_keys=on;");
    await init_tables();
    await mpv.start();
    console.log("Success!");
  } catch (error) {
    // handle errors here
    console.log(error);
  }
}

main();
