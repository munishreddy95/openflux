Create a complete self-hosted web torrent downloader application called OpenFlux.

Use JavaScript only.
Do not use TypeScript.
Do not use React Native.
Do not use Expo.
Do not use SQLite in v1.
Do not use native packages that commonly fail during npm install.

The application must be installable as an NPM package and runnable from terminal using a CLI command.

Main goal:
Users should install it globally:

npm install -g openflux

Then run it on any OS:

openflux start

Or on a VPS:

openflux start --host 0.0.0.0 --port 8080

Then the user can open:

http://SERVER_IP:8080

The app should start an Express server and serve both:
1. Backend API
2. Built React frontend

This is a server-based torrent downloader:
- User adds a magnet link or uploads a .torrent file in browser.
- VPS/server downloads the torrent.
- Browser shows real-time download progress.
- After completion, user can watch playable video files in browser.
- User can also download completed files from the web app.

Legal restriction:
Do not include torrent search.
Do not include piracy search.
Do not include movie search.
Do not include copyrighted content links.
Do not include scraping from torrent websites.
The app is only for legal torrents, Linux ISOs, public domain videos, open datasets, and user-owned torrent files.

Application name:
OpenFlux

Tech stack:

Backend:
- Node.js
- Express.js
- Socket.IO
- WebTorrent
- multer
- fs-extra
- commander
- chalk
- lowdb
- nanoid
- mime-types

Frontend:
- React with Vite
- JavaScript only
- Tailwind CSS
- Zustand
- Axios
- Socket.IO client
- React Router DOM
- Lucide React icons

Do not use:
- TypeScript
- Expo
- React Native
- sqlite3
- better-sqlite3
- Sequelize
- Prisma
- MongoDB
- external torrent search APIs

Reason:
The app should be easy to install globally using NPM on Windows, macOS, Linux, and VPS servers.

Expected final project structure:

openflux/
  package.json
  README.md
  LICENSE
  bin/
    openflux.js

  server/
    app.js
    server.js

    routes/
      torrent.routes.js
      media.routes.js
      settings.routes.js
      health.routes.js

    controllers/
      torrent.controller.js
      media.controller.js
      settings.controller.js
      health.controller.js

    services/
      torrent.service.js
      media.service.js
      socket.service.js
      storage.service.js
      config.service.js
      db.service.js

    middleware/
      error.middleware.js
      upload.middleware.js

    utils/
      path.utils.js
      file.utils.js
      format.utils.js
      validation.utils.js

  client/
    package.json
    index.html
    vite.config.js
    tailwind.config.js
    postcss.config.js
    src/
      main.jsx
      App.jsx

      components/
        layout/
          AppLayout.jsx
          Sidebar.jsx
          Header.jsx

        torrent/
          TorrentCard.jsx
          TorrentProgress.jsx
          TorrentActions.jsx
          StatusBadge.jsx

        media/
          MediaCard.jsx
          FileList.jsx

        player/
          VideoPlayer.jsx
          PlayerControls.jsx

        common/
          Button.jsx
          Input.jsx
          Modal.jsx
          EmptyState.jsx
          Loading.jsx

      pages/
        Dashboard.jsx
        AddTorrent.jsx
        TorrentDetails.jsx
        MediaLibrary.jsx
        VideoPlayerPage.jsx
        Settings.jsx
        NotFound.jsx

      store/
        torrent.store.js
        settings.store.js

      services/
        api.service.js
        socket.service.js
        torrent.api.js
        media.api.js
        settings.api.js

      utils/
        format.js
        constants.js

  public/
    index.html
    assets/

NPM package behavior:
- The published NPM package should include:
  - bin/
  - server/
  - public/
  - package.json
  - README.md
- The React frontend should be built into public/.
- The user should not need to run the frontend separately.
- Running openflux start should serve the frontend and backend from the same Express server.

CLI requirements:

Create executable file:

bin/openflux.js

The CLI command should be:

openflux

Supported commands:

1. openflux start

Starts the server using default host and port.

Default:
host = localhost
port = 8080

2. openflux start --host 0.0.0.0 --port 8080

Starts the server publicly on a VPS.

3. openflux start --download-dir /custom/path

Uses a custom download directory.

4. openflux config

Prints current OpenFlux configuration.

5. openflux version

Prints package version.

