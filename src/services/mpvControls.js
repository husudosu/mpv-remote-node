import { lstatSync, promises as fs_async } from "fs";
import path from "path";

import mpvAPI from "node-mpv-2";

import { settings, FILE_LOCAL_OPTIONS_PATH } from "../settings.js";
import { VERSION } from "../remoteServer.js";
import {
  handle,
  asyncCallWithTimeout,
  stringIsAValidUrl,
  formatTime,
} from "../util.js";
import { FileBrowserService } from "./filebrowser.js";

export class MPVControlsService {
  /**
   * Creates a MPV Controller
   * @param {mpvAPI} mpv MPV API Object.
   */
  constructor(mpv) {
    this.mpv = mpv;
    this.cachedProps = {};

    // Activate hooks for MPV

    // On seek
    this.mpv.on("seek", async (data) => {
      await this.showOSDMessage(`Seek: ${formatTime(data.end)}`);
    });

    // On Status change
    this.mpv.on("status", async (status) => this.onStatusChange(status));
  }

  /**
   * On status change hook.
   * @param {*} status
   */
  async onStatusChange(status) {
    try {
      switch (status.property) {
        case "pause":
          await this.showOSDMessage(status.value ? "Pause" : "Play");
          break;
        case "volume":
          await this.showOSDMessage(`Volume: ${status.value}%`);
          break;
        case "mute":
          let volume = await this.mpv.getProperty("volume");
          await this.showOSDMessage(status.value ? "Mute" : `Volume ${volume}`);
          break;
        case "playlist-count":
        case "playlist-pos":
          break;
        case "path":
          const playerData = await this.getMPVProps();
          if (status.value) {
            // Reset subdelay to 0
            await this.mpv.setProperty("sub-delay", 0);
            // Also reset audio delay to 0
            await this.mpv.adjustAudioTiming(0);
            await this.showOSDMessage(
              `Playing: ${playerData["media-title"] || playerData.filename}`
            );
          }
          break;
      }
    } catch (exc) {
      console.error(exc);
    }
  }

  /**
   * Get various properties from MPV
   * @param {*} exclude Exclude properties (mostly used for response time optimization.)
   * @returns Properties.
   */
  async getMPVProps(exclude = []) {
    let retval = {};
    let props = {
      pause: false,
      mute: false,
      filename: null,
      duration: 0,
      position: 0,
      remaining: 0,
      "media-title": null,
      chapter: 0,
      volume: 0,
      "volume-max": 100,
      fullscreen: false,
      speed: 1,
      "sub-delay": 0,
      "sub-visibility": true,
      "audio-delay": 0,
      "sub-font-size": 55,
      "sub-ass-override": "no",
      playlist: [],
      "chapter-list": [],
      "track-list": [],
      metadata: {},
      "current-chapter": 0,
    };

    /* TODO: Find better method to exclude  current-chapter.
    current-chapter not MPV included property, it's created by mpv-remote-node.
    In some case MPV can't detect chapter correctly, that's why current-chapter property exists.
    */
    exclude.push("current-chapter");

    for (const key of Object.keys(props)) {
      if (!exclude.includes(key)) {
        const val = (await this.getMPVProp(key)) || props[key];
        retval[key] = val;
      }
    }

    // Decide current chapter.
    if (retval["chapter-list"].length > 0) {
      for (let i = 0; i < retval["chapter-list"].length; i++) {
        if (retval.position >= retval["chapter-list"][i].time) {
          retval["current-chapter"] = i;
        }
      }
    }

    return retval;
  }

  /**
   * Gets info regarding MPV and MPV-remote
   * @returns Info object.
   */
  async getMPVInfo() {
    return {
      "ffmpeg-version": await handle(this.mpv.getProperty("ffmpeg-version"))
        .then((resp) => resp[0])
        .catch(() => null),
      "mpv-version": await handle(this.mpv.getProperty("mpv-version"))
        .then((resp) => resp[0])
        .catch(() => null),
      "libass-version": await handle(this.mpv.getProperty("libass-version"))
        .then((resp) => resp[0])
        .catch(() => null),
      mpvremoteConfig: settings,
      mpvremoteVersion: VERSION,
    };
  }

  /**
   * Gets property from MPV.
   * @param {*} key Key to get.
   * @returns Result
   */
  async getMPVProp(key) {
    try {
      switch (key) {
        case "playlist":
          return await this.getPlaylist();
        case "chapter-list":
          return await this.mpv.getChapters();
        case "track-list":
          return await this.getTracks();
        case "metadata":
          return await this.mpv.getMetadata();
        case "position":
          return await this.mpv.getProperty("time-pos");
        case "remaining":
          return await this.mpv.getProperty("time-remaining");
        default:
          return await this.mpv.getProperty(key);
      }
    } catch (exc) {
      if (exc.errmessage != "property unavailable") {
        console.log(exc);
      }
      return null;
    }
  }

  /**
   * Shows an OSD message
   * If it's not disabled on settings.
   * @param {Text} text
   * @param {Number} timeout
   */
  async showOSDMessage(text, timeout = null) {
    if (settings.osdMessages) {
      if (timeout) return await this.mpv.command("show-text", [text, timeout]);
      else return await this.mpv.command("show-text", [text]);
    } else {
      console.log(`OSD message: ${text}`);
    }
  }

  /**
   * Gets status of MPV.
   * @param {*} query Query from Node.JS request.
   * @returns Status of MPV.
   */
  async getStatus(query) {
    const result = await asyncCallWithTimeout(
      this.getMPVProps(query.exclude),
      500
    );
    // Returning cached properties if the CPU usage high.
    this.cachedProps = Object.assign(this.cachedProps, result);
    return result;
  }

