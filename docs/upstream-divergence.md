# Upstream divergence: jitsi/jitsi-meet-electron → Infomaniak kMeet

This repo is Infomaniak's fork of [jitsi/jitsi-meet-electron](https://github.com/jitsi/jitsi-meet-electron), the codebase behind the kMeet desktop apps. Read this before merging upstream or modifying anything that touches main-process, branding, packaging, or CI.

**Last upstream sync:** tag `2026.8.0` (commit `0991361`), merged in `97c2248` onto `main`, then hardened in `83f6ba4` (GitLab CI), `52f3bb5` (host allow-list) and `71d1aac` (SDK v10 migration: `contextIsolation: true` + ESM entries).

## How to tell fork code from upstream code

```bash
# Diff between upstream tip and our branch = everything we own/change:
git diff 0991361..HEAD

# Commits that are ours only:
git log --oneline 0991361..HEAD

# Upstream is fetched from its own remote (add it if missing):
git remote add jitsi https://github.com/jitsi/jitsi-meet-electron
```

The merge commit `97c2248` body documents exactly what was adopted from upstream and what was preserved from the fork — read it before resolving merge conflicts.

## Identity & branding (never overwrite with upstream values)

| Concern | Upstream value | Fork value | File |
|---|---|---|---|
| App name | Jitsi Meet | `kMeet` | `app/features/config/index.ts`, `package.json` (`productName`) |
| Package name | jitsi-meet-electron | `kmeet-desktop` | `package.json` |
| URL protocol | `jitsi-meet://` | `kmeet://` | `app/features/config/index.ts` (`appProtocolPrefix`) |
| Default server | meet.jit.si | `https://kmeet.infomaniak.com` | `app/features/config/index.ts` |
| SDK | `jitsi-meet-electron-sdk` | `@infomaniak/jitsi-meet-electron-sdk` | `package.json`, `main.ts`, `app/preload/preload.ts` |
| Branding assets | Jitsi icons/logo | kMeet icons/logo | `resources/`, `app/images/` |

Note: the working tree often carries an **uncommitted local override** of `defaultServerURL` pointing at `kmeet.preprod.dev.infomaniak.ch`. Never commit it. `git status` before committing anything in `app/features/config/`.

## Architecture: what we deliberately do differently

| Area | Upstream (jitsi) | This fork (kMeet) |
|---|---|---|
| Window model | Two windows (`meeting.html`, welcome window) | **Single window** with react-router |
| Homepage | Native Welcome screen | **iframe-embedded kMeet web homepage** (`app/features/welcome/`) |
| Login | SSO popup | **Login redirect flow** via `protocol-data-homepage` IPC (`app/features/login/`) |
| Auto-update | electron-updater feeds | **Custom `autoUpdate.js` + `notifications.js`** at repo root |
| i18n | Renderer only (`app/i18n/`) | Renderer **+ main process** (`i18nManager.js`, `i18n/` at root — tray menus etc., 5 languages) |
| Tray / autostart | Basic | Tray menu (create/join/plan meeting), `auto-launch` + `electron-store` |
| Error tracking | none | **Self-hosted Sentry** (`@sentry/electron`, `sentry-symbols.js`) |
| Remote control | consent dialog (upstream) | Upstream consent **+ RemoteDraw integration through the Infomaniak SDK** |
| License | Apache-2.0 (`LICENSE`) | Proprietary — upstream `LICENSE` is deleted |
| Onboarding | (removed upstream) | Removed — keep it removed |

`main.ts` is ~700 lines and heavily fork-customized (tray, i18n, auto-update, `kmeet://` protocol routing with host validation, RemoteDraw). Treat upstream changes to `main.ts` as **advisory**: re-apply the *idea* on top of our structure, do not take their file.

## Security model (fork additions — do not regress)

