MPV remote control API. You can use [MPV Remote android application](https://github.com/husudosu/mpv-remote-app/blob/master/android/app/release/app-release.apk) or you can create your own frontend.

API documentation accessible here.

# Installation

Requirements:

- Git
- Node (use 13.14.0 LTS for Windows 7)
- youtube-dl for playing youtube videos,

This plugin & app currently only a development version, so not available on NPM yet.

You can find installer scripts for windows and linux. Simply download it and run it. On windows you should run the automated installer as administrator.

## Manual installation

To install do this:

```bash
npm install -g git+https://github.com/husudosu/mpv-remote-node.git # Linux: use sudo if needed
# Run MPV remote and follow instructions
mpv-remote
```

# How to run MPV

If you don't want MPV close after playback finished use --idle flag or you can add `idle=yes` to your mpv.conf.

```
mpv --idle
```

# Configuration variables

You can configure server by using `--script-opts` flag of MPV like this (options seperated by ,):

```
mpv --script-opts=mpvremote-filebrowserpaths=/home/sudosu,mpvremote-uselocaldb=0
```

Or you can use a script-opts file. if you've installed backend with my setup script, it creates it for you

scipt-opts paths:

```bash
%appdata%/mpv/script-opts/mpvremote.conf # For windows
~/.config/mpv/script-opts/mpvremote.conf # For linux
```

If using script-opts file, you don't need `mpvremote-` prefix at configuration options.

[More info about script-opts files.](https://mpv.io/manual/master/#configuration)

Example configuration file:

```
# ~/.config/mpv/script-opts/mpvremote.conf
uselocaldb=1
webport=8000
unsafefilebrowsing=0
filebrowserpaths="'/home/usr/Steins;Gate';'/home/usr/media2'"
```

## Available options:

| Option name                  | Description                                                                                                                                                                                                                           | Default value       | Available options/example                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------- |
| mpvremote-uselocaldb         | Use local database to store media statuses and collections.                                                                                                                                                                           | 1                   | 0 - Disabled <br /> 1 - Enabled              |
| mpvremote-filebrowserpaths   | Stores paths which can be browsable by users it's a semicolon seperated list                                                                                                                                                          | N/A                 | "'/home/usr/Steins;Gate';'/home/usr/media2'" |
| mpvremote-webport            | Port of MPV backend engine                                                                                                                                                                                                            | 8000                | Any port within correct range                |
| mpvreomte-address            | Server address                                                                                                                                                                                                                        | Your first local IP | 127.0.0.1                                    |
| mpvremote-unsafefilebrowsing | Allows you to browse your local filesystem. Be careful though, exposing your whole filesystem not the safest option. For security reasons filebrowser only send results of media files, playlists, subtitle files and subdirectories. | 0                   | 0 - Disabled<br/> 1 - Enabled                |

# Limitations

- Currently only one instance of MPV supported