6. openflux help

Shows CLI help.

Default storage folder:

Use the user home directory.

Linux/macOS:
~/.openflux/

Windows:
C:\Users\<username>\.openflux\

Inside storage folder:

.openflux/
  downloads/
  uploads/
  db.json
  config.json
  logs/

Configuration file:

config.json should contain:

{
  "host": "localhost",
  "port": 8080,
  "downloadDir": "/absolute/path/to/downloads",
  "uploadDir": "/absolute/path/to/uploads",
  "maxActiveTorrents": 3,
  "autoDeleteCompleted": false,
  "legalNoticeAccepted": false
}

Database:

Use lowdb with db.json.

db.json structure:

{
  "torrents": [],
  "settings": {},
  "media": []
}

Torrent object example:

{
  "id": "generated-id",
  "name": "Ubuntu ISO",
  "sourceType": "magnet",
  "magnetURI": "magnet:...",
  "status": "downloading",
  "progress": 45.2,
  "downloadSpeed": 1024000,
  "uploadSpeed": 100000,
  "peers": 15,
  "seeds": 20,
  "eta": 3600,
  "downloaded": 104857600,
  "totalSize": 209715200,
  "downloadPath": "/safe/internal/path",
  "files": [],
  "createdAt": "ISO_DATE",
  "updatedAt": "ISO_DATE",
  "completedAt": null,
  "error": null
}

Torrent file object example:

{
  "id": "generated-file-id",
  "name": "video.mp4",
  "path": "relative/safe/path/video.mp4",
  "size": 104857600,
  "mimeType": "video/mp4",
  "isVideo": true,
  "isPlayable": true
}

Backend requirements:

1. Express server
- Start from CLI.
- Serve API under /api.
- Serve React frontend from public/.
- For all unknown frontend routes, return public/index.html.

2. Socket.IO
- Send real-time torrent updates.
- Support multiple browser clients.
- Broadcast updates whenever torrent status changes.

Socket.IO events:

Server emits:
- torrent:added
- torrent:progress
- torrent:completed
- torrent:error
- torrent:paused
- torrent:resumed
- torrent:deleted

Client may emit:
- client:connected
- torrent:watch

3. Torrent engine
Use WebTorrent for v1.

Required torrent features:
- Add torrent by magnet link.
- Add torrent by uploaded .torrent file.
- Pause torrent.
- Resume torrent.
- Delete torrent.
- Track progress.
- Track download speed.
- Track upload speed.
- Track peer count.
- Track ETA.
- Save metadata in lowdb.
- Store files in configured download directory.
- Restore saved torrent metadata on app restart.

Important:
If WebTorrent cannot resume an active torrent perfectly after restart, handle it safely:
- Show status as "stopped" or "needs_resume".
- Allow user to resume manually.
- Do not fake progress.

4. Upload handling
Use multer for .torrent uploads.

Upload route:
POST /api/torrents/file

Rules:
- Accept only .torrent files.
- Store uploads in ~/.openflux/uploads.
- Validate file extension.
- Return safe error for invalid file.

5. Magnet handling

Route:
POST /api/torrents/magnet

Body:
{
  "magnetURI": "magnet:..."
}

Rules:
- Validate magnet link starts with magnet:?xt=urn:btih:
- Return error if invalid.
- Add torrent to WebTorrent client.
- Save metadata in db.json.
- Emit torrent:added.

6. Torrent routes

Create these routes:

GET /api/torrents
Returns all torrents.

GET /api/torrents/:id
Returns single torrent.

POST /api/torrents/magnet
Adds torrent from magnet link.

POST /api/torrents/file
Adds torrent from uploaded .torrent file.

POST /api/torrents/:id/pause
Pauses torrent.

POST /api/torrents/:id/resume
Resumes torrent.

DELETE /api/torrents/:id
Deletes torrent from app.
Also allow optional query:
?deleteFiles=true

If deleteFiles=true, delete downloaded files safely.

7. Media library

Add a media library for completed torrents.

Only completed torrents should expose files for watching or download.

Media routes:

GET /api/media

Returns all completed media files.

GET /api/media/:torrentId/files

Returns files for a completed torrent.

GET /api/media/:torrentId/files/:fileId/stream

Streams a video file.

GET /api/media/:torrentId/files/:fileId/download

