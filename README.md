# MPV-Remote plugin

This plugin needed for MPV-Remote Android application to work.

NOTE:
This project under heavy development right now, so it can break anytime!

## Installation

Requirements:

- MPV
- Git
- Node (use 13.14.0 LTS for Windows 7)
- youtube-dl for playing youtube videos,
- [MPV Remote android application](https://github.com/husudosu/mpv-remote-app/blob/master/android/app/release/app-release.apk)

This plugin & app currently only a development version, so not available on NPM yet.

To install do this:

```bash
npm install -g git+https://github.com/husudosu/mpv-remote-node.git # Linux: use sudo if needed
# Run MPV remote and follow instructions
mpv-remote
```

## How to run MPV

If you don't want MPV close after playback finished use --idle flag

```
mpv --idle
```

## How to run MPV with idle flag (Windows)

I'm gonna make an installer for the project, which will do everything for you on Windows.
Until then:

- Create a shortcut of MPV (to desktop)
- Right click on shortcut and select properties
- Add --idle to the end of target
- Apply/Ok

Now if you launch MPV with that shortcut it's gonna launch with idle mode.
Also you can add this shortcut to startup.
Startup directory can accessed by using Run (WINDOWS + R shortcut) and typing this:

```
Shell:startup
```

## Port

The MPV remote plugin runs on port 8000 by default.

## Supported systems

Tested on Linux, Windows 10

Note about Windows 7:

- For new version I cannot test on Windows 7, because don't have access to Windows 7 PC/VM. But probably gonna work.
- Newer Node.JS versions not supported on Windows 7, but you can install an older one like 13.14.0 LTS (I've tested with that version)

## Limitations

- Currently only one instance of MPV supported

## TODO

- Put the project into NPM registry,
- Provide easier web port changing method,
- Tidy up the code,
- Better README,
- Make an installer
