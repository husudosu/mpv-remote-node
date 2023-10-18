import { Router } from "express";
const router = Router();
import {
  CollectionCRUD,
  CollectionEntryCRUD,
  NotFoundException,
} from "../crud.js";

import { settings } from "../settings.js";

// Base URL: /api/v1/collections

router.use(function checkUseLocalDB(req, res, next) {
  if (!settings.uselocaldb) {
    return res.status(400).json({
      error: "mpvremote-uselocaldb disabled!",
    });
  } else {
    next();
  }
});

router.get("/:id?", async (req, res) => {
  try {
    if (req.params.id) {
      const collection = await CollectionCRUD.getCollections(req.params.id);
      if (!collection)
        return res.status(404).json({ message: "Collection not exists" });
      return res.json(collection);
    } else {
      return res.json(await CollectionCRUD.getCollections());
    }
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

router.post("", async (req, res) => {
  // TODO Some validation.
  try {
    const collection = await CollectionCRUD.createCollection(req.body);
    return res.json(collection);
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

router.patch("/:collection_id/", async (req, res) => {
  try {
    return res.json(
      await CollectionCRUD.updateCollection(req.params.collection_id, req.body)
    );
  } catch (exc) {
    if (exc instanceof NotFoundException)
      return res.status(404).json({ message: exc.message });
    else {
      console.log(exc);
      return res.status(500).json({ message: exc });
    }
  }
});

router.delete("/:collection_id/", async (req, res) => {
  try {
    const collection_id = req.params.collection_id;
    CollectionCRUD.deleteCollection(collection_id);
    return res.json({});
  } catch (exc) {
    return res.status(500).json({ message: exc });
  }
});

router.post("/:collection_id/entries/", async (req, res) => {
  try {
    const collection_entry = await CollectionEntryCRUD.createCollectionEntry(
      req.params.collection_id,
      req.body
    );
    return res.json(collection_entry);
  } catch (exc) {
    if (exc instanceof NotFoundException)
      return res.status(404).json({ message: exc.message });
    else return res.status(500).json({ message: exc });
  }
});

router.delete("/entries/:id", async (req, res) => {
  try {
    CollectionEntryCRUD.deleteCollectionEntry(req.params.id);
    return res.json({});
  } catch (exc) {
    if (exc instanceof NotFoundException)
      return res.status(404).json({ message: exc.message });
    else return res.status(500).json({ message: exc });
  }
});

export default router;
