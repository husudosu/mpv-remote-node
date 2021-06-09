"use strict";
// This is the plugin file for MPV

/*Path handling, script idea came from webtorrent plugin :
https://github.com/mrxdst/webtorrent-mpv-hook
ES5 syntax works only.
*/

var platform = mp.utils.getenv("windir") ? "win32": "unix";

function getMPVSocket(){
    var socketName = mp.get_property('input-ipc-server'); 
    
    if (!socketName){        
        // Process node.js module not working, so need to use a trick to get platform.
        // mp.utils.getenv("windir") : Not works
        // mp.utils.get_env_list(): Not works
        // TODO: Need an idea which works here.
        var fname = platform === "win32" ? "\\\\.\\pipe\\mpvremote" : "/tmp/mpvremote";        
        mp.set_property('input-ipc-server', fname);
        // Check socket
        socketName = mp.get_property('input-ipc-server');
    }
    
    // TODO raise error if socket still not exists!
    return socketName;
}


function getScriptPath(){
    var script = mp.get_script_file().replace(/\\/g, '\\\\');
    var p = mp.command_native({
        name: 'subprocess',
        args: ['node', '-p', "require('fs').realpathSync('" + script + "')"],
        playback_only: false,
        capture_stdout: true
    });
    var pathsep = platform === "win32" ? "\\" : "/";
    var s = p.stdout.split(pathsep);
    s[s.length - 1] = "remote.socketio.js";
    return s.join(pathsep);
}

var scriptPath = getScriptPath();
mp.msg.info(scriptPath);
var socketName = getMPVSocket();

mp.command_native_async({
    name: 'subprocess',
    args: ['node', 'C:\\mpv_node\\remote.socketio.js', socketName],
    playback_only: false,
    capture_stderr: true
});
