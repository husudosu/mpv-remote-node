import { Router } from "express";

import { mpvControlsService } from "../remoteServer.js";
export const mpvControlsRouter = Router();

mpvControlsRouter.get("/mpvinfo", async (req, res) => {
  try {
    res.json(await mpvControlsService.getMPVInfo());
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

mpvControlsRouter.get("/status", async (req, res) => {
  try {
    return res.json(await mpvControlsService.getStatus(req.query));
  } catch (exc) {
    // In case of timeout we send cached props back.
    if (exc.message == "Async call timeout limit reached")
      return res.json(mpvControlsService.cachedProps);
    else {
      console.error(exc);
      return res.status(500).json({ message: exc });
    }
  }
});

mpvControlsRouter.post("/controls/play-pause", async (req, res) => {
  try {
    await mpvControlsService.mpv.togglePause();
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

mpvControlsRouter.post("/controls/play", async (req, res) => {
  try {
    await mpvControlsService.mpv.play();
    return res.json({ messsage: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

mpvControlsRouter.post("/controls/pause", async (req, res) => {
  try {
    await mpvControlsService.mpv.pause();
    return res.json({ messsage: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

mpvControlsRouter.post("/controls/stop", async (req, res) => {
  try {
    await mpvControlsService.mpv.stop();
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

const playlistPrev = async (req, res) => {
  try {
    await mpvControlsService.mpv.prev();
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
};

const playlistNext = async (req, res) => {
  try {
    await mpvControlsService.mpv.next();
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
};

mpvControlsRouter.post("/controls/prev", playlistPrev);
mpvControlsRouter.post("/playlist/prev", playlistPrev);
mpvControlsRouter.post("/controls/next", playlistNext);
mpvControlsRouter.post("/playlist/next", playlistNext);

mpvControlsRouter.post("/controls/fullscreen", async (req, res) => {
  try {
    await mpvControlsService.mpv.toggleFullscreen();
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

mpvControlsRouter.post("/controls/volume/:value", async (req, res) => {
  try {
    await mpvControlsService.mpv.volume(req.params.value);
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

mpvControlsRouter.post("/controls/mute", async (req, res) => {
  try {
    await mpvControlsService.mpv.mute();
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});

mpvControlsRouter.post("/controls/seek", async (req, res) => {
  try {
    if (!req.body.flag) req.body.flag = "relative";
    await mpvControlsService.mpv.seek(req.body.target, req.body.flag);
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc });
  }
});
