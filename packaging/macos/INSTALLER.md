# macOS Release Packaging

OpenFlux now supports a macOS app-wrapper layer on top of the portable bundle.

This layer does not change the application core. It wraps an existing macOS bundle into:

- an `OpenFlux.app` application bundle
- a zipped app archive for release upload
- an optional `.dmg` if built on macOS with `hdiutil`

## What It Produces

When run against a macOS bundle, the packaging script creates:

- `dist/OpenFlux.app`
- `dist/openflux-<version>-darwin-<arch>-app.zip`
- optional: `dist/openflux-<version>-darwin-<arch>.dmg`

The `.app` bundle contains the full OpenFlux runtime and launches OpenFlux through Terminal so the server process remains visible and controllable.

## Build Flow

Run these commands on macOS:

```bash
npm install
npm run build
npm run bundle:current
npm run package:macos
```

Or use the combined flow:

```bash
npm run release:macos
```

If you also want a DMG:

```bash
npm run package:macos -- --dmg
```

## How The App Launches

OpenFlux is still a server application, not a native windowed desktop UI.

The generated `OpenFlux.app`:

- opens Terminal
- starts the bundled OpenFlux runtime on `http://localhost:8080`
- opens the local browser URL shortly after launch

## Useful Flags

Use a custom bundle directory:

```bash
npm run package:macos -- --bundle-dir /tmp/openflux-1.0.1-darwin-arm64
```

Write output somewhere else:

```bash
npm run package:macos -- --output-dir /tmp/openflux-release
```

Create a DMG:

```bash
npm run package:macos -- --dmg
```

## Important Notes

- Build the bundle on macOS so the embedded Node runtime matches macOS
- Build separately for `x64` and `arm64`
- The app is unsigned by default
- For distribution outside your own machine, you may later want:
  - code signing
  - notarization
  - a custom app icon