  /**
   * Gets playlist items.
   * @returns Playlist as an array.
   */
  async getPlaylist() {
    const count = await this.mpv.getProperty("playlist-count");
    let playlist = [];
    for (let i = 0; i < count; i++) {
      try {
        let item = {
          index: i,
          id: await handle(this.mpv.getProperty(`playlist/${i}/id`)).then(
            (resp) => resp[0]
          ),
          filePath: await handle(
            this.mpv.getProperty(`playlist/${i}/filename`)
          ).then((resp) => resp[0]),
          current: await handle(
            this.mpv.getProperty(`playlist/${i}/current`)
          ).then((resp) => resp[0]),
          title: await handle(this.mpv.getProperty(`playlist/${i}/title`)).then(
            (resp) => resp[0]
          ),
        };
        if (item.filePath) item.filename = path.basename(item.filePath);
        playlist.push(item);
      } catch (exc) {
        console.log(exc);
      }
    }
    return playlist;
  }

  /**
   * Gets tracks.
   * @returns Tracks as an array.
   */
  async getTracks() {
    const count = await this.mpv.getProperty("track-list/count");
    let tracks = [];
    for (let i = 0; i < count; i++) {
      try {
        let track = {
          index: i,
          id: await handle(this.mpv.getProperty(`track-list/${i}/id`)).then(
            (resp) => resp[0]
          ),
          type: await handle(this.mpv.getProperty(`track-list/${i}/type`)).then(
            (resp) => resp[0]
          ),
          selected: await handle(
            this.mpv.getProperty(`track-list/${i}/selected`)
          ).then((resp) => resp[0]),
          codec: await handle(
            this.mpv.getProperty(`track-list/${i}/codec`)
          ).then((resp) => resp[0]),
        };
        // Get specific stuff
        if (track.type === "video") {
          // TODO: Refactor this to getVideoTrackInfo method
          track["demux-w"] = await handle(
            this.mpv.getProperty(`track-list/${i}/demux-w`)
          ).then((resp) => resp[0]);
          track["demux-h"] = await handle(
            this.mpv.getProperty(`track-list/${i}/demux-h`)
          ).then((resp) => resp[0]);
        } else if (track.type === "audio") {
          // TODO: Refactor this to getAudioTrackInfo method
          track["demux-channel-count"] = await handle(
            this.mpv.getProperty(`track-list/${i}/demux-channel-count`)
          ).then((resp) => resp[0]);
          track["demux-channels"] = await handle(
            this.mpv.getProperty(`track-list/${i}/demux-channels`)
          ).then((resp) => resp[0]);
          track["demux-samplerate"] = await handle(
            this.mpv.getProperty(`track-list/${i}/demux-samplerate`)
          ).then((resp) => resp[0]);
          track["demux-bitrate"] = await handle(
            this.mpv.getProperty(`track-list/${i}/demux-bitrate`)
          ).then((resp) => resp[0]);
          track.lang = await handle(
            this.mpv.getProperty(`track-list/${i}/lang`)
          ).then((resp) => resp[0]);
          track["external-filename"] = await handle(
            this.mpv.getProperty(`track-list/${i}/external-filename`)
          ).then((resp) => resp[0]);
        } else if (track.type === "sub") {
          // TODO: Refactor this to getSubTrackInfo method
          track.lang = await handle(
            this.mpv.getProperty(`track-list/${i}/lang`)
          ).then((resp) => resp[0]);
          track["external-filename"] = await handle(
            this.mpv.getProperty(`track-list/${i}/external-filename`)
          ).then((resp) => resp[0]);
        }
        tracks.push(track);
      } catch (exc) {
        console.error(exc);
      }
    }
    return tracks;
  }

  /**
   * Writes file local options into temp.
   * file-local-options beign used for example aniyomi playback.
   * @param {*} options
   */
  async writeFileLocalOptions(options) {
    await fs_async.writeFile(
      FILE_LOCAL_OPTIONS_PATH,
      JSON.stringify(options),
      "utf-8"
    );
  }

  /**
   * Reads file local options from temp.
   * @returns JSON content of File local options file.
   */
  async readFileLocalOptions() {
    const content = await fs_async.readFile(FILE_LOCAL_OPTIONS_PATH, "utf-8");
    return JSON.parse(content);
  }

  /**
   * Adds an item to the playlist.
   * @param {*} reqBody Request body.
   */
  async addPlaylistItem(reqBody) {
    if (!reqBody.flag) reqBody.flag = "append-play";
    if (
      !stringIsAValidUrl(reqBody.filename) &&
      lstatSync(reqBody.filename).isDirectory()
    ) {
      for (const item of await fs_async.readdir(reqBody.filename)) {
        let type = FileBrowserService.detectFileType(path.extname(item));
        if (type === "video" || type == "audio") {
          await this.mpv.load(item, "append-play");
        }
      }
    } else {
      if (reqBody["file-local-options"]) {
        let fileLocalOptions = await this.readFileLocalOptions();
        fileLocalOptions[reqBody.filename] = reqBody["file-local-options"];
        // Have to write cach file here
        await this.writeFileLocalOptions(fileLocalOptions);
      }
      await this.mpv.load(reqBody.filename, reqBody.flag);
      if (reqBody.seekTo) {
        await this.mpv.seek(reqBody.seekTo, "absolute");
      }
    }
  }
}
