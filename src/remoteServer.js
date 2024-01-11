import { existsSync } from "fs";

import yargs from "yargs";
import { getPortPromise } from "portfinder";
import express, { json, Router } from "express";
import cors from "cors";

import { initDB } from "./crud.js";
import {
  loadSettings,
  settings,
  CORSOPTIONS,
  FILE_LOCAL_OPTIONS_PATH,
} from "./settings.js";

import { MPVControlsService } from "./services/mpvControls.js";

import { mpvControlsRouter } from "./routers/mpvControlsRouter.js";
import { tracksRouter } from "./routers/tracksRouter.js";
import collections from "./routers/collectionsRouter.js";
import filebrowser from "./routers/filebrowserRouter.js";

// TODO: Get version from package.json
export const VERSION = "1.0.8";

import mpvAPI from "node-mpv-2";
import { playlistRouter } from "./routers/playlistRouter.js";
import { miscRouter } from "./routers/miscRouter.js";
const argv = yargs(process.argv.slice(2))
  .options({
    address: {
      description: "Server address to listen on",
      type: "string",
    },
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

const mpv = new mpvAPI({
  socket: settings.socketName,
  verbose: settings.verbose,
});
export const mpvControlsService = new MPVControlsService(mpv);

const app = express();
const APIRouter = Router();

app.use(cors(CORSOPTIONS));
app.use(json());

APIRouter.use("/", mpvControlsRouter);
APIRouter.use("/", tracksRouter);
APIRouter.use("/", playlistRouter);
APIRouter.use("/", filebrowser);
APIRouter.use("/collections", collections);
APIRouter.use("/", miscRouter);

app.use("/api/v1", APIRouter);

getPortPromise({
  port: settings.serverPort,
  stopPort: settings.serverPortRangeEnd,
})
  .then((port) => {
    app.listen(port, settings.realServerIP, () => {
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

const main = async () => {
  try {
    // TODO: Creates/clears file local options file.
    await mpvControlsService.mpv.start();
    // Create file-local-options if not exists.
    if (!existsSync(FILE_LOCAL_OPTIONS_PATH))
      mpvControlsService.writeFileLocalOptions({});
    if (settings.uselocaldb) {
      await initDB();
    }

    await mpvControlsService.showOSDMessage(
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
  console.error("unhandledRejection", JSON.stringify(error));
});
