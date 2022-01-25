/* global __dirname, process */

const {
    BrowserWindow,
    app,
    ipcMain,
    Menu,
    Tray,
    shell
} = require('electron');
const jc = require('electron-json-config').factory();
const debug = require('electron-debug');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const windowStateKeeper = require('electron-window-state');
const _ = require('lodash');
const {
    initPopupsConfigurationMain,
    getPopupTarget,
    RemoteControlMain,
    RemoteDrawMain,
    setupAlwaysOnTopMain,
    setupPowerMonitorMain,
    setupScreenSharingMain
} = require('@jitsi/electron-sdk');
const path = require('path');
const URI = require('url');
const config = require('./app/features/config');
const { openExternalLink } = require('./app/features/utils/openExternalLink');
const pkgJson = require('./package.json');
const APP_VERSION = require('./package.json').version;
const i18n = require('./app/i18n').default;

// const Store = require('electron-store');
const AutoLaunch = require('auto-launch');
const autoLauncher = new AutoLaunch({
    name: 'kMeet',
    isHidden: true
});

let redirectedToLogin = false;
const showDevTools = false; // Boolean(process.env.SHOW_DEV_TOOLS) || (process.argv.indexOf('--show-dev-tools') > -1);

const ENABLE_REMOTE_CONTROL = true;

// We need this because of https://github.com/electron/electron/issues/18214
app.commandLine.appendSwitch('disable-site-isolation-trials');

// This allows BrowserWindow.setContentProtection(true) to work on macOS.
// https://github.com/electron/electron/issues/19880
app.commandLine.appendSwitch('disable-features', 'IOSurfaceCapturer');

// Enable Opus RED field trial.
app.commandLine.appendSwitch('force-fieldtrials', 'WebRTC-Audio-Red-For-Opus/Enabled/');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');

// Needed until robot.js is fixed: https://github.com/octalmage/robotjs/issues/580
// app.allowRendererProcessReuse = false;

// Enable optional PipeWire support.
if (!app.commandLine.hasSwitch('enable-features')) {
    app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
}

autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';


if (typeof jc.get('enableAutoLauncher') === 'undefined') {
    jc.set('enableAutoLauncher', 1);
    autoLauncher.enable();
}

