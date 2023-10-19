import { lstatSync, existsSync, promises as fs_async } from "fs";
import { sep, join, extname, basename, resolve } from "path";
import { getDiskInfo } from "node-disk-info";

import { FILE_FORMATS } from "../fileformats.js";
import { MediaStatusCRUD } from "../crud.js";
import { settings } from "../settings.js";
import { HTTPException } from "../util.js";
import { CollectionCRUD } from "../crud.js";

class FileBrowser {
  /**
   * Detects file format based on extension
   * @param {*} extension File extension
   * @returns
   */
  detectFileType(extension) {
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

  /**
   * Gets directory contents.
   * @param {*} qpath
   * @returns  List of directory contents.
   */
  async getDirectoryContents(qpath) {
    // TODO Handle exceptions
    let content = [];
    let mediaStatus = [];

    // Add path seperator to qpath end
    /*
        Interesting because C: (System partition) needs a path seperator to work correctly,
        but for my network drives works without path sep.
    */
    if (qpath[qpath.length - 1] != sep) qpath += sep;

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
          let fileType = this.detectFileType(extname(item));
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
              entry.mediaStatus = mediaStatus.find(
                (el) => el.file_name == item
              );

            content.push(entry);
          }
        }
      } catch (exc) {
        console.error(exc);
      }
    }
    return content;
  }

  /**
   * Get drives if unsafe file browsing enabled
   * @returns Drive list.
   */
  async getDrives() {
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
      return disks;
    } else
      throw new HTTPException("mpvremote-unsafefilebrowsing disabled!", 403);
  }

  /**
   * Get directory contents based on path
   * @param {Text} path
   * @returns Contents of directory as array.
   */
  async getPath(path) {
    let retval = {};
    // If unsafe filebrowsing disabled we've to check FILEBROWSER_PATHS
    if (!settings.unsafefilebrowsing) {
      let fbe = settings.filebrowserPaths.find((el) => {
        return path.includes(el.path);
      });

      if (!fbe)
        throw new HTTPException(
          `Path not exists on filebrowserpaths: ${path}`,
          400
        );
    }

    if (!existsSync(path)) {
      throw new HTTPException("Path not exists!", 404);
    }
    // Get files from directory
    retval.content = await this.getDirectoryContents(path);
    retval.dirname = basename(path);
    retval.prevDir = resolve(path, "..");
    retval.cwd = path;

    return retval;
  }

  /**
   * Get files, directories from collection
   * @param {Number} collectionId Collection ID.
   * @returns An object with content and errors.
   */
  async getCollectionFiles(collectionId) {
    let retval = {};
    let collection = await CollectionCRUD.getCollections(collectionId);
    if (!collection) {
      throw new HTTPException("Collection not exists!", 404);
    }
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
          const dir = await this.getDirectoryContents(item.path);
          retval.content = [...retval.content, ...dir];
        } else {
          retval.errors.push(`Path not exists ${item.path}`);
        }
      })
    );
    retval.collection_id = collectionId;

    return retval;
  }
}

export const FileBrowserService = new FileBrowser();
