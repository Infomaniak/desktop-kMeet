#!/usr/bin/env bash

# Generate GitHub release notes for a tag release: a "What's Changed" section
# listing every commit between the previous tag and the release tag, plus the
# compare link GitHub renders as "Full Changelog".
#
# Designed for the github-release job of .github/workflows/release.yml, but
# safe to run locally against a full clone (tags + history).
#
# Inputs (environment):
#   GITHUB_REF_NAME    release tag, e.g. 2.1.0-beta.2 (required)
#   GITHUB_SERVER_URL  defaults to https://github.com
#   GITHUB_REPOSITORY  defaults to Infomaniak/desktop-kMeet
#   GH_TOKEN / gh auth optional: when available, authors belonging to the
#     release repository's GitHub organization are @-mentioned (same account
#     mapping GitHub uses on commit pages, up to two API calls per unique
#     author email: commit lookup + membership check, both cached); members
#     the token cannot see fall back to the plain git author name — a fork
#     release page must not ping the whole upstream team at publish time.
# Usage: generate_github_release_notes.sh [output-file]  (default: release-notes.md)
#        generate_github_release_notes.sh --selftest

set -euo pipefail

TAG="${GITHUB_REF_NAME:-}"
SERVER_URL="${GITHUB_SERVER_URL:-https://github.com}"
REPOSITORY="${GITHUB_REPOSITORY:-Infomaniak/desktop-kMeet}"
ORGANIZATION="${REPOSITORY%%/*}"
REPO_URL="${SERVER_URL}/${REPOSITORY}"
OUT_FILE="${1:-release-notes.md}"

# Escape characters that markdown link text would otherwise interpret.
# Discovered on the live GitHub render of release 3.5.3-rc.1:
#   - a "[RM-621599]" bracket pair inside a subject broke the whole link
#     (escaping only "]" left the closing "]" free to close it early)
#   - "<ID>" was swallowed as an HTML tag and vanished from the page
# Portability (GNU sed on ubuntu-22.04 runners vs BSD sed on macOS):
# every output backslash comes from a "\\_" replacement pair (POSIX-defined),
# and patterns stay free of GNU regex extensions. In particular the pattern
# backtick must stay UNESCAPED: in GNU BRE, "\`" is the start-of-buffer
# anchor, not a literal backtick (BSD sed treats both as literal).
escape_markdown() {
    printf '%s' "${1}" | sed \
        -e 's/\\/\\\\/g' \
        -e 's/`/\\`/g' \
        -e 's/\[/\\[/g' \
        -e 's/]/\\]/g' \
        -e 's/</\\</g' \
        -e 's/>/\\>/g'
}