if (jc.get('enableAutoLauncher') === 1) {
    autoLauncher.enable();
}


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
                    label: i18n.t('menu.about'),
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
                {
                    label: i18n.t('menu.quit'),
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        mainWindow.close();
                    }
                }
            ]
        },
        {
            label: i18n.t('menu.edit'),
            submenu: [ {
                label: i18n.t('menu.undo'),
                accelerator: 'CmdOrCtrl+Z',
                selector: 'undo:'
            },
            {
                label: i18n.t('menu.redo'),
                accelerator: 'Shift+CmdOrCtrl+Z',
                selector: 'redo:'
            },
            {
                type: 'separator'
            },
            {
                label: i18n.t('menu.cut'),
                accelerator: 'CmdOrCtrl+X',
                selector: 'cut:'
            },
            {
                label: i18n.t('menu.copy'),
                accelerator: 'CmdOrCtrl+C',
                selector: 'copy:'
            },
            {
                label: i18n.t('menu.paste'),
                accelerator: 'CmdOrCtrl+V',
                selector: 'paste:'
            },
            {
                label: i18n.t('menu.selectAll'),
                accelerator: 'CmdOrCtrl+A',
                selector: 'selectAll:'
            } ]
        },
        {
            label: i18n.t('menu.view'),
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' }
            ]
        },
        {
            label: i18n.t('menu.window'),
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
        autoUpdater.checkForUpdatesAndNotify();
    }

    // Load the previous window state with fallback to defaults.
    const windowState = windowStateKeeper({
        defaultWidth: 1300,
        defaultHeight: 900
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


    // You can open silently the app by giving `--silent` arg
    let silent = process && process.argv && (process.argv.indexOf('--silent') >= 0 || process.argv.indexOf('--hidden') >= 0);

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
            enableBlinkFeatures: 'RTCInsertableStreams,WebAssemblySimd',
            contextIsolation: false,
            nativeWindowOpen: true,
            partition: 'persist:main',
            nodeIntegration: false,
            preload: path.resolve(basePath, './build/preload.js')
        }
    };

    mainWindow = new BrowserWindow(options);
    windowState.manage(mainWindow);
    mainWindow.loadURL(indexURL);

    mainWindow.webContents.userAgent += ` Infomaniak/${APP_VERSION}`;

    mainWindow.webContents.session.webRequest.onHeadersReceived({ urls: [ '*://*/*' ] },
        (d, c) => {
            if (d.url.indexOf('auth/login/meet') > 0 || d.url.indexOf('auth/logout') > 0) {
                redirectedToLogin = '/';

                if (d.url.indexOf('auth/login/meet') > 0) {
                    const joinUrl = new URL(d.url);

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
                const joinUrl = new URL(d.url);
                const searchParams = JSON.parse(joinUrl.searchParams.get('cvar'));

                if (rendererReady) {
                    let joinHost = _.findLast(
                        searchParams, o => o[0] === 'room_hostname'
                    )[1].replace(/https?:\/\//, '');
                    let joinRoom = _.findLast(searchParams, o => o[0] === 'conference_name')[1];
                    let joinSubject = _.findLast(searchParams, o => o[0] === 'room_subject')[1];

                    try {
                        // eslint-disable-next-line no-new
                        const roomUrl = new URL(joinSubject);

                        joinHost = roomUrl.origin.replace(/https?:\/\//, '');
                        joinRoom = roomUrl.pathname.replace('/', '');
                        joinSubject = joinRoom;
                    } catch (error) { }

                    mainWindow
                        .webContents
                        .send(
                            'protocol-data-msg',
                            `${joinHost}/${joinRoom}` ///${joinSubject}
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

            if (d.responseHeaders['x-frame-options']) {
                delete d.responseHeaders['x-frame-options'];
            }

            c({
                cancel: false,
                responseHeaders: d.responseHeaders
            });
        }
    );


    initPopupsConfigurationMain(mainWindow);
    setupAlwaysOnTopMain(mainWindow);
    setupPowerMonitorMain(mainWindow);
    setupScreenSharingMain(mainWindow, config.default.appName, pkgJson.build.appId);
    if (ENABLE_REMOTE_CONTROL) {
        new RemoteControlMain(mainWindow); // eslint-disable-line no-new
    }

    new RemoteDrawMain(mainWindow); // eslint-disable-line no-new

    mainWindow.webContents.on('new-window', (event, url, frameName) => {
        const target = getPopupTarget(url, frameName);

        if (!target || target === 'browser') {
            event.preventDefault();
            openExternalLink(url);
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    mainWindow.once('ready-to-show', () => {

        console.log('ready to show', silent);
        if (!silent && !wasOpenedAtLogin()) {
            if (process.platform === 'darwin') {
                app.dock.show();
            }
            mainWindow.show();
        } else {
            if (process.platform === 'darwin') {
                app.dock.hide();
            }

            silent = false; // silent must be used only once
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

    console.log(autoLauncherEnable);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: i18n.t('menu.createMeeting'),
            click: () => {
                handleClickOnTrayMenu('protocol-data-create-meeting');
            }
        },
        {
            label: i18n.t('menu.joinMeeting'),
            click: () => {
                handleClickOnTrayMenu('protocol-data-join-meeting');
            }
        },
        {
            label: i18n.t('menu.planMeeting'),
            click: () => {
                handleClickOnTrayMenu('protocol-data-plan-meeting');
            }
        },
        { type: 'separator' },

        // { label: 'Paramètres' },
        {
            label: i18n.t('menu.openOnBoot'),
            type: 'checkbox',
            checked: autoLauncherEnable,
            click: () => {
                autoLauncher.isEnabled().then(isEnabled => {
                    console.log(isEnabled);
                    autoLauncherEnable = isEnabled;
                    if (isEnabled) {
                        autoLauncher.disable();
                        jc.set('enableAutoLauncher', 0);
                    } else {
                        autoLauncher.enable();
                        jc.set('enableAutoLauncher', 1);
                    }
                })
                    .catch(err => {
                        throw err;
                    });
            }
        },
        {
            label: i18n.t('menu.openKmeet'),
            click: () => {
                shell.openExternal('https://kmeet.infomaniak.com');
            }
        },
        {
            label: `${i18n.t('menu.aboutKmeet')} ${APP_VERSION}`,
            click: () => {
                shell.openExternal('https://www.infomaniak.com/kmeet');
            }
        },
        { type: 'separator' },
        {
            label: i18n.t('menu.quit'),
            click: () => {
                app.quit();
                process.exit(0);
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
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

// if (isDev) {
//     app.on('ready', createWebRTCInternalsWindow);
// }

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
