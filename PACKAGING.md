# Packaging OpenFlux

OpenFlux already publishes an npm CLI command named `openflux`. If you also want a downloadable release for people who do not want to run `npm install -g`, the supported format is a portable bundle, not a guaranteed single native binary.

Why this format:

- OpenFlux is a Node.js server application, not a desktop GUI app
- it depends on runtime files, built frontend assets, and installed modules
- the current torrent stack is more reliable in a bundled Node runtime than in a forced one-file executable

## What The Bundle Contains

Each bundle includes:

- OpenFlux server files
- prebuilt frontend assets from `public/`
- installed root `node_modules/`
- a bundled Node.js runtime copied from the machine that created the bundle
- a platform launcher:
  - `openflux` on Linux and macOS
  - `openflux.cmd` on Windows

## Supported Packaging Command

Build the frontend first, then create a bundle for the current machine:

```bash
npm install
npm run build
npm run bundle:current
```

Output:

- bundle folder: `dist/openflux-<version>-<platform>-<arch>/`
- zip archive: `dist/openflux-<version>-<platform>-<arch>.zip`

Example on Linux x64:

```text
dist/
  openflux-1.0.0-linux-x64/
  openflux-1.0.0-linux-x64.zip
```

## Running The Bundle

Linux and macOS:

```bash
cd dist/openflux-<version>-<platform>-<arch>
./openflux start --host 0.0.0.0 --port 4001
```

Windows:

```bat
cd dist\openflux-<version>-<platform>-<arch>
openflux.cmd start --host 0.0.0.0 --port 4001
```

The launcher prefers the bundled Node runtime. If you remove that runtime, it falls back to `node` from the system `PATH`.

## Important Limits

- Build on the same operating system family you plan to ship
- Build separately for each CPU architecture such as `x64` and `arm64`
- The copied Node runtime comes from `process.execPath`, so the bundle reflects the Node build on the packaging machine
- This does not currently create a single-file native `.exe`, `.app`, or ELF binary

## Recommended Release Flow

### GitHub Releases

1. Run `npm run build`
2. Run `npm run bundle:current`
3. Upload the generated `.zip` from `dist/` to a GitHub release
4. Name the asset clearly, for example:
   `openflux-1.0.0-linux-x64.zip`

### Windows Releases

1. Run the same packaging command on a Windows machine
2. Optionally build the NSIS installer:
   `npm run installer:windows`
3. Upload either:
   - `openflux-<version>-win32-x64.zip`
   - `openflux-<version>-win32-x64-setup.exe`
4. For zip releases, tell users to extract the archive and run `start-openflux.cmd`
5. For installer releases, tell users to launch the generated setup exe

### Linux VPS Releases

1. Build on Linux
2. Optionally build the Linux release layer:
   `npm run package:linux`
3. Upload either:
   - `openflux-<version>-linux-<arch>.zip`
   - `openflux-<version>-linux-<arch>.tar.gz`
4. Extract it
5. Start OpenFlux with `./openflux start ...`
6. For long-running VPS use, install the generated `systemd` unit

### macOS Releases

1. Build on macOS
2. Optionally build the macOS app layer:
   `npm run package:macos`
3. Upload either:
   - `openflux-<version>-darwin-<arch>.zip`
   - `openflux-<version>-darwin-<arch>-app.zip`
   - optional: `openflux-<version>-darwin-<arch>.dmg`
4. For bundle-only releases, run `./openflux start ...`
5. For app-wrapper releases, launch `OpenFlux.app`

## Optional Flags

Skip zip creation and leave only the unpacked bundle:

```bash
npm run bundle:current -- --skip-archive
```

Write output somewhere other than `dist/`:

```bash
npm run bundle:current -- --output-dir /tmp/openflux-release
```

## Why Not A Single Native Binary Yet

Tools that promise a one-file Node executable can be fragile with applications that depend on native modules, dynamic runtime assets, and a server process model like OpenFlux. That is why the current supported packaging target is a portable bundle with a bundled Node runtime.

If you later want a true installer or one-click executable, the next realistic step is:

- Windows installer packaging around this bundle
- macOS app wrapper around this bundle
- Linux tarball or deb/rpm packaging around this bundle

## Windows Installer Layer

OpenFlux now includes a Windows installer script path built on top of the bundle flow.

Run this on Windows after building the bundle:

```powershell
npm run installer:windows
```

Or run the complete Windows release flow:

```powershell
npm run release:windows
```

This uses NSIS and generates:

- `dist/openflux-<version>-win32-<arch>-setup.exe`

See [packaging/windows/INSTALLER.md](packaging/windows/INSTALLER.md) for the installer details and requirements.

## Linux Packaging Layer

OpenFlux now includes a Linux packaging step built on top of the bundle flow.

Run this on Linux after building the bundle:

```bash
npm run package:linux
```

Or run the complete Linux release flow:

```bash
npm run release:linux
```

This generates:

- `dist/openflux-<version>-linux-<arch>.tar.gz`
- `dist/openflux-<version>-linux-<arch>.service`

See [packaging/linux/INSTALLER.md](packaging/linux/INSTALLER.md) for the deployment steps.

## macOS App Layer

OpenFlux now includes a macOS app-wrapper step built on top of the bundle flow.

Run this on macOS after building the bundle:

```bash
npm run package:macos
```

Or run the complete macOS release flow:

```bash
npm run release:macos
```

This generates:

- `dist/OpenFlux.app`
- `dist/openflux-<version>-darwin-<arch>-app.zip`
- optional: `dist/openflux-<version>-darwin-<arch>.dmg`

See [packaging/macos/INSTALLER.md](packaging/macos/INSTALLER.md) for the app-wrapper details and limits.
