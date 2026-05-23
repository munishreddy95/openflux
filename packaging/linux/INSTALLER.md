# Linux Release Packaging

OpenFlux now supports a Linux release layer on top of the portable bundle.

This layer does not change the application core. It packages an existing Linux bundle into:

- a `.tar.gz` release artifact
- a matching `systemd` unit file template

## What It Produces

When run against a Linux bundle, the packaging script creates:

- `dist/openflux-<version>-linux-<arch>.tar.gz`
- `dist/openflux-<version>-linux-<arch>.service`

The tarball contains the full OpenFlux bundle with:

- bundled Node runtime
- OpenFlux launcher
- server files
- built frontend assets
- installed dependencies

## Build Flow

Run these commands on Linux:

```bash
npm install
npm run build
npm run bundle:current
npm run package:linux
```

Or use the combined flow:

```bash
npm run release:linux
```

## Suggested VPS Install Steps

1. Copy the generated tarball to the server.
2. Create a service user:

```bash
sudo useradd --system --home /var/lib/openflux --create-home --shell /usr/sbin/nologin openflux
```

3. Create the install directory:

```bash
sudo mkdir -p /opt/openflux
```

4. Extract the release:

```bash
sudo tar -xzf openflux-<version>-linux-<arch>.tar.gz -C /opt/openflux
```

5. Set ownership:

```bash
sudo chown -R openflux:openflux /opt/openflux /var/lib/openflux
```

6. Copy the generated service file:

```bash
sudo cp dist/openflux-<version>-linux-<arch>.service /etc/systemd/system/openflux.service
```

7. Reload and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openflux
```

## Service File Notes

The generated service file assumes:

- install root: `/opt/openflux`
- extracted folder: `/opt/openflux/openflux-<version>-linux-<arch>`
- runtime user: `openflux`
- OpenFlux data home: `/var/lib/openflux`

If you need a different install root, regenerate the service file with:

```bash
npm run package:linux -- --install-root /srv/openflux
```

## Useful Flags

Use a custom bundle directory:

```bash
npm run package:linux -- --bundle-dir /tmp/openflux-1.0.1-linux-x64
```

Write output somewhere else:

```bash
npm run package:linux -- --output-dir /tmp/openflux-release
```
