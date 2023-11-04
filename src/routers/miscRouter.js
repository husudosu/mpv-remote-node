import { Router } from "express";

import { mpvControlsService } from "../remoteServer.js";
import { miscService } from "../services/misc.js";

export const miscRouter = Router();

miscRouter.get("/mpvinfo", async (req, res) => {
  try {
    res.json(await mpvControlsService.getMPVInfo());
  } catch (exc) {
    console.error(exc);
    return res.status(500).json({ message: exc.message });
  }
});

miscRouter.post("/computer/:action", async (req, res) => {
  try {
    switch (req.params.action) {
      case "shutdown":
      case "reboot":
      case "quit":
        miscService.shutdownAction(req.params.action);
        break;
      default:
        return res.status(400).json({ message: "Invalid action" });
    }
  } catch (exc) {
    console.error(exc);

    return res.status(500).json({ message: exc.message });
  }
});

miscRouter.post("/mpv/custom-command", async (req, res) => {
  try {
    const result = await mpvControlsService.runCustomCommand(req.body);
    return res.json(result ? { result } : { message: "success" });
  } catch (exc) {
    console.log(exc);
    return res.json(500).json({ message: exc.message });
  }
});
