#!/bin/bash
set -eu

VERSION="$1"

cat <<-MD
#### $VERSION Published to GitHub Releases

https://github.com/Infomaniak/jitsi-meet-electron/releases/tag/$VERSION
MD
