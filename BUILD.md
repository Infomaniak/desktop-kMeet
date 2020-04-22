# Build

## OSX and Windows

```bash
npm run dist
```

## Linux

```bash
docker run --rm -ti \
 --env ELECTRON_CACHE="/root/.cache/electron" \
 --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
 -v ${PWD}:/project \
 -v ${PWD##*/}-node-modules:/project/node_modules \
 -v ~/.cache/electron:/root/.cache/electron \
 -v ~/.cache/electron-builder:/root/.cache/electron-builder \
 electronuserland/builder:12

 apt-get update \
    && apt-get install -y libxtst-dev libpng++-dev \
    && npm i && npm i electron-builder@20.44.4 \
    && npm run dist
```
