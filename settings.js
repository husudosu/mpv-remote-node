const os = require("os");

const CORSOPTIONS = {
  origin: "*",
  methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
};

let settings = {
  serverIP: Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i.family == "IPv4" && !i.internal).address,
  serverPort: null,
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
  settings.serverPort = argv.webport;
  settings.uselocaldb = argv.uselocaldb;
  settings.unsafefilebrowsing = argv.unsafefilebrowsing;
  settings.verbose = argv.verbose;

  if (argv.filebrowserpaths) {
    settings.filebrowserPaths = argv.filebrowserpaths.map((el, index) => {
      return {
        index,
        path: el,
      };
    });
  }
}

exports.loadSettings = loadSettings;
exports.settings = settings;
exports.CORSOPTIONS = CORSOPTIONS;