- **`kmeet://` host allow-list** — `app/features/utils/hostAllowList.ts` (+ `test/hostAllowList.test.ts`). A link like `kmeet://attacker.invalid/room` must not load an arbitrary HTTPS origin as the meeting iframe (the remote-control bridge trusts whatever page is loaded). Hosts are validated in `main.ts` before the payload reaches the renderer; when adding a new kMeet deployment host, update `ALLOWED_HOSTS`.
- **Sandbox** — `contextIsolation: true`, `nodeIntegration: false` (`main.ts`). The Infomaniak SDK preload bridge uses `contextBridge` (resolved by `71d1aac`); do not revert to `nodeIntegration`.
- **Remote-control consent** — native `dialog.showMessageBox` gate before any remote-control session (from upstream, ported in the SDK).

## Build, packaging, CI

- **Packaging** — `electron-builder.json` is Infomaniak's (channels, feeds, publish targets). Signing/notarization: `notarize.js`, `scripts/sign.ps1`, `scripts/winsign.js`, `scripts/setup-keylocker.ps1` (DigiCert SM), `entitlements.mac.plist`.
- **CI split** — GitLab (`gitlab.infomaniak.ch`, source of truth) runs `.gitlab-ci.yml` (lint + type-check only). The GitHub mirror runs `.github/workflows/` for builds and the `release-kmeet` release pipeline (tags trigger it; see README Releases).
- **Toolchain** — Electron 43, Node ≥ 24, esbuild (`esbuild.js`), TypeScript with a few legacy `.js` survivors (`app/features/recent-list/*.js`, `app/features/settings/*.js`). `.js` is allowed only where it already exists; new code is TypeScript.
- **Tests** — `npm test` compiles `test/*.test.ts` only. `test/hostAllowList.test.js` is a dead legacy duplicate; don't copy it.

## Fork-owned files (preserve during upstream merges)

Root: `autoUpdate.js`, `notifications.js`, `i18nManager.js`, `i18n/`, `sentry-symbols.js`, `electron-builder.json`, `entitlements.mac.plist`, `notarize.js`, `.env.example`, `.gitlab-ci.yml`, `.gitlab/`, `AGENTS.md`, `docs/`
`scripts/`: `sign.ps1`, `winsign.js`, `verify.ps1`, `setup-keylocker.ps1`, `Makefile.ps1`, `cp_artifacts.sh`, `installer.nsh`, `linux-sandbox-fix.js`, `generate_release_post.sh`
`app/`: `features/config/index.ts`, `features/login/`, `features/utils/hostAllowList.ts`, `preload/preload.ts` (SDK bridge), `types.ts`
CI: `.github/workflows/release.yml` + `build-*-test.yml`, `debug-s3.yml`
Tests: `test/hostAllowList.test.ts`

## Upstream sync recipe

1. `git fetch jitsi` and pick the target tag (upstream uses CalVer, e.g. `2026.8.0`).
2. Merge into the integration branch (historically `merge-upstream`, fast-forwarded to `main` after validation).
3. Resolve conflicts with `97c2248`'s body as the checklist: adopt upstream's modernization, re-apply every "Preserved from Infomaniak fork" item above.
4. `main.ts` and `app/features/` will conflict — fork wins structurally, upstream wins for bug fixes it introduces.
5. After merge: `npm run lint && npm run type-check && npm test` (GitLab CI runs the first two).
6. Check `package.json` for upstream dependency bumps (Electron, electron-builder, react) — apply them, keep `@infomaniak/jitsi-meet-electron-sdk` and `electron-store@5`, `auto-launch`.
7. Update this file's "Last upstream sync" line.

## Known traps

- **SDK is a local sibling**: `"@infomaniak/jitsi-meet-electron-sdk": "file:../jitsi-meet-electron-sdk"`. The SDK repo (Infomaniak fork of jitsi-meet-electron-sdk) must be checked out next to this repo, or `npm ci` fails. SDK itself lives at `Infomaniak/desktop-kMeet-sdk` (see README).
- **README "Fork status" section is stale** (still says last sync 2020-04-03 / commit `4029211`) — this file supersedes it until README is updated.
- **Uncommitted preprod override** in `app/features/config/index.ts` may sit in the working tree (see Identity section).
- Upstream deleted `CLAUDE.md` during their TS migration; we keep agent docs in `AGENTS.md` + `docs/agents/` instead.
