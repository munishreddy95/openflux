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

Start locally:

```bash
openflux start
```

Default address:

- `http://localhost:8080`

Start on a VPS or remote host:

```bash
openflux start --host 0.0.0.0 --port 4001
```

Then open:

- `http://SERVER_IP:4001`

## Common Commands

Start with defaults:

```bash
openflux start
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

Show CLI help:

```bash
openflux help
```

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

## Storage Layout

OpenFlux stores state in the user home directory by default:

- Linux and macOS: `~/.openflux/`
- Windows: `C:\Users\<username>\.openflux\`

Structure:

```text
.openflux/
  downloads/
  uploads/
  db.json
  config.json
  logs/
```

Notes:

- `downloads/` stores completed and partial torrent data
- `uploads/` stores uploaded `.torrent` and subtitle intake files before they are processed
- `db.json` stores application state
- `config.json` stores persisted runtime configuration

## Web UI Features

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

- Authentication
- HTTPS
- Reverse proxy
- Firewall rules
- Storage limits
- Monitoring and backup strategy

## API Overview

Health:

- `GET /api/health`

Settings:

- `GET /api/settings`
- `PATCH /api/settings`

System:

- `GET /api/system/usage`

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
- [LEGAL_NOTICE.md](LEGAL_NOTICE.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [package.json](package.json)

## Roadmap

- Authentication
- User accounts
- aria2 engine support
- Transmission engine support
- FFmpeg transcoding
- Mobile Android app
- PWA support
- Admin dashboard
- Storage quota
- Auto cleanup
- Password protection
