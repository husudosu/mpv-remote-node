import { lstatSync, existsSync, promises as fs_async } from "fs";
import { sep, join, extname, basename, resolve } from "path";

import { FILE_FORMATS } from "../fileformats.js";
import { MediaStatusCRUD } from "../crud.js";
import { settings } from "../settings.js";

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
        console.log(exc);
      }
    }
    return content;
  }
}

export const FileBrowserService = new FileBrowser();
