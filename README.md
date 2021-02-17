# kmeet-electron

## Dev

```bash
nvm use 12
npm i
npm start
```

## Build

### OSX

```bash
npm run dist
```

```bash
APPLEID=**** APPLEIDPASS=*** AWS_ACCESS_KEY_ID=**** AWS_SECRET_ACCESS_KEY=**** npm run publish
```

### Windows

```bash
$Env:WIN_CSC_LINK="C:\Users\leopold\Documents\codesigning.cer"
npm run publish
```

### Linux

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
