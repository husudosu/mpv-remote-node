// where you import your packages
const mpvAPI = require("node-mpv");
// where you want to initialise the API
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
    await mpv.load("/home/sudosu/test.webm");
    // file is playing
    // sets volume to 70%
    await mpv.volume(70);
  } catch (error) {
    // handle errors here
    console.log(error);
  }
}

// mpv.observeProperty("pause")
let pauseCount = 0
mpv.on("status", (status) => {
  console.log(status);
});

mpv.on("seek", (data) => {
  console.log(data)
})
start()