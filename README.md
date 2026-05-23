# OpenFlux

OpenFlux is a self-hosted, always-on torrent manager for authorized downloads, browser-based streaming, and remote file access.

Install it on a VPS, home server, or always-on machine, add magnet links or `.torrent` files from the web UI, and let the server continue downloading even when your laptop or phone is offline.

## Why OpenFlux

Desktop torrent clients are tied to the machine they run on. OpenFlux moves the workload to a server:

- Add torrents from a browser
- Keep downloads running 24/7
- Return later to stream, inspect, or download completed files
- Use server uptime and bandwidth instead of relying on a personal device staying powered on

## What It Includes

- Browser dashboard for torrent activity
- Session-based authentication with `admin` and `user` roles
- Magnet link and `.torrent` file intake
- Per-file priority and skip controls
- Global upload and download speed limits
- Active time tracking and torrent metrics
- Peer visibility with connected and discovered counts
- Media browser with folder navigation and zip export
- Built-in video player with subtitle detection and subtitle upload
- System usage view for CPU, memory, disk, and runtime workers
- Single-process and multi-core runtime modes
- CLI package with `openflux` command

## Legal Use

OpenFlux is intended for lawful use only. Typical allowed uses include:

- Linux distributions
- Public-domain or openly licensed media
- Open datasets
- Torrent files you created
- Content you are otherwise authorized to download and share

OpenFlux does not include:

- Torrent search
- Piracy search
- Media catalogs
- Scraping from torrent sites
- Bundled copyrighted content links

See [LEGAL_NOTICE.md](LEGAL_NOTICE.md) for the package-level legal notice.

## Requirements

- Node.js `18.18.0` or newer
- npm
- A Linux, macOS, or Windows environment that can run Node.js
- A writable home directory for OpenFlux storage

## Quick Start

Install globally:

```bash
npm install -g openflux
```

Create the first admin account:

```bash
openflux admin create --username admin --password <strong-password>
```

Start locally:

```bash
openflux start
```

Start in background mode:

```bash
openflux start --detach
```

Default address:

- `http://localhost:8080`

Start on a VPS or remote host:

```bash
openflux start --host 0.0.0.0 --port 4001
```

Then open:

- `http://SERVER_IP:4001`

First login flow:

1. Sign in with the admin account you created from the terminal
2. Open `Settings` and create user accounts if needed
3. Give each user their own username and initial password
4. If a user forgets a password later, issue a temporary password from `Settings`

If the requested port is already in use, OpenFlux automatically moves to the next available port and prints the actual dashboard URL.

## Common Commands

Start with defaults:

```bash
openflux start
```

Create an admin account:

```bash
openflux admin create --username admin --password <strong-password>
```

Start in background mode:

```bash
openflux start --detach
```

Start on a specific host and port:

```bash
openflux start --host 0.0.0.0 --port 4001
```

Start with a custom download directory:

```bash
openflux start --download-dir /srv/openflux/downloads
```

Persist startup settings without launching:

```bash
openflux config --host 0.0.0.0 --port 4001 --cores 4
```

Inspect the saved configuration:

```bash
openflux config
```

Check or stop the detached process:

```bash
openflux status
openflux stop
```

Show CLI help:

```bash
openflux help
```

## Portable Bundles And Executables

OpenFlux already installs an executable CLI command through npm:

```bash
openflux start
```

If you want a downloadable release bundle for users who do not want to install from npm, build the frontend and create a portable bundle for the current platform:

```bash
npm install
npm run build
npm run bundle:current
```

This produces:

- `dist/openflux-<version>-<platform>-<arch>/`
- `dist/openflux-<version>-<platform>-<arch>.zip`

The bundle includes the app files, installed dependencies, a bundled Node.js runtime, and a launcher:

- Linux and macOS: `./openflux`
- Windows: `openflux.cmd`

Example:

```bash
./openflux start --host 0.0.0.0 --port 4001
```

For the full packaging flow and limits, see [PACKAGING.md](PACKAGING.md).

For Windows, there is also an installer layer built on top of the bundle flow:

```powershell
npm run installer:windows
```

That command is intended to run on Windows after `npm run bundle:current` and produces a setup exe through NSIS.

For Linux and macOS, there are packaging layers on top of the bundle flow as well:

```bash
npm run package:linux
npm run package:macos
```

The Linux step produces a `.tar.gz` plus a `systemd` unit template. The macOS step produces an `OpenFlux.app` wrapper and a zipped app archive. The detailed steps are in [PACKAGING.md](PACKAGING.md).

## Multi-Core Runtime

OpenFlux supports both single-process and multi-core runtime modes.

- `--cores 1` runs a single OpenFlux process
- `--cores >1` starts one control worker and the remaining workers as web workers

Example:

```bash
openflux start --host 0.0.0.0 --port 4001 --cores 4
```

Runtime model:

- Control worker:
  Owns the torrent engine, persistent writes, and real-time socket state
- Web workers:
  Serve public HTTP traffic and proxy stateful control traffic internally

This design keeps the BitTorrent engine centralized while still allowing the UI and read-heavy traffic to scale across multiple processes.

If the requested port is unavailable, the whole runtime moves to the next free port so every worker still shares one public bind address.

