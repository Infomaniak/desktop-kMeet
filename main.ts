import {
    getPopupTarget,
    initPopupsConfigurationMain,
    setupPictureInPictureMain,
    setupPowerMonitorMain,
    setupRemoteControlMain,
    setupRemoteDrawMain,
    setupScreenSharingMain
} from '@infomaniak/jitsi-meet-electron-sdk/main';
import { init as sentryInit } from '@sentry/electron';
import AutoLaunch from 'auto-launch';
import {
    BrowserWindow,
    Menu,
    Tray,
    app,
    dialog,
    ipcMain,
    session,
    shell
} from 'electron';
import contextMenu from 'electron-context-menu';
import debug from 'electron-debug';
import isDev from 'electron-is-dev';
import log from 'electron-log';
import electronReload from 'electron-reload';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';
import windowStateKeeper from 'electron-window-state';
import * as path from 'path';
import * as URL from 'url';

import config from './app/features/config';
import { isAllowedHost } from './app/features/utils/hostAllowList';
import { openExternalLink } from './app/features/utils/openExternalLink';
import updateManager from './autoUpdate';
import builderJson from './electron-builder.json';
import i18nManager, { localizeMessage } from './i18nManager';
import pkgJson from './package.json';

const rootDir = path.resolve(__dirname, '..');

const showDevTools = Boolean(process.env.SHOW_DEV_TOOLS) || (process.argv.indexOf('--show-dev-tools') > -1);
const disableAutoupdate = Boolean(process.env.DISABLE_UPDATE) || false;

const autoLauncher = new AutoLaunch({
    name: 'kMeet',
    isHidden: true
});

if (!isDev) {
    sentryInit({
        dsn: 'https://9ea9e1754d9b40be10f2f7c28ff07185@sentry-kchat.infomaniak.com/9'
    });
}

let redirectedToLogin: string | false = false;

app.commandLine.appendSwitch('disable-site-isolation-trials');

const disabledFeatures = [
    'ThumbnailCapturerMac:capture_mode/sc_screenshot_manager',
    'ScreenCaptureKitPickerScreen',
    'ScreenCaptureKitStreamPickerSonoma'
];

app.commandLine.appendSwitch('disable-features', disabledFeatures.join(','));

app.commandLine.appendSwitch('force-fieldtrials', 'WebRTC-Audio-Red-For-Opus/Enabled/');

if (!app.commandLine.hasSwitch('enable-features')) {
    app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer,WaylandWindowDecorations');
}

autoUpdater.logger = log;
log.transports.file.level = 'info';

const store = new Store();

if (!store.get('enableAutoLauncher')) {
    store.set('enableAutoLauncher', 1);
    autoLauncher.enable();
}

if (!i18nManager.setLocale(app.getLocale())) {
    i18nManager.setLocale(app.getLocaleCountryCode());
}

contextMenu({
    showLookUpSelection: false,
    showSearchWithGoogle: false,
    showCopyImage: false,
    showCopyImageAddress: false,
    showSaveImage: false,
    showSaveImageAs: false,
    showInspectElement: true,
    showServices: false
});

debug({
    isEnabled: true,
    showDevTools
});

if (isDev) {
    electronReload(path.join(rootDir, 'build'));
}

let mainWindow: BrowserWindow | null = null;
let webrtcInternalsWindow: BrowserWindow | null = null;

const appProtocolSurplus = `${config.appProtocolPrefix}://`;
let rendererReady = false;
let protocolDataForFrontApp: string | null = null;
let tray: Tray | null = null;

