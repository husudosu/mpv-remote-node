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
const SERVER_PORT = 8000

// where you import your packages
const mpvAPI = require("node-mpv");
// where you want to initialise the API

// binary: "C:\\Users\\SudoSu\\Downloads\\mpv-x86_64-20210523-git-6c1dd02\\mpv.exe" for windows 10 test
const mpv = new mpvAPI({
    socket: "/tmp/mpv",
    verbose: false
});

// somewhere within an async context
// starts MPV
async function start(){
    try {
        await mpv.start();
        // loads a file
        // await mpv.load("/home/sudosu/test.webm");
        // file is playing
        // sets volume to 70%
        await mpv.volume(70);
        } catch (error) {
        // handle errors here
        console.log(error);
    }
}

mpv.on("status", async (status) => {
    switch (status.property){
        case 'pause':
            await mpv.command("show-text", [status.value ? 'Pause' : 'Play'])
            io.emit("pause", status.value);
            break;
    }
});

mpv.on("seek", async (data) => {
    // FIXME: Probably not the best solution
    console.log(data)
    await mpv.command("show-text", [`Seek: ${formatTime(data.end)}`])
    socket.emit("playbackTimeResponse", {
        playback_time: formatTime(data.end)
    });
})


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

async function get_mpv_props(){
    let props = {}
    // TODO: Return empty object if no result.
    props.filename = await mpv.getProperty("filename");
    props.pause = await mpv.getProperty("pause")
    props.duration = formatTime(await mpv.getProperty("duration"))
    props.playback_time = formatTime(await mpv.getProperty("playback-time"));
    props.percent_pos = Math.ceil(await mpv.getProperty("percent-pos"))
    props.volume = await mpv.getProperty("volume")
    props.media_title = await mpv.getProperty("media-title");

    return props
}

/*
TODO List:
- Handle EOF (Clear player data)
- Exception handling (maybe send to frontned too.)

*/
io.on("connection", (socket) => {
    console.log("a user connected");
    // TODO: Create a method for this!
    
    get_mpv_props().then((resp) => {
        socket.emit("playerData", resp)
    })
    // Send duration for new connections.
    socket.on("playbackTime", async function (data) {
        const playbackTime = await mpv.getProperty("playback-time")
        const percentPos = Math.ceil(await mpv.getProperty("percent-pos"))
        socket.emit("playbackTimeResponse", {playback_time: formatTime(playbackTime), percent_pos: percentPos});
    });

    socket.on("set_player_prop", async function (data){
        try {
            console.log(`Set ${data[0]} to ${data[1]}`)
            await mpv.setProperty(data[0], data[1])
        }
        catch(exc){
            console.log(exc)
        }
    });
    socket.on("openFile", async function(data) {
        await mpv.load(data)
        socket.emit('playerData', await get_mpv_props())
    })

    socket.on("stopPlayback", async function(data) {
        await mpv.stop()
        socket.emit("playerData", await get_mpv_props());
    })

    socket.on("seek", async function(data) {
        try{
            console.log(`User seek ${data}`)
            await mpv.command("seek", [data, "absolute-percent"]);
        }
        catch(exc){
            console.log(exc)
        }
    })
});


server.listen(SERVER_PORT, () => {
    console.log(`listening on *:${SERVER_PORT}`);
});


start()