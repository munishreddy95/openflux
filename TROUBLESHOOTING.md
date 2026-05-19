# Troubleshooting

## Socket.IO Behind HTTPS

If the UI loads over HTTPS but live updates do not connect:

- Confirm `/socket.io/` is proxied to the OpenFlux backend
- Confirm websocket upgrade headers are forwarded
- Confirm the backend port in the proxy config matches the running OpenFlux port

Expected behavior:

- Opening `/socket.io/` directly in a browser may return:
  `{"code":0,"message":"Transport unknown"}`

That is normal. Socket.IO expects query parameters such as:

- `/socket.io/?EIO=4&transport=polling`
- `/socket.io/?EIO=4&transport=websocket`

## `Session ID unknown`

This usually means the Socket.IO handshake and follow-up requests are hitting different servers.

In OpenFlux, that can happen if:

- reverse proxy rules are inconsistent
- multi-core socket routing is broken
- public `/socket.io` traffic is not reaching the same runtime owner

If you suspect multi-core issues, test:

```bash
openflux start --host 0.0.0.0 --port 4001 --cores 1
```

Then compare it with:

```bash
openflux start --host 0.0.0.0 --port 4001 --cores 4
```

## `WebSocket is closed before the connection is established`

Common causes:

- Nginx is not forwarding websocket upgrade headers
- `/socket.io` is routed differently from `/`
- a stateful socket session is crossing workers incorrectly

Check:

- browser DevTools network tab
- backend logs
- Nginx access and error logs

## Suggested Nginx Pattern

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

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
```

## Media File Not Found

If a torrent exists but the media file is unavailable:

- confirm the file is fully downloaded
- confirm the file was not marked as `Don't download`
- confirm the file still exists in the download directory

## Subtitles Not Appearing

Check:

- the video is playable in the browser
- the selected subtitle track is not set to `Off`
- the subtitle file is `.srt`, `.vtt`, or `.webvtt`
- the upload completed successfully

## Multi-Core Runtime Notes

Multi-core mode is useful for UI and API scaling, but it is more sensitive to routing and deployment mistakes than single-process mode.

If you are debugging a production issue:

1. test with `--cores 1`
2. confirm the issue disappears or remains
3. re-enable multi-core after isolating whether the problem is runtime routing or general application behavior
