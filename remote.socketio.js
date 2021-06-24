const process = require('process');
const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const server = http.createServer(app, function(req, res){
    res.setHeader("Content-Type", "application/json");
});
const fs_async = require('fs/promises');
const fs = require('fs');
const path = require('path');

const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});
const SERVER_PORT = 8000;
const CORSOPTIONS = {
    origin: '*'
};

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

/* 
File browser on express server
*/

app.get("/fileman", cors(CORSOPTIONS), async(req, res) => {
    let directories = [];
    let files = [];
    let qpath = req.query.path;
    
    if (!fs.existsSync(qpath)) res.status(404).send("Path not exists!");

    for (const item of await fs_async.readdir(qpath)){
        if (fs.lstatSync(path.join(qpath,item)).isDirectory()) {
            directories.push(
                {
                    name: item,
                    fullPath: path.join(qpath, item)
                }
            );
        }
        else {
            files.push({
                name: item,
                fullPath: path.join(qpath, item)
            });
        }
    }
    res.json({dirname: path.basename(qpath), prevDir: path.resolve(qpath, '..'), cwd: qpath, directories, files});
}) 

mpv.on("status", async (status) => {
    console.log(status);
    switch (status.property){
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
        case 'playlist-count':
        case 'playlist-pos':
            io.emit("propChange", {property: "playlist", value: await getPlaylist()});
            break;
        case 'duration':
            playerData = await getMPVProps();
            if (status.value){
                await mpv.command("show-text", [`Playing: ${playerData.media_title || playerData.filename}`]);
                io.emit("playerData", playerData);
            }
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

// FIXME: This causes interval creation. started event
// mpv.on("resumed", async(data) => {
//     console.log(`Started playback ${JSON.stringify(data)}`);
//     io.emit("pause", false);
// });


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
                index: i,
                id: await handle(mpv.getProperty(`track-list/${i}/id`)).then((resp) => resp[0]),
                type: await handle(mpv.getProperty(`track-list/${i}/type`)).then((resp) => resp[0]),
                lang: await handle(mpv.getProperty(`track-list/${i}/lang`)).then((resp) => resp[0]),
                external_filename: await handle(mpv.getProperty(`track-list/${i}/external-filename`)).then((resp) => resp[0]),
                selected: await handle(mpv.getProperty(`track-list/${i}/selected`)).then((resp) => resp[0])
            });
        }
        catch(exc){
            console.log(exc);
        }
    }
    return tracks;
}

async function getPlaylist(){
    const count = await mpv.getProperty("playlist-count");

    let playlist = [];
    for (let i = 0; i < count; i++){
        try {
            playlist.push({
                index: i,
                id: await handle(mpv.getProperty(`playlist/${i}/id`)).then((resp) => resp[0]),
                filename: await handle(mpv.getProperty(`playlist/${i}/filename`)).then((resp) => resp[0]),
                current: await handle(mpv.getProperty(`playlist/${i}/current`)).then((resp) => resp[0]),
                title: await handle(mpv.getProperty(`playlist/${i}/title`)).then((resp) => resp[0]),
            });
        }
        catch (exc){
            console.log(exc);
        }
    }
    return playlist;
}

async function getMPVProps(){
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
        props.playlist = await getPlaylist() || [];
        props.currentTracks = await getCurrentTracks();
    
    } catch (exc) {
        console.log("No playback.");
    }

    return props
}

io.on("connection", (socket) => {
    console.log("User connected");
    // TODO: Create a method for this!
    
    getMPVProps().then((resp) => {
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
        // io.emit('playerData', await getMPVProps());
    });

    socket.on("stopPlayback", async function(data) {
        await mpv.stop();
        // io.emit("playerData", await getMPVProps());
    });

    socket.on("seek", async function(data) {
        try{ await mpv.command("seek", [data, "absolute-percent"]); }
        catch(exc){ console.log(exc); }
    });

    socket.on("tracks", async function(data, cb) {
        let tracks = await getTracks();
        console.log(`Tracks ${JSON.stringify(tracks)}`);
        console.log("Calling callback");
        cb({tracks: await getTracks()});
    });


    // Playlist events
    socket.on("playlistPlayIndex", async function(data) {
        console.log(`Playlist index change: ${JSON.stringify(data)}`);
        await mpv.command("playlist-play-index", [data]);
        await mpv.play();
        // We wait for playlist change.
        // await new Promise((r) => setTimeout(r, 500));
        // Also start playing new file
        // io.emit("playerData", await getMPVProps());
    });
    
    socket.on("playlistMove", async function(data, cb) {
        console.log(`Moving playlist element ${JSON.stringify(data)}`);
        try{
            // let res = await mpv.command("playlist-move", [data.fromIndex, data.toIndex]);
            await mpv.playlistMove(data.fromIndex, data.toIndex);
            cb({playlist: await getPlaylist()});
        }
        catch (exc){
            console.log(exc)
        }
    });

    socket.on("playlistRemove", async function(data){ 
        console.log(`Removing index ${data}`);
        await mpv.playlistRemove(data);
    });

    socket.on("playlistClear", async function(){
        await mpv.clearPlaylist();
    });

    socket.on("playlistNext", async function(){
        await mpv.next();
    });

    socket.on("playlistPrev", async function() {
        await mpv.prev();
    });
    
    socket.on("audioReload", async function(id) {
        await mpv.selectAudioTrack(id);
    });

    socket.on("subReload", async function(id) {
        await mpv.selectSubtitles(id);
    })

    socket.on("adjustSubtitleTiming", async function(seconds){
        await mpv.adjustSubtitleTiming(seconds);
    });

    socket.on("subSettings", async function(data, cb){
        cb({subDelay: await mpv.getProperty('sub-delay')});
    })
});


server.listen(SERVER_PORT, () => {
    console.log(`listening on *:${SERVER_PORT}`);
});


start();