import { lstatSync, existsSync, promises as fs_async } from "fs";
import { sep, join, extname, basename, resolve } from "path";
import { getDiskInfo } from "node-disk-info";

import { Router } from "express";

import { settings } from "./settings.js";
import { FILE_FORMATS } from "./fileformats.js";
import { MediaStatusCRUD, CollectionCRUD } from "./crud.js";

const router = Router();

export const detectFileType = (extension) => {
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
};

export const getDirectoryContents = async (qpath) => {
  // TODO Handle exceptions
  let content = [];

  // Add path seperator to qpath end
  /*
  Interesting because C: (System partition) needs a path seperator to work correctly,
  but for my network drives works without path sep.
  */
  if (qpath[qpath.length - 1] != sep) qpath += sep;
  let mediaStatus = [];

  if (settings.uselocaldb)
    mediaStatus = await MediaStatusCRUD.getMediastatusEntries(null, qpath);

  for (const item of await fs_async.readdir(qpath)) {
    try {
      if (lstatSync(join(qpath, item)).isDirectory()) {
        let entry = {
          priority: 1,
          type: "directory",
          name: item,
          fullPath: join(qpath, item),
        };
        entry.lastModified = await fs_async
          .stat(entry.fullPath)
          .then((stat) => stat.mtime)
          .catch(() => null);

        content.push(entry);
      } else {
        let fileType = detectFileType(extname(item));
        // Render only media, sub types.
        if (fileType !== "file") {
          let entry = {
            priority: 2,
            type: fileType,
            name: item,
            fullPath: join(qpath, item),
          };
          entry.lastModified = await fs_async
            .stat(entry.fullPath)
            .then((stat) => stat.mtime)
            .catch(() => null);
          if (settings.uselocaldb)
            entry.mediaStatus = mediaStatus.find((el) => el.file_name == item);

          content.push(entry);
        }
      }
    } catch (exc) {
      console.log(exc);
    }
  }
  return content;
};

router.get("/drives", async (req, res) => {
  try {
    if (settings.unsafefilebrowsing) {
      let disks = await getDiskInfo();
      // ignore snap, flatpak stuff linux
      disks = disks.filter(
        (disk) =>
          !disk._mounted.includes("snap") && !disk._mounted.includes("flatpak")
      );
      disks = disks.map((disk) => {
        return {
          path: disk._mounted,
        };
      });
      return res.json(disks);
    } else
      return res
        .status(403)
        .json({ message: "mpvremote-unsafefilebrowsing disabled!" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: exc });
  }
});

router.get("/filebrowser/paths", async (req, res) => {
  try {
    return res.json(settings.filebrowserPaths);
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

router.post("/filebrowser/browse", async (req, res) => {
  try {
    let p = req.body.path;
    let collectionId = req.body.collection_id;

    // Find FILEBROWSER_PATH entry
    if (!p && !collectionId)
      return res
        .status(400)
        .json({ message: "path or collection id missing from request data!" });

    let retval = {};
    if (p) {
      // If unsafe filebrowsing disabled we've to check FILEBROWSER_PATHS
      if (!settings.unsafefilebrowsing) {
        let fbe = settings.filebrowserPaths.find((el) => {
          return p.includes(el.path);
        });

        if (!fbe)
          return res
            .status(400)
            .send({ message: `Path not exists on filebrowserpaths: ${p}` });
      }

      if (!existsSync(p))
        return res.status(404).send({ message: "Path not exists!" });
      // Get files from directory

      retval.content = await getDirectoryContents(p);
      retval.dirname = basename(p);
      retval.prevDir = resolve(p, "..");
      retval.cwd = p;
    } else if (collectionId) {
      // Get collection contents if local database enabled!
      if (!settings.uselocaldb)
        return res
          .status(400)
          .send({ message: "mpvremote-uselocaldb is disabled!" });

      let collection = await CollectionCRUD.getCollections(collectionId);
      if (!collection) return res.status(404).send("Collection not exists!");
      retval.content = [];
      retval.errors = [];
      await Promise.all(
        collection.paths.map(async (item) => {
          // Check if exists on filebrowserpaths
          if (!settings.unsafefilebrowsing) {
            let fbe = settings.filebrowserPaths.find((el) => {
              return item.path.includes(el.path);
            });
            if (!fbe) {
              console.log(`Not exists on filebrowserpaths: ${item.path}`);
              retval.errors.push(
                `Not exists on filebrowserpaths: ${item.path}`
              );
            }
          } else if (existsSync(item.path)) {
            const dir = await getDirectoryContents(item.path);
            retval.content = [...retval.content, ...dir];
          } else {
            console.log(`Path not exists ${item.path}`);
          }
        })
      );
      retval.collection_id = collectionId;
    }

    // Sort content firstly by priority and alphabet order.
    retval.content.sort((a, b) => {
      return (
        a.priority - b.priority ||
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
    });

    return res.json(retval);
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

export default router;
