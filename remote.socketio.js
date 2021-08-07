const os = require("os");
const process = require("process");
const fs = require("fs");
const fs_async = require("fs").promises;
const path = require("path");
const URL = require("url").URL;

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const nodeDiskInfo = require("node-disk-info");
const mpvAPI = require("node-mpv");

const FILE_FORMATS = require("./fileformats").FILE_FORMATS;
const {
  initDB,
  createCollection,
  getCollections,
  updateCollection,
  deleteCollection,
  createCollectionEntry,
  deleteCollectionEntry,
  getMediastatusEntries,
} = require("./crud");

// Handle CLI args
const cliArgs = process.argv.slice(2);

const socketName = cliArgs[0];
if (!socketName) {
  console.log("No socket provided");
  process.exit();
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app, function (req, res) {
  res.setHeader("Content-Type", "application/json");
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

const mpv = new mpvAPI({
  socket: socketName,
  verbose: false,
});

function stringIsAValidUrl(s) {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
}

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
  // TODO Handle exceptions
  let content = [];

  // Add path seperator to qpath end
  /*
  Interesting because C: (System partition) needs a path seperator to work correctly,
  but for my network drives works without path sep.
  */
  if (qpath[qpath.length - 1] != path.sep) qpath += path.sep;

  const mediaStatus = await getMediastatusEntries(null, qpath);
  for (const item of await fs_async.readdir(qpath)) {
    try {
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
            mediaStatus: mediaStatus.find((el) => el.file_name == item),
          });
        }
      }
    } catch (exc) {
      console.log(exc);
    }
  }
  return content;
}

app.get("/fileman", cors(CORSOPTIONS), async (req, res) => {
  try {
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
      if (!collection) res.status(404).send("Collection not exists!");
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
  } catch (exc) {
    console.log(exc);
    res.json(500, { error: exc });
  }
});

app.get("/drivelist/", cors(CORSOPTIONS), async (req, res) => {
  try {
    res.json(nodeDiskInfo.getDiskInfoSync());
  } catch (e) {
    console.error(e);
  }
});

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
    const collection = await createCollection(req.body);
    res.json(collection);
  } catch (exc) {
    console.log(exc);
    res.status(422).json({ error: exc });
  }
});

app.options("/collections/:collection_id/", cors(CORSOPTIONS));
app.patch(
  "/collections/:collection_id/",
  cors(CORSOPTIONS),
  async (req, res) => {
    try {
      res.json(await updateCollection(req.params.collection_id, req.body));
    } catch (exc) {
      console.log(exc);
    }
  }
);
app.delete(
  "/collections/:collection_id/",
  cors(CORSOPTIONS),
  async (req, res) => {
    const collection_id = req.params.collection_id;
    try {
      deleteCollection(collection_id);
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
    try {
      const collection_entry = await createCollectionEntry(
        req.params.collection_id,
        req.body
      );
      res.json(collection_entry);
    } catch (exc) {
      res.status(500).json({ error: exc });
    }
  }
);

app.options("/collections/entries/:id", cors(CORSOPTIONS));
app.delete("/collections/entries/:id", cors(CORSOPTIONS), async (req, res) => {
  try {
    deleteCollectionEntry(req.params.id);
    res.json({});
  } catch (exc) {
    res.status(500).json({ error: exc });
  }
});

app.get("/mediastatus", cors(CORSOPTIONS), async (req, res) => {
  try {
    if (req.query.directory) {
      res.json(await getMediastatusEntries(null, req.query.directory));
    } else if (req.query.filepath) {
      res.json(await getMediastatusEntries(req.query.filepath));
    }

    res.json(await getMediastatusEntries());
  } catch (exc) {
    res.status(500).json({ error: exc });
  }
});

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

mpv.on("stopped", async (ev) => {
  const playback = await getMPVProps();
  console.log(playback);
  io.emit("stopped");
});

mpv.on("seek", async (data) => {
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

io.on("connection", async (socket) => {
  console.log("User connected");
  // TODO: Create a method for this!

  getMPVProps().then((resp) => {
    socket.emit("playerData", resp);
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${reason}`);
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
      if (
        !stringIsAValidUrl(data.filename) &&
        fs.lstatSync(data.filename).isDirectory()
      ) {
        for (const item of await fs_async.readdir(data.filename)) {
          let type = detectFileType(path.extname(item));
          if (type === "video" || type == "audio") {
            await mpv.load(item, "append-play");
          }
        }
      } else {
        console.log(data);
        await mpv.load(
          data.filename,
          data.appendToPlaylist ? "append-play" : "replace"
        );
        if (data.seekTo) {
          await mpv.seek(data.seekTo, "absolute");
        }
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
    socket.emit("playerData", await getMPVProps());
  });

  socket.on("subReload", async function (id) {
    await mpv.selectSubtitles(id);
    socket.emit("playerData", await getMPVProps());
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

async function main() {
  try {
    await mpv.start();
    await initDB();
  } catch (error) {
    // handle errors here
    console.log(error);
  }
}

main();
