## Agent skills

### Issue tracker

Issues live as GitLab issues on `gitlab.infomaniak.ch` (self-hosted), using the `glab` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five canonical triage labels as-is: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` at the repo root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.

### Upstream divergence

This is a fork of jitsi/jitsi-meet-electron. Read `docs/upstream-divergence.md` **before** merging upstream or touching branding, main-process, packaging, or CI files: it lists fork-owned files to preserve, the security model, and the sync recipe.
