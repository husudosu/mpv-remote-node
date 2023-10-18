import { Router } from "express";

import { mpvControlsService } from "../remoteServer.js";

export const tracksRouter = Router();

tracksRouter.get("/tracks", async (req, res) => {
  try {
    return res.json(await mpvControlsService.getTracks());
  } catch (exc) {
    console.log(exc);
    return res.status(500).json({ message: exc });
  }
});

/*
  AUDIO TRACKS
*/
tracksRouter.post("/tracks/audio/reload/:id", async (req, res) => {
  try {
    await mpvControlsService.mpv.selectAudioTrack(req.params.id);
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

tracksRouter.post("/tracks/audio/cycle", async (req, res) => {
  try {
    await mpvControlsService.mpv.cycleAudioTracks();
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

tracksRouter.post("/tracks/audio/add", async (req, res) => {
  try {
    if (!req.body.flag) req.body.flag = "select";
    await mpvControlsService.mpv.addAudioTrack(
      req.body.filename,
      req.body.flag
    );
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

tracksRouter.post("/tracks/audio/timing/:seconds", async (req, res) => {
  try {
    await mpvControlsService.mpv.adjustAudioTiming(req.params.seconds);
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

/*
  SUB TRACKS
*/
tracksRouter.post("/tracks/sub/timing/:seconds", async (req, res) => {
  try {
    await mpvControlsService.mpv.adjustSubtitleTiming(req.params.seconds);
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

tracksRouter.post("/tracks/sub/ass-override/:value", async (req, res) => {
  try {
    await mpvControlsService.mpv.setProperty(
      "sub-ass-override",
      req.params.value
    );
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

tracksRouter.post("/tracks/sub/font-size/:size", async (req, res) => {
  try {
    await mpvControlsService.mpv.setProperty("sub-font-size", req.params.size);
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

tracksRouter.post("/tracks/sub/toggle-visibility", async (req, res) => {
  try {
    await mpvControlsService.mpv.toggleSubtitleVisibility();
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

tracksRouter.post("/tracks/sub/visibility/:value", async (req, res) => {
  try {
    let val = req.params.value.toLowerCase() == "true" ? true : false;
    await mpvControlsService.mpv.setProperty("sub-visibility", val);
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

tracksRouter.post("/tracks/sub/add", async (req, res) => {
  try {
    // TODO: title, lang
    if (!req.body.flag) req.body.flag = "select";
    await mpvControlsService.mpv.addSubtitles(req.body.filename, req.body.flag);
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

tracksRouter.post("/tracks/sub/reload/:id", async (req, res) => {
  try {
    await mpvControlsService.mpv.selectSubtitles(req.params.id);
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});
