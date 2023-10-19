import { Router } from "express";
import { mpvControlsService } from "../remoteServer.js";

export const playlistRouter = Router();
playlistRouter.get("/playlist", async (req, res) => {
  try {
    return res.json(await mpvControlsService.getPlaylist());
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc.message });
  }
});

playlistRouter.post("/playlist", async (req, res) => {
  try {
    await mpvControlsService.addPlaylistItem(req.body);
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc.message });
  }
});

playlistRouter.post("/playlist/remove/:index", async (req, res) => {
  try {
    await mpvControlsService.mpv.playlistRemove(req.params.index);
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc.message });
  }
});

playlistRouter.post("/playlist/move", async (req, res) => {
  try {
    if (!req.query.fromIndex)
      return res
        .status(400)
        .json({ message: "fromIndex query param required!" });
    if (!req.query.toIndex)
      return res.status(400).json({ message: "toIndex query param required!" });

    await mpvControlsService.mpv.playlistMove(
      req.query.fromIndex,
      req.query.toIndex
    );
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc.message });
  }
});

playlistRouter.post("/playlist/play/:index", async (req, res) => {
  try {
    await mpvControlsService.mpv.command("playlist-play-index", [
      req.params.index,
    ]);
    await mpvControlsService.mpv.play();
    return res.json(await mpvControlsService.getPlaylist());
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc.message });
  }
});

playlistRouter.post("/playlist/clear", async (req, res) => {
  try {
    await mpvControlsService.mpv.clearPlaylist();
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc.message });
  }
});

playlistRouter.post("/playlist/shuffle", async (req, res) => {
  try {
    await mpvControlsService.mpv.shuffle();
    return res.json({ message: "success" });
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc.message });
  }
});
