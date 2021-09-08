# Responses

Default responses, if not specified for the route:

**On success (200):**

```json
{ "message": "success" }
```

**On failure (Internal server error 500):**

```json
{ "error": "JS exception message" }
```

# API Routes

- MPV Status
- Playback controls
- Playlist
- Tracks
- Filebrowser
- Collection handling
- Computer actions

# Status

## /api/v1/status

Methods: GET

Response codes: 200

Gets status of the player.

Example response:

```json
{
  "pause": true,
  "mute": false,
  "filename": "[SR] Gintama - 004 [DVDRip 1280x960 x264 AAC].mkv",
  "duration": 1495.369,
  "position": 1.71,
  "remaining": 1493.659,
  "media-title": "Gintama - 004",
  "playlist": [
    {
      "index": 0,
      "id": 1,
      "filePath": "/home/sudosu/media1/[SR] Gintama - 004 [DVDRip 1280x960 x264 AAC].mkv",
      "current": true,
      "filename": "[SR] Gintama - 004 [DVDRip 1280x960 x264 AAC].mkv"
    }
  ],
  "chapter-list": [
    {
      "title": "Intro",
      "time": 0
    },
    {
      "title": "OP",
      "time": 40
    },
    {
      "title": "Info A",
      "time": 130.1
    },
    {
      "title": "A part",
      "time": 140.1
    },
    {
      "title": "B part",
      "time": 1089
    },
    {
      "title": "C part",
      "time": 1129
    },
    {
      "title": "ED",
      "time": 1374.9
    },
    {
      "title": "Preview",
      "time": 1464.9
    },
    {
      "title": "Info B",
      "time": 1479.9
    },
    {
      "title": "Outro",
      "time": 1489.9
    }
  ],
  "volume": 100,
  "fullscreen": false,
  "speed": 1,
  "sub-delay": 0,
  "sub-visibility": true,
  "track-list": [
    {
      "index": 0,
      "id": 1,
      "type": "video",
      "selected": true,
      "codec": "h264",
      "demux-w": 1280,
      "demux-h": 960
    },
    {
      "index": 1,
      "id": 1,
      "type": "audio",
      "selected": true,
      "codec": "aac",
      "demux-channel-count": 2,
      "demux-channels": "unknown2",
      "demux-samplerate": 48000,
      "lang": "jpn"
    },
    {
      "index": 2,
      "id": 1,
      "type": "sub",
      "selected": true,
      "codec": "ass",
      "lang": "hun"
    }
  ],
  "audio-delay": 0,
  "sub-font-size": 55,
  "sub-ass-override": true,
  "metadata": {}
}
```

# Media controls

## /api/v1/controls/play-pause

**Methods:** POST

Plays or pauses playback

## /api/v1/controls/stop

**Methods:** POST

Stops the playback, also clears playlist

## /api/v1/controls/prev

Alias for /playlist/prev

## /api/v1/controls/next

Alias for /playlist/next

## /api/v1/controls/fullscreen

**Methods:** POST

Toggles fullscreen mode

## /api/v1/controls/mute

**Methods:** POST

Mutes volume

## /api/v1/controls/volume/:value

**Methods:** POST

Sets volume

## /api/v1/controls/seek

**Methods:** POST

Seek

Request JSON:

```json
{
  "target": 10.0,
  "flag": "absolute-percent" // if no flag provided defaults to relative
}
```

### Flags

- relative (Default)
- absolute
- absolute-percent
- relative-percent
- keyframes
- exact

# Playlist

## /api/v1/playlist

**Methods:** GET, POST

**Response codes:** 200, 422

**Related MPV documentation:** https://mpv.io/manual/master/#command-interface-[%3Coptions%3E]]

### **GET**

Gets Playlist items.

Response JSON:

```json
[
  {
    "current": true,
    "filename": "./environment/test_media/01 - dummy.mp3",
    "playing": true
  },
  { "filename": "./environment/test_media/02 - dummy.mp3" },
  { "filename": "./environment/test_media/03 - dummy.mp3" }
]
```

### **POST**

Puts an item to playlist.

**Request JSON:**

```JSON
{
    "filename": "/home/user/media/test.mkv", // Required can be any URL which supported by MPV
    "flag": "append-play",  // append-play the default
    "seekTo": 50.1 // If you want to seek immediately after file loading.
}
```

**flag** possible values:

- replace
- append
- append-play

## /api/v1/playlist/remove/:index

**Methods:** DELETE

**Response codes:** 200, 404,

Deletes a playlist item.

## /api/v1/playlist/move?fromIndex=0&toIndex=1

**Methods**: POST

**Response codes:** 200, 422

**Related MPV documentation:** https://mpv.io/manual/master/#command-interface-playlist-move

**Query parameters**:

- **fromIndex (REQUIRED):** Moves this item.
- **toIndex (REQUIRED):** To this index.

Moves a playlist item (fromIndex), to desired destination (toIndex).

## /api/v1/playlist/play/:index

**Methods**: POST

**Response codes:** 200, 422

Plays playlist item.

Note: index can be current too, whcih gonna reload the current entry.

## /api/v1/playlist/prev

**Methods**: POST

**Response codes:** 200, 422

Playlist previous item on playlist

## /api/v1/playlist/next

**Methods**: POST

**Response codes:** 200, 422

Playlist next item on playlist

## /api/v1/playlist/clear

**Methods**: POST

**Response codes:** 200, 422

Clears playlist.

