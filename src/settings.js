import path from "path";
import { networkInterfaces, platform } from "os";
import { existsSync } from "fs";
const TEMPDIR = process.env.TEMP || process.env.TMP || "/tmp"; // Temp dir
const DEF_SOCKET_NAME_PREFIX = "mpvsocket";

export const FILE_LOCAL_OPTIONS_PATH = path.join(
  TEMPDIR,
  "file-local-options.txt"
);

export const IP_ADDR = Object.values(networkInterfaces())
  .flat()
  .find((i) => (i.family == "IPv4" || i.family == 4) && !i.internal);

export const CORSOPTIONS = {
  origin: "*",
  methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
};

export let settings = {
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
export const loadSettings = (argv) => {
  settings.socketName = argv._.length === 0 ? createSocketName() : argv._[0];
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
};

/**
 * Creates a socket name if not provided as CLI arg.
 * Returns a socket name.
 */
export const createSocketName = () => {
  const os = platform();
  let i = 0;
  let fname =
    os === "win32"
      ? `\\\\.\\pipe\\${DEF_SOCKET_NAME_PREFIX}`
      : path.join(TEMPDIR, DEF_SOCKET_NAME_PREFIX);

  do {
    if (!existsSync(fname)) break;
    fname =
      os === "win32"
        ? `\\\\.\\pipe\\${DEF_SOCKET_NAME_PREFIX}${i}`
        : path.join(TEMPDIR, DEF_SOCKET_NAME_PREFIX + i);
    i++;
  } while (true);
  return fname;
};
