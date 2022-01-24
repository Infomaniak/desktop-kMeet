# kmeet-electron

## Dev

```bash
nvm use 12
npm i
npm start
```

## Build

### OSX

Install Node.js 16 first (or if you use [nvm](https://github.com/nvm-sh/nvm), switch to Node.js 16 by running `nvm use`).

<details><summary>Extra dependencies for Windows</summary>

```bash
npm install --global --production windows-build-tools
```
</details>

<details><summary>Extra dependencies for GNU/Linux</summary>

X11, PNG and zlib development packages are necessary. On Debian-like systems then can be installed as follows:

```bash
sudo apt install libx11-dev zlib1g-dev libpng-dev libxtst-dev
```
</details>

Install all required packages:

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