Downloads a completed file.

8. Video streaming

The video player must support browser playback.

Backend must support HTTP range requests.

Streaming requirements:
- Read Range header.
- Return 206 Partial Content when Range exists.
- Return Content-Range.
- Return Accept-Ranges: bytes.
- Return correct Content-Length.
- Return correct Content-Type.
- Do not load full video into memory.
- Use fs.createReadStream.

Only allow streaming if:
- Torrent status is completed.
- File exists.
- File is inside the configured download directory.
- File path is safe.
- File is a video file.

Playable browser video extensions:
- .mp4
- .webm
- .ogg
- .ogv
- .m4v

Possibly unsupported but still list:
- .mkv
- .avi
- .mov

For unsupported preview formats, frontend should show:
"Preview is not supported for this file. Please download it."

9. Download endpoint

Download route:
GET /api/media/:torrentId/files/:fileId/download

Requirements:
- Only allow download if torrent is completed.
- Use Content-Disposition attachment header.
- Use safe file path validation.
- Do not expose absolute server paths.
- Support large files using streams.
- Return clear errors for missing files.

10. Security requirements

Very important:
- Prevent path traversal.
- Never trust file paths from frontend.
- Use generated file IDs.
- Store relative paths in db.
- Resolve real path and verify it starts with download directory.
- Do not expose absolute server paths to frontend.
- Do not allow streaming/downloading files outside OpenFlux download directory.
- Sanitize filenames.
- Limit upload to .torrent files.
- Add max upload size for .torrent files.
- Add basic rate limiting placeholder comments.
- Add auth placeholder comments for production.

11. Health route

GET /api/health

Returns:

{
  "status": "ok",
  "app": "OpenFlux",
  "version": "x.x.x"
}

12. Settings route

GET /api/settings

Returns safe settings:
- host
- port
- downloadDir
- maxActiveTorrents
- autoDeleteCompleted
- storageDir

Do not return sensitive system details.

Frontend requirements:

Build a modern dark UI.

Use:
- React
- Vite
- JavaScript
- Tailwind CSS
- Zustand
- Axios
- Socket.IO client
- React Router DOM
- Lucide React

Main frontend pages:

1. Dashboard
Route: /

Features:
- Show active downloads.
- Show completed downloads.
- Show failed/stopped downloads.
- Torrent cards with:
  - Name
  - Status
  - Progress bar
  - Download speed
  - Upload speed
  - Peers
  - Seeds if available
  - ETA
  - Total size
  - Downloaded size
  - Pause/resume button
  - Delete button
  - Open details button
  - Watch button if completed video exists
  - Download button if completed

2. Add Torrent Page
Route: /add

Features:
- Magnet link input.
- .torrent file upload.
- Add button.
- Validation errors.
- Loading state.
- Legal usage reminder.

3. Torrent Details Page
Route: /torrents/:id

Features:
- Full torrent information.
- Progress details.
- Speed details.
- Peers/seeds.
- ETA.
- File list.
- Pause/resume/delete.
- Watch buttons for video files when completed.
- Download buttons for completed files.
- Show message when torrent is not completed.

4. Media Library Page
Route: /media

Features:
- Show all completed video/media files.
- Media cards with:
  - File name
  - Torrent name
  - File size
  - MIME type
  - Watch button
  - Download button
- Search/filter by filename.
- Empty state when no completed videos exist.

5. Video Player Page
Route: /media/:torrentId/:fileId

Features:
- YouTube-style video player.
- Video title.
- Back button.
- Download button.
- Show unsupported preview message if browser cannot play it.

6. Settings Page
Route: /settings

Features:
- Show host.
- Show port.
- Show download directory.
- Show storage directory.
- Show max active torrents.
- Show legal notice.
- Show version.

Video player requirements:

Create custom component:

client/src/components/player/VideoPlayer.jsx

The video player should use HTML5 video but custom controls.

Controls:
- Play
- Pause
- Forward 10 seconds
- Backward 10 seconds
- Volume up
- Volume down
- Mute/unmute
- Fullscreen
- Playback speed
- Progress seek bar
- Current time
- Duration
- Download button

Keyboard shortcuts:
- Space: play or pause
- ArrowRight: forward 10 seconds
- ArrowLeft: backward 10 seconds
- ArrowUp: volume up
- ArrowDown: volume down
- M: mute or unmute
- F: fullscreen
- D: download video

