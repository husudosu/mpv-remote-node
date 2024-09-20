const { networkInterfaces } = require("os");
const { readFileSync, existsSync } = require("fs");
const { getMPVHome } = require("./crud");

const path = require("path");

const IP_ADDR = Object.values(networkInterfaces())
  .flat()
  .find((i) => (i.family == "IPv4" || i.family == 4) && !i.internal);

const CORSOPTIONS = {
  origin: "*",
  methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
};

let settings = {
  serverIP: IP_ADDR ? IP_ADDR.address : "127.0.0.1", // Used for displaying the remote access URL
  realServerIP: undefined, // Used for app.listen(). Default is all interfaces
  serverPort: null,
  serverPortRangeEnd: null,
  filebrowserPaths: [],
  socketName: null,
  uselocaldb: false,
  unsafefilebrowsing: false,
  verbose: false,
};

/*
Loads settings
*/
function loadSettings(argv) {
  settings.socketName = argv._[0];
  settings.realServerIP = argv.address;
  // If we have an explicit address, display that instead
  if (argv.address) settings.serverIP = argv.address;
  settings.serverPort = argv.webport;
  settings.serverPortRangeEnd = argv.webportrangeend;
  settings.uselocaldb = argv.uselocaldb;
  settings.unsafefilebrowsing = argv.unsafefilebrowsing;
  settings.verbose = argv.verbose;
  settings.osdMessages = argv["osd-messages"];

  if (argv.filebrowserpaths) {
    settings.filebrowserPaths = argv.filebrowserpaths.map((el, index) => {
      return {
        index,
        path: el.replace(/^"|'+|"|'+$/g, ""),
      };
    });
  }
}

/*
Load default ytdl format,
if it don't exist return empty string
*/
function readDefaultYtdlFormat() {
  const mpvConfigPath = path.join(getMPVHome(), "mpv.conf");
  if (!existsSync(mpvConfigPath)) {
    console.log("No mpv.conf file found");
    return ""
  }

  const ytdlFormatLine = 
    readFileSync(mpvConfigPath, "utf8")
    .split("\n")
    .find((line) => line.includes("ytdl-format"))

  if (!ytdlFormatLine) {
    console.log("No ytdl-format line found in mpv.conf")
    return "";
  }
  const regex = /ytdl-format="(.+?)"/;
  const match = ytdlFormatLine.match(regex);

  if (match) 
    return match[1];
  return "";
}


exports.loadSettings = loadSettings;
exports.settings = settings;
exports.CORSOPTIONS = CORSOPTIONS;
exports.YTDL_DEFAULT_FORMAT = readDefaultYtdlFormat();