selftest() {
    local failures=0 expected actual
    # expected<TAB>input rows; quoted heredoc keeps backslashes literal.
    while IFS=$'\t' read -r expected input; do
        actual="$(escape_markdown "${input}")"
        if [[ "${actual}" != "${expected}" ]]; then
            echo "FAIL: escape_markdown '${input}' -> '${actual}' (expected '${expected}')" >&2
            failures=1
        fi
    done <<'EOF'
fix(app): Keep default IK server \[RM-621599\]	fix(app): Keep default IK server [RM-621599]
chore: Restore the fixes \<ID\> guidance	chore: Restore the fixes <ID> guidance
use \`npm ci\` and C:\\path	use `npm ci` and C:\path
plain subject stays intact	plain subject stays intact
EOF
    return "${failures}"
}

if [[ "${OUT_FILE:-}" == "--selftest" ]]; then
    if selftest; then
        echo "escape_markdown selftest OK"
        exit 0
    fi
    exit 1
fi

if [[ -z "${TAG:-}" ]]; then
    echo "GITHUB_REF_NAME is empty: release notes must be generated from a tag ref." >&2
    exit 1
fi

if ! git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
    echo "Tag '${TAG}' not found in the local clone (a full checkout is required in CI)." >&2
    exit 1
fi

# Author @-mention needs the gh CLI with a working auth (GH_TOKEN in CI).
# Without it the generation still works, bullets fall back to plain names.
GH_AVAILABLE=""
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    GH_AVAILABLE=1
else
    echo "gh CLI unavailable or unauthenticated: authors are listed by git name, not @handle." >&2
fi

# Resolve the GitHub account a git author email belongs to (the same way
# GitHub attributes commits on the web UI) and keep the @-mention only when
# that account belongs to the release repository's organization. One API
# call per unique author email, cached in a temp file for the whole run.
LOGIN_CACHE="$(mktemp "${TMPDIR:-/tmp}/kmeet-release-logins.XXXXXX")"
trap 'rm -f "${LOGIN_CACHE}"' EXIT

github_mention_for_email() {
    local email="${1}" sha="${2}" login="" mention=""
    mention="$(awk -F'\t' -v e="${email}" '$1 == e { print $3; exit }' "${LOGIN_CACHE}")"
    if awk -F'\t' -v e="${email}" '$1 == e { found=1; exit } END { exit !found }' "${LOGIN_CACHE}"; then
        printf '%s' "${mention}"
        return 0
    fi
    if [[ -n "${GH_AVAILABLE}" ]]; then
        login="$(gh api "repos/${REPOSITORY}/commits/${sha}" \
            --jq '.author.login // .committer.login // ""' 2>/dev/null || true)"
        if [[ -n "${login}" ]] && { gh api "orgs/${ORGANIZATION}/members/${login}" >/dev/null 2>&1 \
            || gh api "orgs/${ORGANIZATION}/public_members/${login}" >/dev/null 2>&1; }; then
            # Tokens without org access (the CI GITHUB_TOKEN) cannot list
            # membership: public_members is unauthenticated, so an org member
            # whose org visibility is Public still gets mentioned in CI.
            mention="${login}"
        fi
    fi
    printf '%s\t%s\t%s\n' "${email}" "${login}" "${mention}" >> "${LOGIN_CACHE}"
    printf '%s' "${mention}"
}

# Previous stable tag: nearest ancestor of the commit before the release tag,
# skipping prerelease tags (-rc. / -beta. / -alpha. / -mas.) and legacy "v*"
# tags from the Mattermost era. Duplicate tags sharing a commit (e.g. a stale
# 3.5.2-beta.1 on top of 3.5.2) can hijack a bare describe walk, so the
# excludes are required. Semantics match the kDrive releases: a release (or
# rc) lists every commit since the last stable tag, not since the last rc.
PREVIOUS_TAG="$(git describe --tags --abbrev=0 \
    --match '[0-9]*' \
    --exclude '*-rc.*' --exclude '*-beta.*' --exclude '*-alpha.*' \
    --exclude '*-mas.*' --exclude 'v*' \
    "${TAG}^" 2>/dev/null || true)"

if [[ -n "${PREVIOUS_TAG}" ]]; then
    log_range=("${PREVIOUS_TAG}..${TAG}")
else
    echo "No previous tag found, listing the whole history up to ${TAG}." >&2
    log_range=("${TAG}")
fi

{
    printf "%s\n\n" "## What's Changed"

    # %x1f field separators keep lines intact even when subjects contain | or -
    # or padded spaces. Loop input never carries a trailing newline issue:
    # read -r stops at the last entry.
    while IFS=$'\x1f' read -r sha author email subject; do
        [[ -z "${sha}" ]] && continue
        handle="$(github_mention_for_email "${email}" "${sha}")"
        if [[ -n "${handle}" ]]; then
            by="@${handle}"
        else
            # Same escaping as subjects: a git name could contain markdown.
            by="$(escape_markdown "${author}")"
        fi
        printf -- '- [%s](%s/commit/%s) by %s\n' "$(escape_markdown "${subject}")" "${REPO_URL}" "${sha}" "${by}"
    done < <(git log --no-merges --format='%H%x1f%an%x1f%aE%x1f%s' "${log_range[@]}")

    if [[ -n "${PREVIOUS_TAG}" ]]; then
        printf '\n**Full Changelog**: [%s...%s](%s/compare/%s...%s)\n' \
            "${PREVIOUS_TAG}" "${TAG}" "${REPO_URL}" "${PREVIOUS_TAG}" "${TAG}"
    fi
} > "${OUT_FILE}"

echo "Release notes written to ${OUT_FILE}"