Player design:
- Dark YouTube-like control bar.
- Controls should auto-hide while playing.
- Controls should show on mouse move.
- Mobile-friendly controls.
- Fullscreen support.
- Responsive design.

Important keyboard rule:
Keyboard shortcuts should work only when the video player page is focused.
Do not trigger shortcuts while user is typing in an input.

Frontend Socket.IO behavior:

- Connect to server on app load.
- Listen to torrent:added.
- Listen to torrent:progress.
- Listen to torrent:completed.
- Listen to torrent:error.
- Listen to torrent:paused.
- Listen to torrent:resumed.
- Listen to torrent:deleted.
- Update Zustand store in real time.
- Also fetch /api/torrents on page load to restore state.

UI style:

Use dark modern design.

Design guidelines:
- Background: dark slate/black style.
- Cards: rounded corners.
- Smooth progress bars.
- Clear status colors.
- Mobile responsive.
- Sidebar for desktop.
- Bottom navigation or compact header for mobile.
- Clean buttons.
- Avoid copying Flud UI directly.
- Make original OpenFlux branding.

Status types:
- downloading
- completed
- paused
- stopped
- failed
- queued
- checking
- needs_resume

Utility functions:

Create format helpers:
- formatBytes(bytes)
- formatSpeed(bytesPerSecond)
- formatETA(seconds)
- formatPercent(number)
- formatDate(date)

Backend safe path helper:

Create utility:
- resolveSafePath(baseDir, relativePath)
- isPathInside(parent, child)
- sanitizeFilename(name)

Error handling:

Backend should return consistent JSON errors:

{
  "success": false,
  "message": "Error message"
}

Successful responses:

{
  "success": true,
  "data": {}
}

Build scripts:

Root package.json should include:

{
  "name": "openflux",
  "version": "1.0.0",
  "description": "Self-hosted web torrent downloader with media player",
  "type": "module",
  "bin": {
    "openflux": "./bin/openflux.js"
  },
  "scripts": {
    "dev": "node server/server.js",
    "client:install": "cd client && npm install",
    "client:dev": "cd client && npm run dev",
    "client:build": "cd client && npm run build",
    "build": "npm run client:build",
    "start": "node server/server.js"
  },
  "files": [
    "bin",
    "server",
    "public",
    "README.md",
    "LICENSE",
    "package.json"
  ]
}

Client build:
- Vite should build client into root public/ folder.
- Configure vite.config.js output directory as ../public.

Development mode:
- Allow backend and frontend development separately.
- In production/NPM mode, Express serves public/.

README requirements:

Write README.md with:

1. What is OpenFlux?
2. Legal usage notice.
3. Features.
4. Install globally.
5. Start locally.
6. Start on VPS.
7. Start with custom download directory.
8. How to open firewall port on VPS.
9. How to use with Nginx reverse proxy.
10. API summary.
11. Keyboard shortcuts for video player.
12. NPM publishing steps.
13. Security notes.
14. Future roadmap.

Nginx reverse proxy example:

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

Future roadmap section:
- Authentication.
- User accounts.
- aria2 engine support.
- Transmission engine support.
- FFmpeg transcoding.
- Mobile Android app.
- PWA support.
- Admin dashboard.
- Storage quota.
- Auto cleanup.
- Password protection.

Production security note:
Mention clearly that before exposing to public internet, user should add:
- Authentication
- HTTPS
- Reverse proxy
- Firewall rules
- Storage limits

Important implementation notes:

1. Keep code clean and modular.
2. Use JavaScript ES modules.
3. Add comments only where helpful.
4. Do not include fake working claims.
5. Handle errors properly.
6. Avoid crashing server on torrent error.
7. Make UI work even if no torrents exist.
8. Make app responsive.
9. Do not expose server absolute paths.
10. Do not implement piracy features.

Expected output:
Generate the full project code for OpenFlux with all files needed.

After code generation, provide:
- Installation commands
- Development commands
- Build commands
- Global NPM test command
- NPM publish command
- VPS run command

The final application should run like:

npm install
npm run client:install
npm run build
npm link
openflux start --host 0.0.0.0 --port 8080

Then open:

http://localhost:8080

or on VPS:

http://SERVER_IP:8080