## Storage Layout

OpenFlux stores state in the user home directory by default:

- Linux and macOS: `~/.openflux/`
- Windows: `C:\Users\<username>\.openflux\`

Structure:

```text
.openflux/
  downloads/
  uploads/
  openflux.pid
  db.json
  config.json
  logs/
```

Notes:

- `downloads/` stores completed and partial torrent data
- `uploads/` stores uploaded `.torrent` and subtitle intake files before they are processed
- `openflux.pid` tracks the detached background process when `openflux start --detach` is used
- `db.json` stores application state
- `config.json` stores persisted runtime configuration
- `logs/openflux.out.log` and `logs/openflux.err.log` store detached-process output

## Web UI Features

### Authentication And Roles

- Passwords are hashed before they are stored in `db.json`
- Admin accounts are created from the terminal
- User accounts are created from the web application by an admin
- Admins can see:
  `Dashboard`, `Add Torrent`, `Media`, `Account`, `System Usage`, and `Settings`
- Users can see:
  `Dashboard`, `Add Torrent`, `Media`, and `Account`
- Admins can see all torrents and completed media
- Users can see only torrents and completed media they own
- If an admin issues a temporary password for a user, OpenFlux forces that user to change the password immediately after login

### Torrent Management

- Add by magnet URI
- Upload `.torrent` files
- Pause, resume, and delete torrents
- Track download speed, upload speed, ETA, and active time
- View peer counts and peer activity

### File Controls

- Inspect all files inside a torrent
- Mark files as:
  `Don't download`, `Low priority`, `Normal priority`, or `High priority`
- Track per-file progress and downloaded bytes

### Media Library

- Browse completed files by folder
- Download individual files
- Download folders as zip archives
- Stream supported video formats directly in the browser

### Video Player

- Custom player controls
- Keyboard shortcuts
- Subtitle auto-detection
- Subtitle upload from the player
- Responsive control layout for smaller screens

### System Usage

- OpenFlux runtime CPU and memory usage
- Host memory and disk usage
- Download directory footprint
- Multi-core worker visibility

## Production Deployment

### Reverse Proxy With Nginx

For a public deployment, run OpenFlux on a local port such as `4001` and place Nginx in front of it.

Example HTTPS configuration:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 10M;

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

### Firewall

Examples:

```bash
sudo ufw allow 4001/tcp
sudo firewall-cmd --add-port=4001/tcp --permanent
sudo firewall-cmd --reload
```

### Hardening Checklist

Before exposing OpenFlux to the public internet, add:

- At least one private admin account
- HTTPS
- Reverse proxy
- Firewall rules
- Storage limits
- Monitoring and backup strategy

## API Overview

All routes except `GET /api/health`, `GET /api/auth/session`, and `POST /api/auth/login` require authentication.

Health:

- `GET /api/health`

Authentication:

- `GET /api/auth/session`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`

Users:

- `GET /api/users` (admin only)
- `POST /api/users` (admin only)
- `POST /api/users/:id/temporary-password` (admin only)

Settings:

- `GET /api/settings` (admin only)
- `PATCH /api/settings` (admin only)

System:

- `GET /api/system/usage` (admin only)

Torrents:

- `GET /api/torrents`
- `GET /api/torrents/:id`
- `POST /api/torrents/magnet`
- `POST /api/torrents/file`
- `PATCH /api/torrents/:id/files/:fileId`
- `POST /api/torrents/:id/pause`
- `POST /api/torrents/:id/resume`
- `DELETE /api/torrents/:id`

Media:

- `GET /api/media`
- `GET /api/media/:torrentId/files`
- `GET /api/media/:torrentId/folders/download`
- `GET /api/media/:torrentId/files/:fileId/stream`
- `GET /api/media/:torrentId/files/:fileId/download`
- `GET /api/media/:torrentId/files/:fileId/subtitles`
- `POST /api/media/:torrentId/files/:fileId/subtitles`
- `GET /api/media/:torrentId/files/:fileId/subtitles/:subtitleId`

## Development

Install dependencies:

```bash
npm install
npm run client:install
```

Run the backend:

```bash
npm run dev
```

Run the frontend dev server:

```bash
npm run client:dev
```

Build the bundled frontend:

```bash
npm run build
```

Test the global CLI locally:

```bash
npm link
openflux start --host 0.0.0.0 --port 4001
```

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for deployment and runtime issues, including:

- Socket.IO behind HTTPS or reverse proxies
- Admin bootstrap and login issues
- Temporary password and forced password-change flow
- Multi-core session mismatch symptoms
- Media and subtitle loading checks
- Production deployment notes

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## npm Publishing

Suggested publish flow:

```bash
npm install
npm run client:install
npm run build
npm pack --dry-run
npm login
npm publish
```

Before publishing, review:

- [README.md](README.md)
- [PACKAGING.md](PACKAGING.md)
- [LEGAL_NOTICE.md](LEGAL_NOTICE.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [package.json](package.json)

## Roadmap

- aria2 engine support
- Transmission engine support
- FFmpeg transcoding
- Mobile Android app
- PWA support
- Audit log
- Storage quota
- Auto cleanup
