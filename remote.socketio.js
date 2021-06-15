const process = require('process');
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});
const SERVER_PORT = 8000;


const mpvAPI = require("node-mpv");

const cliArgs = process.argv.slice(2);
const socketName = cliArgs[0];
if (!socketName) {console.log("No socket provided"); process.exit();}


const mpv = new mpvAPI({
    socket: socketName,
    verbose: false
});


async function start(){
    try {
        await mpv.start();
        } catch (error) {
        // handle errors here
        console.log(error);
    }
}

mpv.on("status", async (status) => {
    console.log(status);
    switch (status.property){
        // TODO: Should deprecate pause IO event!
        case 'pause':
            await mpv.command("show-text", [status.value ? 'Pause' : 'Play']);
            io.emit("pause", status.value);
            break;
        case 'volume':
            io.emit("propChange", status);
            await mpv.command("show-text", [`Volume: ${status.value}%`]);
            break;
        case 'mute':
            io.emit("propChange", status)
            let volume = await mpv.getProperty("volume")
            await mpv.command("show-text", [status.value ? "Mute" : `Volume ${volume}`])
            break;
    }
});

/* 
TODO: Implement these
Track change commands:
Change audio track command:
audio-reload <id>

Change video track:
video-reload <id>

Change subtitle:
sub-reload <id>

Command:
sub-step <skip>
Change subtitle timing such, that the subtitle event after the next <skip> subtitle events is displayed. <skip> can be negative to step backwards.


Playlist commands:

playlist-clear
Clear the playlist, except the currently played file.

playlist-remove <index>
Remove the playlist entry at the given index. Index values start counting with 0.
The special value current removes the current entry. Note that removing the current entry also stops playback and starts playing the next entry.

playlist-move <index1> <index2>
Move the playlist entry at index1, so that it takes the place of the entry index2.
(Paradoxically, the moved playlist entry will not have the index value index2 after moving if index1 was lower than index2, 
because index2 refers to the target entry, not the index the entry will have after moving.)

Subtitle options:

--sub-scale=<0-100>
Factor for the text subtitle font size (default: 1).


--sub-ass-force-style=<[Style.]Param=Value[,...]>
    Override some style or script info parameters.

    This is a string list option. See List Options for details.

    Examples

    --sub-ass-force-style=FontName=Arial,Default.Bold=1
    --sub-ass-force-style=PlayResY=768
    Note

    Using this option may lead to incorrect subtitle rendering.

*/

mpv.on("stopped", async() => {
    io.emit("stopped");
});

mpv.on("seek", async (data) => {
    // FIXME: Probably not the best solution
    console.log(data)
    await mpv.command("show-text", [`Seek: ${formatTime(data.end)}`])
    io.emit("playbackTimeResponse", {
        playback_time: formatTime(data.end),
        percent_pos: Math.ceil(await mpv.getProperty("percent-pos"))
    });
});


function formatTime(param){
    var sec_num = parseInt(param);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
}

function handle(promise){
    return promise
        .then((data) => ([data, undefined]))
        .catch((error) => Promise.resolve([undefined, error]));
}

async function getCurrentTracks(){
        return {
            video: await handle(mpv.getProperty(`current-tracks/video`)).then((resp) => resp[0]),
            audio: await handle(mpv.getProperty(`current-tracks/audio`)).then((resp) => resp[0]),
            subtitle: await handle(mpv.getProperty(`current-tracks/sub`)).then((resp) => resp[0]),
        }
}

async function getTracks(){
    const count = await mpv.getProperty("track-list/count");
    let tracks = [];
    for (let i = 0; i < count; i++){
        try{            
            tracks.push({
                id: await handle(mpv.getProperty(`track-list/${i}/id`)).then((resp) => resp[0]),
                type: await handle(mpv.getProperty(`track-list/${i}/type`)).then((resp) => resp[0]),
                lang: await handle(mpv.getProperty(`track-list/${i}/lang`)).then((resp) => resp[0]),
                external_filename: await handle(mpv.getProperty(`track-list/${i}/external-filename`)).then((resp) => resp[0]),
            });
        }
        catch(exc){
            console.log(exc);
        }
    }
    return tracks;
}

async function get_mpv_props(){
    let props = {
        filename: null,
        duration: '00:00:00',
        playback_time: '00:00:00',
        percent_pos: 0,
        media_title: null,
        playlist: [],
        currentTracks: [],
    };

    try {
        props.pause = await mpv.getProperty("pause");
        props.volume = await mpv.getProperty("volume");
        props.mute = await mpv.getProperty("mute");

        // File related data, only send back if available.
        props.filename = await mpv.getProperty("filename");
        props.duration = formatTime(await mpv.getProperty("duration")) || '00:00:00';
        props.playback_time = formatTime(await mpv.getProperty("playback-time")) || '00:00:00';
        props.percent_pos = Math.ceil(await mpv.getProperty("percent-pos")) || 0;
        props.media_title = await mpv.getProperty("media-title");
        props.playlist = await mpv.getProperty("playlist") || [];
        props.currentTracks = await getCurrentTracks();
    
    } catch (exc) {
        console.log("No playback.");
    }

    return props
}

/*
TODO List:
- Exception handling (maybe send to frontned too.)
*/
io.on("connection", (socket) => {
    console.log("User connected");
    // TODO: Create a method for this!
    
    get_mpv_props().then((resp) => {
        socket.emit("playerData", resp);
    });
    // Send duration for new connections.
    socket.on("playbackTime", async function (data) {
        const playbackTime = await mpv.getProperty("playback-time");
        const percentPos = Math.ceil(await mpv.getProperty("percent-pos"));
        socket.emit("playbackTimeResponse", {playback_time: formatTime(playbackTime), percent_pos: percentPos});
    });

    socket.on("setPlayerProp", async function (data){
        try {
            console.log(`Set ${data[0]} to ${data[1]}`);
            await mpv.setProperty(data[0], data[1]);
        }
        catch(exc){
            console.log(exc);
        }
    });
    socket.on("openFile", async function(data) {
        await mpv.load(data.filename, data.appendToPlaylist ? "append-play" : "replace");
        socket.emit('playerData', await get_mpv_props());
    });

    socket.on("stopPlayback", async function(data) {
        await mpv.stop();
        socket.emit("playerData", await get_mpv_props());
    });

    socket.on("seek", async function(data) {
        try{ await mpv.command("seek", [data, "absolute-percent"]); }
        catch(exc){ console.log(exc); }
    });

    socket.on("tracks", async function() {
        socket.emit("tracksResponse", await getTracks());
    });


    // Playlist events
    socket.on("playlistPlayIndex", async function(data) {
        console.log(`Playlist index change: ${JSON.stringify(data)}`);
        await mpv.command("playlist-play-index", [data]);

        // We wait for playlist change.
        await new Promise((r) => setTimeout(r, 500));
        // Also start playing new file
        await mpv.play();
        socket.emit("playerData", await get_mpv_props());
    });
    
    socket.on("playlistMove", async function(data) {
        console.log(`Moving playlist element ${data}`);
        await mpv.command("playlist-move", [data.fromIndex, data.toIndex]);
        // TODO: Playlist changed event
    });

    socket.on("playlistRemove", async function(data){ 
        console.log(`Removing index ${data}`);
        await mpv.command("playlist-remove", data);
        // TODO: Playlist changed event
    })

});


server.listen(SERVER_PORT, () => {
    console.log(`listening on *:${SERVER_PORT}`);
});


start();