function setApplicationMenu() {
    if (process.platform === 'darwin') {
        const template: Electron.MenuItemConstructorOptions[] = [ {
            label: app.name,
            submenu: [
                {
                    label: localizeMessage('menu.about'),
                    role: 'about'
                },
                { type: 'separator' },
                {
                    role: 'services',
                    submenu: [] as Electron.MenuItemConstructorOptions[]
                },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' } as unknown as Electron.MenuItemConstructorOptions,
                { role: 'unhide' },
                { type: 'separator' },
                { label: localizeMessage('menu.quit'), role: 'quit' }
            ]
        }, {
            label: localizeMessage('menu.edit'),
            submenu: [
                {
                    label: localizeMessage('menu.undo'),
                    accelerator: 'CmdOrCtrl+Z',
                    selector: 'undo:'
                } as Electron.MenuItemConstructorOptions,
                {
                    label: localizeMessage('menu.redo'),
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    selector: 'redo:'
                } as Electron.MenuItemConstructorOptions,
                { type: 'separator' },
                {
                    label: localizeMessage('menu.cut'),
                    accelerator: 'CmdOrCtrl+Z',
                    selector: 'cut:'
                } as Electron.MenuItemConstructorOptions,
                {
                    label: localizeMessage('menu.copy'),
                    accelerator: 'CmdOrCtrl+C',
                    selector: 'copy:'
                } as Electron.MenuItemConstructorOptions,
                {
                    label: localizeMessage('menu.paste'),
                    accelerator: 'CmdOrCtrl+V',
                    selector: 'paste:'
                } as Electron.MenuItemConstructorOptions,
                {
                    label: localizeMessage('menu.selectAll'),
                    accelerator: 'CmdOrCtrl+A',
                    selector: 'selectAll:'
                } as Electron.MenuItemConstructorOptions
            ]
        }, {
            label: '&Window',
            role: 'window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        } ];

        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    } else {
        Menu.setApplicationMenu(null);
    }
}

function createJitsiMeetWindow() {
    setApplicationMenu();

    if (!process.mas && !disableAutoupdate) {
        setTimeout(() => {
            updateManager._checkForUpdates();
        }, 5000);
    }

    const windowState = windowStateKeeper({
        defaultWidth: 1300,
        defaultHeight: 900,
        fullScreen: false
    });

    const basePath = isDev ? rootDir : app.getAppPath();

    const indexURL = URL.format({
        pathname: path.resolve(basePath, './build/index.html'),
        protocol: 'file:',
        slashes: true
    });

    const options: Electron.BrowserWindowConstructorOptions = {
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        icon: path.resolve(basePath, './resources/icon.png'),
        minWidth: 800,
        minHeight: 600,
        fullscreen: false,
        show: false,
        webPreferences: {
            enableBlinkFeatures: 'WebAssemblyCSP',
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.resolve(basePath, './build/preload.js'),
            sandbox: false
        }
    };

    const windowOpenHandler = ({ url, frameName }: { frameName: string; url: string; }): Electron.WindowOpenHandlerResponse => {
        const target = getPopupTarget(url, frameName);

        if (!target || target === 'browser') {
            openExternalLink(url);

            return { action: 'deny' };
        }

        if (target === 'electron') {
            return { action: 'allow' };
        }

        return { action: 'deny' };
    };

    mainWindow = new BrowserWindow(options);
    windowState.manage(mainWindow);
    mainWindow.loadURL(indexURL);

    mainWindow.webContents.setWindowOpenHandler(windowOpenHandler);

    if (isDev) {
        mainWindow.webContents.session.clearCache();
    }

    const fileFilter = {
        urls: [ 'file://*' ]
    };

    mainWindow.webContents.session.webRequest.onBeforeSendHeaders(fileFilter, (details, callback) => {
        const requestedPath = path.resolve(URL.fileURLToPath(details.url));
        const appBasePath = path.resolve(basePath);

        if (!requestedPath.startsWith(appBasePath)) {
            callback({ cancel: true });
            console.warn(`Rejected file URL: ${details.url}`);

            return;
        }

        callback({ cancel: false });
    });

    const infomaniakUA = ` Infomaniak/${pkgJson.version}`;

    // In Electron 43, iframe navigator.userAgent inherits from the session, not
    // from webContents — override it per frame (restores the sign-in flow).
    mainWindow.webContents.on('frame-created', (_event, { frame }) => {
        if (!frame) {
            return;
        }
        frame.once('dom-ready', () => {
            frame.executeJavaScript(
                // The ready handler already appends the suffix to the session
                // UA, which frames inherit — guard so it is never doubled.
                `navigator.userAgent.includes('${infomaniakUA}') || Object.defineProperty(navigator, 'userAgent', { value: navigator.userAgent + '${infomaniakUA}', configurable: true });`
            ).catch(() => undefined);
        });
    });

    mainWindow.webContents.session.webRequest.onHeadersReceived({ urls: [ '*://*/*' ] },
        (d, c) => {
            if (d.url.indexOf('auth/login/meet') > 0 || d.url.indexOf('auth/logout') > 0) {
                redirectedToLogin = '/';

                if (d.url.indexOf('auth/login/meet') > 0) {
                    const joinUrl = new URL.URL(d.url);

                    redirectedToLogin = joinUrl.searchParams.get('uri');
                }
            }

            if (redirectedToLogin !== false) {
                if (d.url.indexOf('welcomePage.viewed') > 0 || d.url.indexOf(`/meet/conference${redirectedToLogin}/options`) > 0) {
                    const redirectUri = redirectedToLogin;

                    redirectedToLogin = false;

                    mainWindow?.webContents.send('protocol-data-homepage', redirectUri);
                }
            }

            if (d.url.indexOf('welcomePage.joinButton.clicked') > 0) {
                // The web app sends the matomo cvar param as an object
                // {"1":["name","value"],...}, not as an array of pairs —
                // Object.values() normalizes both shapes into pairs.
                try {
                    const joinUrl = new URL.URL(d.url);
                    const cvar = Object.values(
                        JSON.parse(joinUrl.searchParams.get('cvar') ?? '{}') as Record<string, [ string, string ]>
                    );

                    if (rendererReady && mainWindow) {
                        // Scans backwards like lodash's findLast did; written
                        // as a plain loop because Array.prototype.findLast is
                        // ES2023 and tsconfig lib is ES2022.
                        const findCvar = (name: string) => {
                            for (let i = cvar.length - 1; i >= 0; i--) {
                                if (cvar[i][0] === name) {
                                    return cvar[i][1] ?? '';
                                }
                            }

                            return '';
                        };
                        let joinHost = findCvar('room_hostname').replace(/https?:\/\//, '');
                        const joinRoom = findCvar('conference_name');
                        const joinSubject = findCvar('room_subject');

                        try {
                            const roomUrl = new URL.URL(`${config.defaultServerURL}/${joinSubject}`);

                            joinHost = roomUrl.origin.replace(/https?:\/\//, '');
                        } catch (error) {
                            console.log(error);
                        }

                        mainWindow.webContents.send(
                            'protocol-data-msg',
                            `${joinHost}/${joinRoom}/${joinSubject}`
                        );
                    }
                } catch (error) {
                    log.error('Failed to parse joinButton cvar payload', error);
                }
            }

            const responseHeaders = d.responseHeaders ?? {};

            if (responseHeaders['set-cookie']) {
                for (let i = 0; i < responseHeaders['set-cookie'].length; i++) {
                    if (responseHeaders['set-cookie'][i].indexOf('samesite=lax') !== -1) {
                        responseHeaders['set-cookie'][i] = responseHeaders['set-cookie'][i].replace(
                            'samesite=lax',
                            'samesite=none; secure'
                        );
                    }
                }
            }

            delete responseHeaders['x-frame-options'];

            if (responseHeaders['content-security-policy']) {
                const cspFiltered = responseHeaders['content-security-policy'][0]
                    .split(';')
                    .filter(x => x.indexOf('frame-ancestors') === -1)
                    .join(';');

                responseHeaders['content-security-policy'] = [ cspFiltered ];
            }

            if (responseHeaders['Content-Security-Policy']) {
                const cspFiltered = responseHeaders['Content-Security-Policy'][0]
                    .split(';')
                    .filter(x => x.indexOf('frame-ancestors') === -1)
                    .join(';');

                responseHeaders['Content-Security-Policy'] = [ cspFiltered ];
            }

            c({
                cancel: false,
                responseHeaders
            });
        }
    );

    mainWindow.webContents.addListener('will-redirect', (ev, url) => {
        const allowedRedirects = [ 'http:', 'https:', 'ws:', 'wss:' ];
        const requestedUrl = new URL.URL(url);

        if (!allowedRedirects.includes(requestedUrl.protocol)) {
            console.warn(`Disallowing redirect to ${url}`);
            ev.preventDefault();
        }
    });

    mainWindow.webContents.session.setPermissionRequestHandler((_contents, permission, callback, details) => {
        if (permission === 'openExternal') {
            console.warn(`Disallowing opening ${(details as { externalURL?: string; }).externalURL}`);
            callback(false);

            return;
        }

        callback(true);
    });

    initPopupsConfigurationMain(mainWindow, windowOpenHandler);
    setupPictureInPictureMain(mainWindow);
    setupPowerMonitorMain(mainWindow);
    setupScreenSharingMain(mainWindow, config.appName, builderJson.appId);
    setupRemoteControlMain(mainWindow, { requestConsent: requestRemoteControlConsent });

    setupRemoteDrawMain(mainWindow);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.once('ready-to-show', () => {
        if (!wasOpenedAtLogin()) {
            mainWindow?.show();
        }
    });

    handleProtocolCall(process.argv.pop());
}

async function requestRemoteControlConsent(): Promise<boolean> {
    if (!mainWindow) {
        return false;
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: [ localizeMessage('remoteControl.deny', 'Deny'), localizeMessage('remoteControl.allow', 'Allow') ],
        defaultId: 0,
        cancelId: 0,
        message: localizeMessage('remoteControl.message', 'Allow remote control of this computer?'),
        detail: localizeMessage('remoteControl.detail', 'A meeting participant is requesting control of your mouse and keyboard.')
    });

    return response === 1;
}

function wasOpenedAtLogin(): boolean {
    try {
        if (process.platform === 'darwin') {
            const loginSettings = app.getLoginItemSettings();

            return loginSettings.wasOpenedAtLogin;
        }

        return app.commandLine.hasSwitch('hidden');
    } catch {
        return false;
    }
}

function handleClickOnTrayMenu(event: string) {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }

        mainWindow.show();
        mainWindow.webContents.send(event);
    }

    if (app.isReady() && mainWindow === null) {
        createJitsiMeetWindow();
        mainWindow?.once('ready-to-show', () => {
            mainWindow?.webContents.send(event);
        });
    }
}

async function createTrayMenu() {
    const basePath = isDev ? rootDir : app.getAppPath();

    let iconPath = path.resolve(basePath, './resources/icons/icon@2x.png');

    if (process.platform === 'darwin') {
        iconPath = path.resolve(basePath, './resources/icons/iconTemplate@2x.png');
    }

    tray = new Tray(iconPath);

    let autoLauncherEnable = await autoLauncher.isEnabled();

    const trayContextMenu = Menu.buildFromTemplate([
        {
            label: localizeMessage('menu.createMeeting'),
            click: () => {
                handleClickOnTrayMenu('protocol-data-create-meeting');
            }
        },
        {
            label: localizeMessage('menu.joinMeeting'),
            click: () => {
                handleClickOnTrayMenu('protocol-data-join-meeting');
            }
        },
        {
            label: localizeMessage('menu.planMeeting'),
            click: () => {
                handleClickOnTrayMenu('protocol-data-plan-meeting');
            }
        },
        { type: 'separator' },
        {
            label: localizeMessage('menu.openOnBoot'),
            type: 'checkbox',
            checked: autoLauncherEnable,
            click: () => {
                autoLauncher.isEnabled().then(isEnabled => {
                    autoLauncherEnable = isEnabled;
                    if (isEnabled) {
                        autoLauncher.disable();
                    } else {
                        autoLauncher.enable();
                    }
                })
                .catch(err => {
                    throw err;
                });
            }
        },
        {
            label: localizeMessage('menu.openKmeet'),
            click: () => {
                shell.openExternal('https://kmeet.infomaniak.com');
            }
        },
        {
            label: localizeMessage('menu.aboutKmeet2', 'About kMeet', { version: pkgJson.version }),
            click: () => {
                shell.openExternal('https://www.infomaniak.com/kmeet');
            }
        },
        { type: 'separator' },
        {
            label: localizeMessage('menu.quit'),
            click: () => {
                app.quit();
                process.exit(0);
            }
        }
    ]);

    tray.setContextMenu(trayContextMenu);
    tray.on('click', () => {
        if (process.platform !== 'darwin') {
            if (app.isReady() && mainWindow === null) {
                createJitsiMeetWindow();
            } else if (mainWindow) {
                if (mainWindow.isMinimized()) {
                    mainWindow.restore();
                }
                mainWindow.show();
            }
        }
    });
    tray.setIgnoreDoubleClickEvents(true);
}

function createWebRTCInternalsWindow() {
    webrtcInternalsWindow = new BrowserWindow({
        minWidth: 800,
        minHeight: 600,
        show: true
    });
    webrtcInternalsWindow.loadURL('chrome://webrtc-internals');
}

function handleProtocolCall(fullProtocolCall?: string) {
    if (
        !fullProtocolCall
        || fullProtocolCall.trim() === ''
        || fullProtocolCall.indexOf(appProtocolSurplus) !== 0
    ) {
        return;
    }

    const inputURL = fullProtocolCall.replace(appProtocolSurplus, '');

    // Validate the host before forwarding the protocol payload to the
    // renderer. Without this check, a link like kmeet://attacker.invalid/room
    // would load an attacker-controlled HTTPS origin as the meeting iframe,
    // which could then drive the remote control bridge without user consent.
    const hostPart = inputURL.split('/')[0];

    if (!isAllowedHost(hostPart)) {
        console.warn(`Rejected protocol call with unauthorized host: ${hostPart}`);

        return;
    }

    if (app.isReady() && mainWindow === null) {
        createJitsiMeetWindow();
    } else if (mainWindow) {
        if (process.platform === 'darwin') {
            app.dock.show();
        }
        mainWindow.show();
    }

    protocolDataForFrontApp = inputURL;

    if (rendererReady && mainWindow) {
        mainWindow.webContents.send('protocol-data-msg', inputURL);
    }
}

const gotInstanceLock = process.platform === 'darwin' ? true : app.requestSingleInstanceLock();

if (!gotInstanceLock) {
    app.quit();
    process.exit(0);
}

app.on('activate', () => {
    if (mainWindow === null) {
        createJitsiMeetWindow();
    }
});

app.on('certificate-error',
    (event, webContents, url, error, certificate, callback) => {
        if (isDev) {
            event.preventDefault();
            callback(true);
        } else {
            callback(false);
        }
    }
);

app.on('ready', async () => {
    session.defaultSession.setUserAgent(
        session.defaultSession.getUserAgent() + ` Infomaniak/${pkgJson.version}`
    );

    createJitsiMeetWindow();
    await createTrayMenu();
});

if (isDev) {
    app.on('ready', createWebRTCInternalsWindow);
}

app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
        mainWindow.isMinimized() && mainWindow.restore();
        mainWindow.focus();
        handleProtocolCall(commandLine.pop());
    }
});

app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
        app.dock.hide();
    }
});

app.removeAsDefaultProtocolClient(config.appProtocolPrefix);

if (isDev && process.platform === 'win32') {
    app.setAsDefaultProtocolClient(
        config.appProtocolPrefix,
        process.execPath,
        [ path.resolve(process.argv[1]) ]
    );
} else {
    app.setAsDefaultProtocolClient(config.appProtocolPrefix);
}

app.on('open-url', (event, data) => {
    event.preventDefault();
    handleProtocolCall(data);
});

ipcMain.on('renderer-ready', () => {
    rendererReady = true;
    if (protocolDataForFrontApp && mainWindow) {
        mainWindow.webContents.send('protocol-data-msg', protocolDataForFrontApp);
    }
});

ipcMain.on('jitsi-open-url', (event, someUrl) => {
    openExternalLink(someUrl);
});