## /api/v1/playlist/shuffle

**Methods**: POST

**Response codes:** 200

Shuffle the playlist.

# Tracks

## /api/v1/tracks

**Methods:** GET

Gets all audio, video, subtitle tracks.

Example response:

```json
[
  {
    "index": 0,
    "id": 1,
    "type": "video",
    "selected": true,
    "codec": "h264",
    "demux-w": 1280,
    "demux-h": 960
  },
  {
    "index": 1,
    "id": 1,
    "type": "audio",
    "selected": true,
    "codec": "aac",
    "demux-channel-count": 2,
    "demux-channels": "unknown2",
    "demux-samplerate": 48000,
    "lang": "jpn"
  },
  {
    "index": 2,
    "id": 1,
    "type": "sub",
    "selected": true,
    "codec": "ass",
    "lang": "hun"
  }
]
```

## /api/v1/tracks/audio/reload/:id

**Methods:** POST

Loads desired audio track ID

## /api/v1/tracks/audio/cycle

**Methods:** POST

Cycles through audio tracks

## /api/v1/tracks/audio/add

**Methods:** POST

Adds an audio track

**Request JSON:**

```json
{
  "filename": "/home/usr/myaudio.mp3",
  "flag": "select" // if no flag provided defaults to select
}
```

### Flags

- select
- auto
- cached

## /api/v1/tracks/audio/timing/:seconds

**Methods:** POST

Sets audio delay to provided second, can be negative.

## /api/v1/tracks/sub/reload/:id

**Methods:** POST

Loads desired subtitle track ID

## /api/v1/tracks/sub/timing/:seconds

**Methods:** POST

Sets sub delay to provided value, can be negative number.

## /api/v1/tracks/sub/ass-override/:value

**Methods:** POST

Changes default behaviour of rendering ASS/SSA subtitles.
MPV mostly renders ASS/SSA subtitles correctly, but if you need it, use it.

**MPV related documentation:** https://mpv.io/manual/master/#options-sub-ass-override

**BE VERY CAREFUL SOME VALUES CAN BREAK PLAYBACK CHECK DOCUMENTATION ABOVE**

Possible values:

- no
- yes
- force
- scale
- strip

## /api/v1/tracks/sub/toggle-visibility

**Methods:** POST

Toggles subtitle visibility

## /api/v1/tracks/sub/add

**Methods:** POST

Add subtitle file.

**Request JSON:**

```json
{
  "filename": "/home/usr/mysub.srt",
  "flag": "select" // if no flag provided defaults to select
}
```

### Flags

- select
- auto
- cached

# Filebrowser

Basic filebrowser which only accepts paths which included at server configured variable `mpvremote-filebrowserpaths`

## /api/v1/filebrowser/paths

**Methods**: GET

**Response codes:** 200

Returns content of `mpvremote-filebrowserpaths` option paths indexed.

Response JSON:

```json
[
  {
    "index": 0,
    "path": "/home/usr/media1"
  },
  {
    "index": 1,
    "path": "/home/usr/media2"
  },
  {
    "index": 2,
    "path": "/home/usr/media3"
  }
]
```

## /api/v1/filebrowser/browse/:index

**Methods**: GET

**Response codes:** 200, 404

**Optional query parameters:**

- **sortBy (DEFAULT: filename):** Sorts by specified column, available values: lastModified, filename

**Note:** Only MPV supported fileformats will return. [Supported file formats](https://github.com/husudosu/mpv-remote-node/blob/master/fileformats.js)

Returns files with types:

```json
[
  {
    "filename": "St. Anger",
    "type": "directory",
    "path": "/home/usr/media1/St. Anger",
    "lastModified": "1970-01-01 00:00:00"
  },
  {
    "filename": "One Piece 01.mkv",
    "type": "video",
    "path": "/home/usr/media1/One Piece 01.mkv",
    "lastModified": "1970-01-01 00:00:00",
    "mediaStatus": {
      "directory": "/home/usr/media1/",
      "file_name": "One Piece 01.mkv",
      "current_time": 100.2, // Float
      "finished": 0 // 0 - Finished, 1 - unfinished
    } // Media status appears only if enabled on backend!
  },
  {
    "filename": "One Piece 01.ass",
    "type": "subtitle",
    "path": "/home/usr/media1/One Piece 01.ass",
    "lastModified": "1970-01-01 00:00:00"
  },
  {
    "filename": "Metallica - Orion.flac",
    "type": "audio",
    "path": "/home/usr/media1/Metallica - Orion.flac",
    "lastModified": "1970-01-01 00:00:00"
  }
]
```

## /api/v1/drives

Gets drives from server.
Only if `mpvremote-unsafefilebrowsing=1`.

If unsafe filebrowsing is disabled returns an error.

Note for Linux users: snap, flatpak virtual drives will be excluded!

**Response JSON:**

```json
// Windows Example
[
  {
    "path": "C:\\"
  },
  {
    "path": "D:\\"
  }
]
// Unix systems
[
  {
    "path": "/"
  },
  {
    "path": "/home"
  }
]
```

# Collections

Local collection handling. Collections only works if you have enabled `mpvremote-uselocaldb`
Collections entries only can be opened if `mpvremote-filebrowserpaths` contains the required paths.

## /api/v1/collections

**Methods:** GET, POST, PATCH, DELETE

### GET

Gets collections

### POST

Creates a new collection

### PATCH

Updates a collection.

### DELETE

Delete a collection.
