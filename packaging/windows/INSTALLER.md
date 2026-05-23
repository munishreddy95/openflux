# Windows Installer Packaging

OpenFlux now supports a Windows installer layer on top of the existing portable bundle.

This layer does not change the application core. It packages an already built Windows bundle into a user-level NSIS installer.

## What It Produces

When run on Windows with NSIS installed, the installer script creates:

- `dist/openflux-<version>-win32-<arch>-setup.exe`

The installer:

- installs OpenFlux into `%LOCALAPPDATA%\Programs\OpenFlux`
- copies the full bundle, including the bundled Node runtime
- creates Start Menu shortcuts
- creates a desktop shortcut
- writes an uninstaller

It does not delete the user's OpenFlux data directory in `%USERPROFILE%\.openflux` when uninstalling.

## Requirements

- Windows
- Node.js
- OpenFlux dependencies installed
- Frontend already built with `npm run build`
- NSIS installed and `makensis` available in `PATH`

## Build Flow

Run these commands on Windows:

```powershell
npm install
npm run build
npm run bundle:current
npm run installer:windows
```

Or use the combined flow:

```powershell
npm run release:windows
```

## How It Works

1. `npm run bundle:current`
   Creates the Windows bundle with:
   - `openflux.cmd`
   - `start-openflux.cmd`
   - `openflux-config.cmd`
   - bundled `runtime\node.exe`

2. `npm run installer:windows`
   Renders an NSIS installer script from:
   - `packaging/windows/openflux-installer.nsi.tpl`

3. `makensis`
   Compiles the rendered script into the final setup `.exe`

## Useful Flags

Generate the installer script without compiling it:

```powershell
npm run installer:windows -- --skip-compile
```

Target a specific bundle directory:

```powershell
npm run installer:windows -- --bundle-dir C:\builds\openflux-1.0.1-win32-x64
```

Write the generated NSIS script and setup exe to a different folder:

```powershell
npm run installer:windows -- --output-dir C:\release
```

## Installer Shortcuts

The installer creates shortcuts for:

- `Start OpenFlux`
- `OpenFlux CLI`
- `View Config`
- `Uninstall OpenFlux`

`Start OpenFlux` launches the default local server on `http://localhost:8080` in its own console window.
