#!/usr/bin/env bash
set -eu

VERSION="$(jq -r '.version' <package.json)"
SRC="${1}"
DEST="${2}"
if [[ ! -d "${DEST}/${VERSION}" ]]; then
    echo "Can't find destination. Creating \"${DEST}/${VERSION}\""
    mkdir -p "${DEST}/${VERSION}"
fi

if [[ ! -d "${SRC}" ]]; then
    echo "Can't find source directory, exiting."
    exit 1
fi

rm -rf "${SRC}/"*-unpacked
# The raw unpacked .app bundle trees (mac/, mac-arm64/) are build
# intermediates: their hundreds of internal files (paks, asar, ...) would
# flood the artifacts and the release page. Only the packaged installers
# and feed files are shipped.
rm -rf "${SRC}/mac" "${SRC}/mac-arm64" "${SRC}/linux" "${SRC}/win"
cp -rv "${SRC}"/* "${DEST}/${VERSION}/"
# cp -v "${SRC}"/*.yml "${DEST}/"

exit 0
