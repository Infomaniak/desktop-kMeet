/* global __dirname */

const {
    BrowserWindow,
    app,
    ipcMain,
    Menu,
    Tray,
    shell
} = require('electron');
const URI = require('url');
const contextMenu = require('electron-context-menu');
const debug = require('electron-debug');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const windowStateKeeper = require('electron-window-state');
const _ = require('lodash');
const {
    initPopupsConfigurationMain,
    getPopupTarget,
    RemoteControlMain,
    setupAlwaysOnTopMain,
    setupPowerMonitorMain,
    setupScreenSharingMain,
    RemoteDrawMain
} = require('@infomaniak/jitsi-meet-electron-sdk');
const path = require('path');
const process = require('process');
const URL = require('url');
const config = require('./app/features/config');
const { openExternalLink } = require('./app/features/utils/openExternalLink');
const pkgJson = require('./package.json');
const builderJson = require('./electron-builder.json');

const Store = require('electron-store');
const AutoLaunch = require('auto-launch');
const { default: updateManager } = require('./autoUpdate');
const { default: i18nManager, localizeMessage } = require('./i18nManager');

const showDevTools = Boolean(process.env.SHOW_DEV_TOOLS) || (process.argv.indexOf('--show-dev-tools') > -1);

const ENABLE_REMOTE_CONTROL = true;

const autoLauncher = new AutoLaunch({
    name: 'kMeet',
    isHidden: true
});

if (!isDev) {
    const { init } = require('@sentry/electron');

    init({
        dsn: 'https://9ea9e1754d9b40be10f2f7c28ff07185@sentry-kchat.infomaniak.com/9'
    });
}

let redirectedToLogin = false;

// We need this because of https://github.com/electron/electron/issues/18214
app.commandLine.appendSwitch('disable-site-isolation-trials');

// This allows BrowserWindow.setContentProtection(true) to work on macOS.
// https://github.com/electron/electron/issues/19880
app.commandLine.appendSwitch('disable-features', 'DesktopCaptureMacV2,IOSurfaceCapturer');

// Enable Opus RED field trial.
app.commandLine.appendSwitch('force-fieldtrials', 'WebRTC-Audio-Red-For-Opus/Enabled/');

// Wayland: Enable optional PipeWire and window decorations support.
if (!app.commandLine.hasSwitch('enable-features')) {
    app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer,WaylandWindowDecorations');
}

autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

const store = new Store();

if (!store.get('enableAutoLauncher')) {
    store.set('enableAutoLauncher', 1);
    autoLauncher.enable();
}

i18nManager.setLocale('fr');

// Enable context menu so things like copy and paste work in input fields.
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

// Enable DevTools also on release builds to help troubleshoot issues. Don't
// show them automatically though.
debug({
    isEnabled: true,
    showDevTools
});

/**
 * When in development mode:
 * - Enable automatic reloads
 */
if (isDev) {
    require('electron-reload')(path.join(__dirname, 'build'));
}

/**
 * The window object that will load the iframe with Jitsi Meet.
 * IMPORTANT: Must be defined as global in order to not be garbage collected
 * acidentally.
 */
let mainWindow = null;

let webrtcInternalsWindow = null;

/**
 * Add protocol data
 */
const appProtocolSurplus = `${config.default.appProtocolPrefix}://`;
let rendererReady = false;
let protocolDataForFrontApp = null;
let tray = null;

/**
 * Sets the application menu. It is hidden on all platforms except macOS because
 * otherwise copy and paste functionality is not available.
 */
