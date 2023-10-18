import path from "path";
import os from "os";
import fs from "fs";

import sqlite3 from "sqlite3";
import { open } from "sqlite";

let db;

export class NotFoundException {
  constructor(message) {
    this.message = message || "Object not found";
    this.name = "NotFoundException";
  }
}

// Get scripts folder
const getScriptFolder = () => {
  let mpvHome;

  if (os.platform() === "win32") {
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
};

const DB_PATH = path.join(getScriptFolder(), "mpvremote", "remote.db");

const init_tables = async () => {
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
        directory TEXT,
        file_name TEXT NOT NULL,
        current_time REAL,
        finished INTEGER
      )`
  );
};

export const initDB = async () => {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
  await db.get("PRAGMA foreign_keys=on;");
  await init_tables();
};

class MediaStatus {
  async getMediastatusEntries(filepath = null, directory = null) {
    /*
    filepath: Gets entry for a single file path
    directory: Gets entries for a directory
  */
    try {
      if (filepath != null) {
        // If last char is path.sep remove it
        if (filepath[filepath.length - 1] == path.sep)
          filepath = filepath.slice(0, -1);
        let spl = filepath.split(path.sep);
        const fileName = spl[spl.length - 1];
        spl.pop();

        const directory = spl.join(path.sep);
        return await db.get(
          "SELECT * FROM mediastatus WHERE directory=? AND file_name=? ORDER BY file_name",
          [directory, fileName]
        );
      } else if (directory != null) {
        // directory = directory.split(path.sep);
        if (directory[directory.length - 1] == path.sep)
          directory = directory.slice(0, -1);
        const entries = await db.all(
          "SELECT * FROM mediastatus WHERE directory=? ORDER BY file_name",
          [directory]
        );
        return entries;
      } else {
        return await db.all("SELECT * FROM mediastatus");
      }
    } catch (exc) {
      console.log(exc);
    }
  }

  async createMediaStatusEntry(filepath, time, finished) {
    try {
      const statusEntry = await this.getMediastatusEntries(filepath);

      let spl = filepath.split(path.sep);
      const fileName = spl[spl.length - 1];
      spl.pop();

      const directory = spl.join(path.sep);

      // Update status
      if (statusEntry) {
        await db.run(
          "UPDATE mediastatus set current_time=?, finished=? WHERE directory=? AND file_name=?",
          [time, finished, directory, fileName]
        );
      } else {
        await db.run(
          "INSERT INTO mediastatus (current_time, finished, directory, file_name) VALUES (?, ?, ?, ?)",
          [time, finished, directory, fileName]
        );
      }
    } catch (exc) {
      console.log(exc);
    }
  }
  async addMediaStatusEntry(filepath, time, percentPos) {
    /* 
  If percentPos 90% consider file finished
  If <= 5% don't save status to database.
  */
    let finished = 0;
    percentPos = parseFloat(percentPos);
    time = parseFloat(time);

    if (percentPos >= 90) finished = 1;
    else if (percentPos <= 5) return;

    await this.createMediaStatusEntry(filepath, time, finished);
    // Check if entry already exists
  }
}

class Collection {
  validateEntry(data) {
    if (!fs.existsSync(data.path)) {
      throw new NotFoundException(`${data.path} not exists.`);
    }
  }

  async createCollection(data) {
    // Validate entry path
    // if (data.paths && data.paths.length > 0) {
    //   data.paths.forEach((el) => {
    //     validateEntry(el);
    //   });
    // }

    const dbres = await db.run(
      "INSERT INTO collection (name, type) VALUES (?, ?)",
      data.name,
      data.type || 1
    );

    // Get new object
    let collection = await db.get(
      "SELECT * FROM collection WHERE id=?",
      dbres.lastID
    );
    collection.paths = [];
    if (data.paths && data.paths.length > 0) {
      data.paths.forEach(async (element) => {
        const entry = await CollectionEntryCRUD.createCollectionEntry(
          collection.id,
          element
        );
        collection.paths.push(entry);
      });
    }

    return collection;
  }

  async getCollections(id = null) {
    if (id) {
      let collection = await db.get("SELECT * FROM collection WHERE id=?", id);

      if (collection) {
        collection.paths = await CollectionEntryCRUD.getCollectionEntries(
          collection.id
        );
        return collection;
      } else {
        return null;
      }
    } else {
      let collections = await db.all("SELECT * FROM collection");
      return collections;
    }
  }

  async updateCollection(id, data) {
    // Validate entry paths.
    // TODO: Rollbacking on validation error would be better.
    // if (data.paths && data.paths.length > 0) {
    //   data.paths.forEach((el) => {
    //     validateEntry(el);
    //   });
    // }

    let collection = await db.get("SELECT * FROM collection WHERE id=?", id);
    if (!collection) throw new NotFoundException("Collection not exists.");
    // Update collection
    await db.run(
      "UPDATE collection SET name=COALESCE(?, name), type=COALESCE(?, type) WHERE id=?",
      [data.name, data.type, id]
    );
    // Update paths
    if (data.paths) {
      data.paths.forEach(async (element) => {
        // Add collection entry
        if (!element.id)
          await CollectionEntryCRUD.createCollectionEntry(
            collection.id,
            element
          );
        // Update path
        else
          await CollectionEntryCRUD.updateCollectionEntry(element.id, element);
      });
    }
    return await this.getCollections(id);
  }

  async deleteCollection(id) {
    const collection = this.getCollections(id);
    if (!collection) throw new NotFoundException("Collection not exists.");
    await db.run("DELETE FROM collection WHERE id=?", id);
  }
}

class CollectionEntry {
  async createCollectionEntry(collection_id, data) {
    // Check if collection exists
    const collectionExists = await CollectionCRUD.getCollections(collection_id);
    if (!collectionExists)
      throw new NotFoundException("Collection not exists.");

    const dbres = await db.run(
      "INSERT INTO collection_entry (collection_id, path) VALUES (?, ?)",
      collection_id,
      data.path
    );
    const collection_entry = await db.get(
      "SELECT * FROM collection_entry WHERE id=?",
      dbres.lastID
    );
    return collection_entry;
  }

  async getCollectionEntries(collection_id) {
    return await db.all(
      "SELECT * FROM collection_entry WHERE collection_id=?",
      collection_id
    );
  }

  async getCollectionEntry(id) {
    return await db.get("SELECT * FROM collection_entry WHERE id=?", id);
  }

  async updateCollectionEntry(id, data) {
    const collectionEntry = await this.getCollectionEntry(id);
    if (!collectionEntry)
      throw new NotFoundException("Collection entry not exists.");
    await db.run(
      "UPDATE collection_entry SET path=COALESCE(?, path) WHERE id=?",
      [data.path, id]
    );

    return await this.getCollectionEntry(id);
  }

  async deleteCollectionEntry(id) {
    const collectionEntry = await getCollectionEntry(id);
    if (!collectionEntry)
      throw new NotFoundException("Collection entry not exists.");
    await db.run("DELETE FROM collection_entry WHERE id=?", id);
  }
}

export const MediaStatusCRUD = new MediaStatus();
export const CollectionCRUD = new Collection();
export const CollectionEntryCRUD = new CollectionEntry();
