# Postman

[You can download Postman collection and environment here](https://github.com/husudosu/mpv-remote-node/tree/master/postman)

For safety reasons computer actions route not included!

# Responses

Default response:

```json
{ "message": "success or error message" }
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

## /api/v1/mpvinfo

**Methods:** GET

Gets info about MPV. MPV remote plugin settings also included.

## /api/v1/status

**Methods:** GET

Gets status of the player.

**Query parameters:**

**exclude:** You can provide properties to exclude as list.

- example value: exclude=playlist,track-list

Example response:

```json
{
  "pause": true,
  "mute": false,
  "filename": "Dorohedoro 02 - In the Bag - Eat Quietly During Meals - My Neighbor the Sorcerer.mkv",
  "duration": 1422.061,
  "position": 71.787,
  "remaining": 1350.274,
  "media-title": "Dorohedoro 02 - In the Bag | Eat Quietly During Meals | My Neighbor the Sorcerer",
  "playlist": [
    {
      "index": 0,
      "id": 1,
      "filePath": "V:\\anime\\Vivy - Fluorite Eye's Song S01 1080p\\Vivy - Fluorite Eye's Song - E02.mkv",
      "filename": "Vivy - Fluorite Eye's Song - E02.mkv"
    },
    {
      "index": 1,
      "id": 2,
      "filePath": "V:\\anime\\Dorohedoro S01+OVA (BD 1080p)\\Dorohedoro 02 - In the Bag - Eat Quietly During Meals - My Neighbor the Sorcerer.mkv",
      "current": true,
      "filename": "Dorohedoro 02 - In the Bag - Eat Quietly During Meals - My Neighbor the Sorcerer.mkv"
    }
  ],
  "chapter": 0,
  "chapter-list": [
    {
      "title": "Intro",
      "time": 0
    },
    {
      "title": "OP",
      "time": 68.986
    },
    {
      "title": "Part A",
      "time": 159.034
    },
    {
      "title": "Part B",
      "time": 589.089
    },
    {
      "title": "ED",
      "time": 1316.023
    },
    {
      "title": "Preview",
      "time": 1406.03
    }
  ],
  "volume": 100,
  "max-volume": 100,
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
      "codec": "hevc",
      "demux-w": 1920,
      "demux-h": 1080
    },
    {
      "index": 1,
      "id": 1,
      "type": "audio",
      "selected": true,
      "codec": "opus",
      "demux-channel-count": 2,
      "demux-channels": "unknown2",
      "demux-samplerate": 48000,
      "lang": "jpn"
    },
    {
      "index": 2,
      "id": 2,
      "type": "audio",
      "selected": false,
      "codec": "opus",
      "demux-channel-count": 2,
      "demux-channels": "unknown2",
      "demux-samplerate": 48000,
      "lang": "eng"
    },
    {
      "index": 3,
      "id": 1,
      "type": "sub",
      "selected": true,
      "codec": "subrip",
      "lang": "hun"
    },
    {
      "index": 4,
      "id": 2,
      "type": "sub",
      "selected": false,
      "codec": "ass",
      "lang": "eng"
    },
    {
      "index": 5,
      "id": 3,
      "type": "sub",
      "selected": false,
      "codec": "ass",
      "lang": "eng"
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

Cycles between play and pause

## /api/v1/controls/play

**Methods:** POST

Start playback

## /api/v1/controls/pause

**Methods:** POST

Pause playback

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

# Playlist

## /api/v1/playlist

**Methods:** GET, POST

**Related MPV documentation:** https://mpv.io/manual/master/#command-interface-[%3Coptions%3E]

### **GET**

Gets Playlist items.

Response JSON:

```json
[
  {
    "index": 0,
    "id": 1,
    "filePath": "V:\\anime\\Vivy - Fluorite Eye's Song S01 1080p\\Vivy - Fluorite Eye's Song - E02.mkv",
    "current": true,
    "filename": "Vivy - Fluorite Eye's Song - E02.mkv"
  },
  {
    "index": 1,
    "id": 2,
    "filePath": "V:\\anime\\Dorohedoro S01+OVA (BD 1080p)\\Dorohedoro 02 - In the Bag - Eat Quietly During Meals - My Neighbor the Sorcerer.mkv",
    "filename": "Dorohedoro 02 - In the Bag - Eat Quietly During Meals - My Neighbor the Sorcerer.mkv"
  }
]
```

### **POST**

Puts an item to playlist.

**Request JSON:**

```JSON
{
    "filename": "V:\\anime\\Vivy - Fluorite Eye's Song S01 1080p\\Vivy - Fluorite Eye's Song - E02.mkv",
    "flag": "replace",
    "seekTo": 60.0, // seekTo works only if flag is replace. Format seconds
    "file-local-options": [
      "http-header-fields": "'MyHeader: 1234', 'MyHeader2: 5678'"
    ]
}
```

**flag** possible values:

- replace
- append
- append-play (Default)

## /api/v1/playlist/remove/:index

**Methods:** DELETE

Deletes a playlist item.

## /api/v1/playlist/move?fromIndex=0&toIndex=1

**Methods**: POST

**Related MPV documentation:** https://mpv.io/manual/master/#command-interface-playlist-move

**Query parameters**:

- **fromIndex (REQUIRED):** Moves this item.
- **toIndex (REQUIRED):** To this index.

Moves a playlist item (fromIndex), to desired destination (toIndex).

## /api/v1/playlist/play/:index

**Methods**: POST

Plays playlist item.

Note: index can be current too, whcih gonna reload the current entry.

## /api/v1/playlist/prev

**Methods**: POST

Playlist previous item on playlist

## /api/v1/playlist/next

**Methods**: POST

Playlist next item on playlist

## /api/v1/playlist/clear

**Methods**: POST

Clears playlist.

## /api/v1/playlist/shuffle

**Methods**: POST

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
    "codec": "hevc",
    "demux-w": 1920,
    "demux-h": 1080
  },
  {
    "index": 1,
    "id": 1,
    "type": "audio",
    "selected": true,
    "codec": "opus",
    "demux-channel-count": 2,
    "demux-channels": "unknown2",
    "demux-samplerate": 48000,
    "lang": "jpn"
  },
  {
    "index": 2,
    "id": 2,
    "type": "audio",
    "selected": false,
    "codec": "opus",
    "demux-channel-count": 2,
    "demux-channels": "unknown2",
    "demux-samplerate": 48000,
    "lang": "eng"
  },
  {
    "index": 3,
    "id": 1,
    "type": "sub",
    "selected": true,
    "codec": "subrip",
    "lang": "hun"
  },
  {
    "index": 4,
    "id": 2,
    "type": "sub",
    "selected": false,
    "codec": "ass",
    "lang": "eng"
  },
  {
    "index": 5,
    "id": 3,
    "type": "sub",
    "selected": false,
    "codec": "ass",
    "lang": "eng"
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

## /api/v1/tracks/sub/visibility/:value

**Methods:** POST
Sets subtitle visibility

Values can be:

- true
- false

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

## /api/v1/filebrowser/browse

**Methods:** POST

Browse a path or collection.

**Request JSON:**

```json
  "path": "/home/usr/media2"
  // Or
  "collection_id": 1
```

## /api/v1/filebrowser/browse/:index

**Methods:** GET

**Note:** Only MPV supported fileformats will return. [Supported file formats](https://github.com/husudosu/mpv-remote-node/blob/master/fileformats.js)

Returns files with types:

```json
{
  "content": [
    {
      "priority": 1,
      "type": "directory",
      "name": "Feliratok",
      "fullPath": "V:\\anime\\Dorohedoro S01+OVA (BD 1080p)\\Feliratok",
      "lastModified": "2021-05-03T19:10:16.008Z"
    },
    {
      "priority": 2,
      "type": "video",
      "name": "Dorohedoro 01 - Caiman.mkv",
      "fullPath": "V:\\anime\\Dorohedoro S01+OVA (BD 1080p)\\Dorohedoro 01 - Caiman.mkv",
      "lastModified": "2021-05-03T19:09:21.857Z",
      "mediaStatus": {
        // Media status appears only when localdb enabled!
        "id": 2,
        "directory": "V:\\anime\\Dorohedoro S01+OVA (BD 1080p)",
        "file_name": "Dorohedoro 01 - Caiman.mkv",
        "current_time": 1422.0545,
        "finished": 1
      }
    },
    {
      "priority": 2,
      "type": "video",
      "name": "Dorohedoro 02 - In the Bag - Eat Quietly During Meals - My Neighbor the Sorcerer.mkv",
      "fullPath": "V:\\anime\\Dorohedoro S01+OVA (BD 1080p)\\Dorohedoro 02 - In the Bag - Eat Quietly During Meals - My Neighbor the Sorcerer.mkv",
      "lastModified": "2021-05-03T19:04:05.410Z",
      "mediaStatus": {
        "id": 1,
        "directory": "V:\\anime\\Dorohedoro S01+OVA (BD 1080p)",
        "file_name": "Dorohedoro 02 - In the Bag - Eat Quietly During Meals - My Neighbor the Sorcerer.mkv",
        "current_time": 596.853,
        "finished": 0
      }
    },
    {
      "priority": 2,
      "type": "video",
      "name": "Dorohedoro 03 - Night of the Dead ~ Duel! ~ In Front of the Main Department Store.mkv",
      "fullPath": "V:\\anime\\Dorohedoro S01+OVA (BD 1080p)\\Dorohedoro 03 - Night of the Dead ~ Duel! ~ In Front of the Main Department Store.mkv",
      "lastModified": "2021-05-03T19:04:26.434Z"
    }
  ],
  "dirname": "Dorohedoro S01+OVA (BD 1080p)",
  "prevDir": "V:\\anime",
  "cwd": "V:\\anime\\Dorohedoro S01+OVA (BD 1080p)"
}
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
    "path": "C"
  },
  {
    "path": "D:"
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

**Methods:** GET, POST

### **GET**

Get all collections

**Response JSON:**

Array of collection.

### **POST**

Creates a collection

**type** variable/enum created for future use:

- 1: Movies
- 2: TVShows
- 3: Music

**Request JSON:**

```
  "name": "Anime",
  "type": 1,
  "paths": [
    {
      "path": "/home/usr/media1"
    },
    {
      "path": "/home/usr/media2"
    }
  ]
```

## /api/v1/collections/:id

**Methods:** GET, PATCH, DELETE

### **GET**

Gets collection

**Response JSON:**

```json
{
  "id": 1,
  "name": "Anime",
  "type": 1,
  "paths": [
    {
      "id": 1
      "path": "/home/usr/media1"
    },
    {
      "id": 2,
      "path": "/home/usr/media2"
    }
  ]
}
```

### **PATCH**

Updates collection.

**Request JSON:**

```json
{
  "name": "Anime ja nai",
  "type": 2,
  "paths": [
    {
      "path": "/home/usr/media3" // Adds new path
    },
    {
      "id": 2,
      "path": "/home/usr/media2_other" // Updates existing path
    }
  ]
}
```

### **DELETE**

Deletes collection.

## /api/v1/collections/entries/:id

**Methods:** DELETE

Deletes a collection entry.

## /api/v1/collections/:collection_id/entries

Adds collection entry to collection.

**Methods:** POST

**Request JSON:**

```json
{
  "collection_id": 1,
  "path": "/home/usr/media4"
}
```

# Computer actions

## /api/v1/computer/:action

**Methods:** POST

action can be:

- shutdown
- reboot
- quit