function setApplicationMenu() {
    if (process.platform === 'darwin') {
        const template = [ {
            label: app.name,
            submenu: [
                {
                    label: localizeMessage('menu.about'),
                    role: 'about'
                },
                { type: 'separator' },
                {
                    role: 'services',
                    submenu: []
                },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { label: localizeMessage('menu.quit'),
                    role: 'quit' }
            ]
        }, {
            label: localizeMessage('menu.edit'),
            submenu: [ {
                label: localizeMessage('menu.undo'),
                accelerator: 'CmdOrCtrl+Z',
                selector: 'undo:'
            },
            {
                label: localizeMessage('menu.redo'),
                accelerator: 'Shift+CmdOrCtrl+Z',
                selector: 'redo:'
            },
            {
                type: 'separator'
            },
            {
                label: localizeMessage('menu.cut'),
                accelerator: 'CmdOrCtrl+X',
                selector: 'cut:'
            },
            {
                label: localizeMessage('menu.copy'),
                accelerator: 'CmdOrCtrl+C',
                selector: 'copy:'
            },
            {
                label: localizeMessage('menu.paste'),
                accelerator: 'CmdOrCtrl+V',
                selector: 'paste:'
            },
            {
                label: localizeMessage('menu.selectAll'),
                accelerator: 'CmdOrCtrl+A',
                selector: 'selectAll:'
            } ]
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

/**
 * @returns {string}
 */
function getAppPath() {
    // Path to root directory.
    return isDev ? __dirname : app.getAppPath();
}

/**
 * Opens new window with index.html(Jitsi Meet is loaded in iframe there).
 */
function createJitsiMeetWindow() {

    // Check for Updates.
    if (!process.mas) {
        // autoUpdater.checkForUpdatesAndNotify();

        setTimeout(() => {
            updateManager._checkForUpdates();
        }, 5000);
    }

    // Load the previous window state with fallback to defaults.
    const windowState = windowStateKeeper({
        defaultWidth: 1300,
        defaultHeight: 900,
        fullScreen: false
    });


    setApplicationMenu();

    // Path to root directory.
    const basePath = getAppPath();

    // URL for index.html which will be our entry point.
    const indexURL = URI.format({
        pathname: path.resolve(basePath, './build/index.html'),
        protocol: 'file:',
        slashes: true
    });

    // Options used when creating the main Jitsi Meet window.
    // Use a preload script in order to provide node specific functionality
    // to a isolated BrowserWindow in accordance with electron security
    // guideline.
    const options = {
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
            contextIsolation: false,
            nodeIntegration: false,
            preload: path.resolve(basePath, './build/preload.js'),
            sandbox: false
        }
    };

    const windowOpenHandler = ({ url, frameName }) => {
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

    // Block access to file:// URLs.
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

    // Block redirects.
    const allowedRedirects = [
        'http:',
        'https:',
        'ws:',
        'wss:'
    ];

    mainWindow.webContents.addListener('will-redirect', (ev, url) => {
        const requestedUrl = new URL.URL(url);

        if (!allowedRedirects.includes(requestedUrl.protocol)) {
            console.warn(`Disallowing redirect to ${url}`);
            ev.preventDefault();
        }
    });

    mainWindow.webContents.userAgent += ` Infomaniak/${pkgJson.version}`;

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

                    mainWindow
                        .webContents
                        .send(
                            'protocol-data-homepage',
                            redirectUri
                        );
                }
            }

            if (d.url.indexOf('welcomePage.joinButton.clicked') > 0) {
                const joinUrl = new URL.URL(d.url);
                const searchParams = JSON.parse(joinUrl.searchParams.get('cvar'));

                if (rendererReady) {
                    let joinHost = _.findLast(
                        searchParams, o => o[0] === 'room_hostname'
                    )[1].replace(/https?:\/\//, '');
                    const joinRoom = _.findLast(searchParams, o => o[0] === 'conference_name')[1];
                    const joinSubject = _.findLast(searchParams, o => o[0] === 'room_subject')[1];

                    try {
                        // eslint-disable-next-line no-new
                        const roomUrl = new URL.URL(`${config.default.defaultServerURL}/${joinSubject}`);

                        joinHost = roomUrl.origin.replace(/https?:\/\//, '');

                        // joinRoom = roomUrl.pathname.replace('/', '');
                        // joinSubject = joinRoom;
                    } catch (error) {
                        console.log(error);
                    }

                    mainWindow
                        .webContents
                        .send(
                            'protocol-data-msg',
                            `${joinHost}/${joinRoom}/${joinSubject}`
                        );
                }
            }

            if (d.responseHeaders['set-cookie']) {
                for (let i = 0; i < d.responseHeaders['set-cookie'].length; i++) {
                    if (d.responseHeaders['set-cookie'][i].indexOf('samesite=lax') !== -1) {
                        d.responseHeaders['set-cookie'][i] = d.responseHeaders['set-cookie'][i].replace(
                            'samesite=lax',
                            'samesite=none; secure'
                        );
                    }
                }
            }

            delete d.responseHeaders['x-frame-options'];

            if (d.responseHeaders['content-security-policy']) {
                const cspFiltered = d.responseHeaders['content-security-policy'][0]
                    .split(';')
                    .filter(x => x.indexOf('frame-ancestors') === -1)
                    .join(';');

                d.responseHeaders['content-security-policy'] = [ cspFiltered ];
            }

            c({
                cancel: false,
                responseHeaders: d.responseHeaders
            });
        }
    );

    mainWindow.webContents.on('new-window', (event, url, frameName) => {
        console.log('new window', url, frameName);
        const target = getPopupTarget(url, frameName);

        if (!target || target === 'browser') {
            event.preventDefault();
            openExternalLink(url);
        }
    });

    // Block opening any external applications.
    mainWindow.webContents.session.setPermissionRequestHandler((_, permission, callback, details) => {
        if (permission === 'openExternal') {
            console.warn(`Disallowing opening ${details.externalURL}`);
            callback(false);

            return;
        }

        callback(true);
    });

    initPopupsConfigurationMain(mainWindow);
    setupAlwaysOnTopMain(mainWindow, null, windowOpenHandler);
    setupPowerMonitorMain(mainWindow);
    setupScreenSharingMain(mainWindow, config.default.appName, builderJson.appId);
    if (ENABLE_REMOTE_CONTROL) {
        new RemoteControlMain(mainWindow); // eslint-disable-line no-new
    }

    new RemoteDrawMain(mainWindow); // eslint-disable-line no-new

    mainWindow.on('closed', () => {
        console.log('closed');
        mainWindow = null;
    });

    // LEGACY V1
    // mainWindow.once('ready-to-show', () => {
    //     console.log(`wasOpenedAtLogin: ${wasOpenedAtLogin()}`);

    //     let wasOpenedAtLoginHandler = wasOpenedAtLogin;

    //     if (wasOpenedAtLoginHandler()) {
    //         if (process.platform === 'darwin') {
    //             app.dock.hide();
    //         }

    //         wasOpenedAtLoginHandler = () => false; // was openedAtLogin must only be triggered first time app launched
    //     } else {
    //         if (process.platform === 'darwin') {
    //             app.dock.show();
    //         }
    //         if (mainWindow.isMinimized()) {
    //             mainWindow.restore();
    //         }
    //         mainWindow.show();
    //     }
    // });

    mainWindow.once('ready-to-show', () => {
        if (!wasOpenedAtLogin()) {
            mainWindow.show();
        }
    });

    /**
     * When someone tries to enter something like jitsi-meet://test
     *  while app is closed
     * it will trigger this event below
     */
    handleProtocolCall(process.argv.pop());
}

/**
 * WasOpenedAtLogin
 * @returns boolean
 */
function wasOpenedAtLogin() {
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

/**
 * @param event
 */
function handleClickOnTrayMenu(event) {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }

        mainWindow.show();
        mainWindow.webContents.send(event);
    }

    if (app.isReady() && mainWindow === null) {
        createJitsiMeetWindow();
        mainWindow.once('ready-to-show', () => {
            mainWindow
                .webContents
                .send(event);
        });
    }
}

/**
 * Create the tray menu
 */
async function createTrayMenu() {
    const basePath = getAppPath();

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

        // { label: 'Paramètres' },
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
    tray.on('click', e => {
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

/**
 * Opens new window with WebRTC internals.
 */
function createWebRTCInternalsWindow() {
    const options = {
        minWidth: 800,
        minHeight: 600,
        show: true
    };

    webrtcInternalsWindow = new BrowserWindow(options);
    webrtcInternalsWindow.loadURL('chrome://webrtc-internals');
}

/**
 * Handler for application protocol links to initiate a conference.
 */
function handleProtocolCall(fullProtocolCall) {
    try {
        console.log(`handle protocol call with ${fullProtocolCall}, app is ready ${app.isReady()} and mainWindow exists ${Boolean(mainWindow)}`);
    } catch (e) {
        console.log(`handle protocol call error ${JSON.stringify(e)}`);
    }

    // don't touch when something is bad
    if (
        !fullProtocolCall
        || fullProtocolCall.trim() === ''
        || fullProtocolCall.indexOf(appProtocolSurplus) !== 0
    ) {
        return;
    }

    const inputURL = fullProtocolCall.replace(appProtocolSurplus, '');

    if (app.isReady() && mainWindow === null) {
        createJitsiMeetWindow();
    } else if (mainWindow) {
        if (process.platform === 'darwin') {
            app.dock.show();
        }
        mainWindow.show();
    }

    protocolDataForFrontApp = inputURL;

    if (rendererReady) {
        mainWindow
            .webContents
            .send('protocol-data-msg', inputURL);
    }
}

/**
 * Force Single Instance Application.
 * Handle this on darwin via LSMultipleInstancesProhibited in Info.plist as below does not work on MAS
 */
const gotInstanceLock = process.platform === 'darwin' ? true : app.requestSingleInstanceLock();

if (!gotInstanceLock) {
    app.quit();
    process.exit(0);
}

/**
 * Run the application.
 */

app.on('activate', () => {
    if (mainWindow === null) {
        createJitsiMeetWindow();
    }
});

app.on('certificate-error',
    // eslint-disable-next-line max-params
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
    createJitsiMeetWindow();

    await createTrayMenu();
});

if (isDev) {
    app.on('ready', createWebRTCInternalsWindow);
}

app.on('second-instance', (event, commandLine) => {
    /**
     * If someone creates second instance of the application, set focus on
     * existing window.
     */
    if (mainWindow) {
        mainWindow.isMinimized() && mainWindow.restore();
        mainWindow.focus();

        /**
         * This is for windows [win32]
         * so when someone tries to enter something like jitsi-meet://test
         * while app is opened it will trigger protocol handler.
         */
        handleProtocolCall(commandLine.pop());
    }
});

app.on('window-all-closed', () => {
    // app.quit();
    if (process.platform === 'darwin') {
        app.dock.hide();
    }
});

// remove so we can register each time as we run the app.
app.removeAsDefaultProtocolClient(config.default.appProtocolPrefix);

// If we are running a non-packaged version of the app && on windows
if (isDev && process.platform === 'win32') {
    // Set the path of electron.exe and your app.
    // These two additional parameters are only available on windows.
    app.setAsDefaultProtocolClient(
        config.default.appProtocolPrefix,
        process.execPath,
        [ path.resolve(process.argv[1]) ]
    );
} else {
    app.setAsDefaultProtocolClient(config.default.appProtocolPrefix);
}

/**
 * This is for mac [darwin]
 * so when someone tries to enter something like jitsi-meet://test
 * it will trigger this event below
 */
app.on('open-url', (event, data) => {
    event.preventDefault();
    handleProtocolCall(data);
});

/**
 * This is to notify main.js [this] that front app is ready to receive messages.
 */
ipcMain.on('renderer-ready', () => {
    rendererReady = true;
    if (protocolDataForFrontApp) {
        mainWindow
            .webContents
            .send('protocol-data-msg', protocolDataForFrontApp);
    }
});

/**
 * Handle opening external links in the main process.
 */
ipcMain.on('jitsi-open-url', (event, someUrl) => {
    openExternalLink(someUrl);
});
