import { existsSync } from "fs";

import { Router } from "express";

import { settings } from "../settings.js";
import { CollectionCRUD } from "../crud.js";
import { FileBrowserService } from "../services/filebrowser.js";
import { HTTPException } from "../util.js";

const router = Router();

router.get("/drives", async (req, res) => {
  try {
    return res.json(await FileBrowserService.getDrives());
  } catch (exc) {
    if (exc instanceof HTTPException) {
      return res.status(exc.statusCode).json({ message: exc.message });
    }
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

router.get("/filebrowser/paths", async (req, res) => {
  try {
    return res.json(settings.filebrowserPaths);
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

const getCollection = async (collectionId) => {
  let retval = {};
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
          retval.errors.push(`Not exists on filebrowserpaths: ${item.path}`);
        }
      } else if (existsSync(item.path)) {
        const dir = await getDirectoryContents(item.path);
        retval.content = [...retval.content, ...dir];
      } else {
        retval.errors.push(`Path not exists ${item.path}`);
      }
    })
  );
  retval.collection_id = collectionId;

  return retval;
};

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
      retval = await FileBrowserService.getPath(p);
    } else if (collectionId) {
      // Get collection contents if local database enabled!
      if (!settings.uselocaldb)
        return res
          .status(400)
          .send({ message: "mpvremote-uselocaldb is disabled!" });
      retval = await getCollection(collectionId);
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
    if (exc instanceof HTTPException) {
      return res.status(exc.statusCode).json({ message: exc.message });
    }
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

export default router;
