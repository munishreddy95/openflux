# Troubleshooting

## No Admin Account Exists Yet

If the login screen says no admin account exists yet, create one from the server terminal:

```bash
openflux admin create --username admin --password <strong-password>
```

Then reload the login page and sign in with that account.

## Password Change Required Before Continuing

If a user signs in with a temporary password, OpenFlux locks the rest of the application until the password is changed.

Expected behavior:

- the user can reach only the `Account` page
- the header shows `Password update required`
- torrent, media, system, and settings routes stay blocked until the password change succeeds

This is normal and is part of the recovery flow.

## User Forgot Password

OpenFlux does not provide email recovery.

Recovery flow:

1. sign in as an admin
2. open `Settings`
3. find the user account
4. click `Issue temp password`
5. give the shown temporary password to the user

After the user signs in with that password, OpenFlux forces an immediate password change.

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

## Detached Background Mode

If you start OpenFlux with:

```bash
openflux start --detach
```

Then check:

- pid file: `~/.openflux/openflux.pid`
- stdout log: `~/.openflux/logs/openflux.out.log`
- stderr log: `~/.openflux/logs/openflux.err.log`

Useful commands:

```bash
openflux status
openflux stop
openflux stop --force
```

If `status` says OpenFlux is not running but a previous detached start was attempted, inspect the stderr log for the startup failure.

## Requested Port Already In Use

If the configured startup port is already occupied, OpenFlux now tries the next available port automatically.

Expected behavior:

- startup logs print a warning such as:
  `Port 4001 is already in use. OpenFlux is using 4002 instead.`
- the dashboard URL shown after startup reflects the actual port
- detached mode stores the resolved bind info so `openflux status` reports the active URL
