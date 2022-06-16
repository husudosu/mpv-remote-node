# Changelog

## 1.0.2

- Socket IO server replaced with HTTP API
- Plugin settings added
- Computer actions implemented like Shutdown/Reboot.
- Ability to change subtitle font size, option to ASS override.
- Get MPV version info and plugin settings via route, can be useful when building your own implementation of frontend.
- Filebrowser entries improved and extended with file/directory last modified date
- Ability to change audio timing
- Installer PowerShell and bash script
- remote.socketio.js renamed to remoteServer.js

## 1.0.3

- Code tidy up
- MPV socket Verbose mode made optional
- Better structure, validation, error handling for collections
- Removed most debug messages from server
- Metadata reading fixed
- Filebrowserpath behaviour fixed
- Hotfix: installer scritps fixed

## 1.0.4

- Load file improvements, way to set http-header-fields, needed for playing data from streaming services.

## 1.0.5

- max-volume added (contribution by: https://github.com/byter11)
- multiple MPV instances supported (set webport and webportrangeend on your settings)
- placing "file-local-options.txt" to OS temp directory

## 1.0.6

- Ability to turn off OSD messages via `mpvremote-osd-messages` setting,
- MPV info now includes version of MPV remote plugin

## 1.0.7

- Fixed IP getting on newer Node.JS versions,
- If the CPU usage high on the host machine returning cached properties,
- Ability to exclude properties on /status route as query param, check [APIDESIGN.MD](https://github.com/husudosu/mpv-remote-node/blob/master/APIDESIGN.md)
