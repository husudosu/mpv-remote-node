import { Router } from "express";

import { settings } from "../settings.js";
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
    return res.status(500).json({ message: exc.message });
  }
});

router.get("/filebrowser/paths", async (req, res) => {
  try {
    return res.json(settings.filebrowserPaths);
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc.message });
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
      retval = await FileBrowserService.getPath(p);
    } else if (collectionId) {
      // Get collection contents if local database enabled!
      if (!settings.uselocaldb)
        return res
          .status(400)
          .send({ message: "mpvremote-uselocaldb is disabled!" });
      retval = await FileBrowserService.getCollectionFiles(collectionId);
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
    return res.status(500).json({ message: exc.message });
  }
});

export default router;
