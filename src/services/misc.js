import { platform } from "os";
import child_process from "child_process";

import { mpvControlsService } from "../remoteServer.js";

// Computer action commands.
const WIN_SHUTDOWN_COMMAND = "shutdown /s /t 1";
const WIN_REBOOT_COMMAND = "shutdown /r /t 1";
const UNIX_SHUTDOWN_COMMAND = "/usr/sbin/shutdown now";
const UNIX_REBOOT_COMMAND = "/usr/sbin/reboot";

class MiscService {
  async shutdownAction(action) {
    switch (action) {
      case "shutdown":
        // First stop MPV playback to save playback data
        await mpvControlsService.mpv.stop();
        child_process.exec(
          platform == "win32" ? WIN_SHUTDOWN_COMMAND : UNIX_SHUTDOWN_COMMAND
        );
        break;
      case "reboot":
        await mpvControlsService.mpv.stop();
        child_process.exec(
          platform == "win32" ? WIN_REBOOT_COMMAND : UNIX_REBOOT_COMMAND
        );
        break;
      case "quit":
        await mpvControlsService.mpv.stop();
        break;
    }
  }
}

export const miscService = new MiscService();
