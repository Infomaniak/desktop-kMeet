# kMeet Desktop

Infomaniak's fork of [jitsi/jitsi-meet-electron](https://github.com/jitsi/jitsi-meet-electron) — the codebase behind the [kMeet](https://kmeet.infomaniak.com) desktop applications.

## Fork status

- **Last upstream commit synced:** [`4029211`](https://github.com/jitsi/jitsi-meet-electron/commit/402921113078351e428962310978c5c6a309b0ac) — *integrate screen sharing tracker window (#197), 2020-04-03*
- **Upstream changes since the fork** (everything we have not synced): [`4029211...master` compare on GitHub](https://github.com/jitsi/jitsi-meet-electron/compare/402921113078351e428962310978c5c6a309b0ac...master)
- **kMeet SDK:** the kMeet-specific SDK lives in its own repository: [`Infomaniak/desktop-kMeet-sdk`](https://github.com/Infomaniak/desktop-kMeet-sdk)
- **Source of truth:** the internal GitLab repository. This GitHub repository mirrors `main` only (commits, not tags).

## Development

Requires Node 16 (pinned in `.nvmrc`).

```bash
nvm use
npm i
npm start
```

Other useful scripts:

```bash
npm run lint    # eslint + flow
npm test        # mocha unit tests
npm run build   # production webpack build (main + renderer)
```

## Local builds

Local builds are **unsigned** and published nowhere (electron-builder defaults to `--publish=never` outside CI). Code signing, notarization and update-feed publishing only happen in CI — see [Releases](#releases).

| Platform | Command | Output |
|---|---|---|
| macOS | `npm run dist` | `.app` / `.dmg` (unsigned) |
| Windows | `npm run dist:nsis` | NSIS installer `.exe` |
| Windows | `npm run dist:msi` | `.msi` (no auto-update feed) |

Linux builds additionally require the usual Electron native dependencies (`libxtst-dev`, `libpng++-dev`), then run `npm run dist`.

## Releases

Releases are **triggered by pushing a semver tag to GitHub** (`1.2.3`, `1.2.3-beta.0`, …), which runs the [`release-kmeet`](.github/workflows/release.yml) workflow:

- signed + notarized macOS build, signed Windows NSIS/MSI builds (DigiCert SM), Linux build
- auto-update feeds (`latest.yml` for stable, `beta.yml`/`alpha.yml` for pre-releases)
- a **draft GitHub release** on the tag (marked pre-release for `alpha`/`beta` builds)

Since tags are not synced by the mirror, publish a release manually:

```bash
git tag 1.2.3 && git push origin 1.2.3   # keep the tag on GitLab (source of truth)
git push Github 1.2.3                    # triggers the release workflow on GitHub
```
