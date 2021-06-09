// This is the plugin file for MPV

var platform = mp.utils.getenv("windir") ? "win32": "unix";

function getMPVSocket(){
    var socketName = mp.get_property('input-ipc-server'); 
    
    if (!socketName){        
        // Process node.js module not working, so need to use a trick to get platform.
        var fname = platform === "win32" ? "\\.\pipe\mpvremote" : "/tmp/mpvremote";        
        mp.set_property('input-ipc-server', fname);
        // Check socket
        socketName = mp.get_property('input-ipc-server');
    }
    
    // TODO raise error if socket still not exists!
    return socketName;
}

var socketName = getMPVSocket();

// TODO: Get const path of script.
mp.command_native_async({
    name: 'subprocess',
    args: ['node', '/home/sudosu/projects/mpv_node/main.js', socketName],
    playback_only: false,
    capture_stderr: true
});
