/* global __dirname, process */

const {
    BrowserWindow,
    app,
    shell,
    ipcMain
} = require('electron');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const windowStateKeeper = require('electron-window-state');
const _ = require('lodash');
const {
    initPopupsConfigurationMain,
    getPopupTarget,
    setupAlwaysOnTopMain,
    setupPowerMonitorMain,
    setupScreenSharingMain
} = require('jitsi-meet-electron-utils');
const path = require('path');
const URI = require('url');
const APP_VERSION = require('./package.json').version;

autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

/**
 * When in development mode:
 * - Load debug utilities (don't open the DevTools window by default though)
 * - Enable automatic reloads
 */
if (isDev) {
    require('electron-debug')({ showDevTools: true });
    require('electron-reload')(path.join(__dirname, 'build'));
}

/**
 * The window object that will load the iframe with Jitsi Meet.
 * IMPORTANT: Must be defined as global in order to not be garbage collected
 * acidentally.
 */
let mainWindow = null;

/**
 * Add protocol data
 */
const PROTOCOL_PREFIX = 'kmeet'; // this could be configurable later
const PROTOCOL_SURPLUS = `${PROTOCOL_PREFIX}://`;
let rendererReady = false;
let protocolDataForFrontApp = null;

/**
 * Opens new window with index.html(Jitsi Meet is loaded in iframe there).
 */
function createJitsiMeetWindow() {
    // Check for Updates.
    autoUpdater.checkForUpdatesAndNotify();

    // Load the previous window state with fallback to defaults.
    const windowState = windowStateKeeper({
        defaultWidth: 1300,
        defaultHeight: 900
    });

    // Path to root directory.
    const basePath = isDev ? __dirname : app.getAppPath();

    // URL for index.html which will be our entry point.
    const indexURL = URI.format({
        pathname: path.resolve(basePath, './build/index.html'),
        protocol: 'file:',
        slashes: true
    });

    // Options used when creating the main Jitsi Meet window.
    const options = {
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        icon: path.resolve(basePath, './resources/icons/icon_512x512.png'),
        defaultWidth: 1300,
        defaultHeight: 900,
        show: false,
        webPreferences: {
            enableBlinkFeatures: 'RTCInsertableStreams',
            enableRemoteModule: true,
            nativeWindowOpen: true,
            nodeIntegration: true,
            preload: path.resolve(basePath, './build/preload.js'),
            partition: 'persist:main'
        }
    };

    mainWindow = new BrowserWindow(options);
    windowState.manage(mainWindow);
    mainWindow.loadURL(indexURL);

    mainWindow.webContents.userAgent += ` Infomaniak/${APP_VERSION}`;

    mainWindow.webContents.session.webRequest.onHeadersReceived({ urls: [ '*://*/*' ] },
        (d, c) => {
            if (d.url.indexOf('welcomePage.joinButton.clicked') > 0) {
                const joinUrl = new URL(d.url);
                const searchParams = JSON.parse(joinUrl.searchParams.get('cvar'));

                if (rendererReady) {
                    let joinHost = _.findLast(searchParams, o => o[0] === 'room_hostname')[1].replace(/https?:\/\//, '');
                    let joinRoom = _.findLast(searchParams, o => o[0] === 'conference_name')[1];
                    let joinSubject = _.findLast(searchParams, o => o[0] === 'room_subject')[1];

                    try {
                        // eslint-disable-next-line no-new
                        const roomUrl = new URL(joinSubject);

                        joinHost = roomUrl.origin.replace(/https?:\/\//, '');
                        joinRoom = roomUrl.pathname.replace('/', '');
                        joinSubject = joinRoom;
                    } catch (error) {}

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

            if (d.responseHeaders['x-frame-options']) {
                delete d.responseHeaders['x-frame-options'];
            }

            c({ cancel: false,
                responseHeaders: d.responseHeaders });
        }
    );

    initPopupsConfigurationMain(mainWindow);
    setupAlwaysOnTopMain(mainWindow);
    setupPowerMonitorMain(mainWindow);
    setupScreenSharingMain(mainWindow, 'Infomaniak kMeet');

    mainWindow.webContents.on('new-window', (event, url, frameName) => {
        const target = getPopupTarget(url, frameName);

        if (!target || target === 'browser') {
            event.preventDefault();
            shell.openExternal(url);
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    /**
     * This is for windows [win32]
     * so when someone tries to enter something like jitsi://test
     *  while app is closed
     * it will trigger this event below
     */
    handleProtocolCall(process.argv[1]);
}

/**
 * Handler when protocol call us
 * if there is second argument and it starts
 * with PROTOCOL_PREFIX+ "://" its what we need
 *
 * create conference object and send it to front app
 */
function handleProtocolCall(fullProtocolCall) {
    // don't touch when something is bad
    if (
        !fullProtocolCall
        || fullProtocolCall.trim() === ''
        || fullProtocolCall.indexOf(PROTOCOL_SURPLUS) !== 0
    ) {
        return;
    }

    const inputURL = fullProtocolCall.replace(PROTOCOL_SURPLUS, '');

    protocolDataForFrontApp = inputURL;
    if (rendererReady) {
        mainWindow
            .webContents
            .send('protocol-data-msg', protocolDataForFrontApp);
    }
}

/**
 * Force Single Instance Application.
 */
const gotInstanceLock = app.requestSingleInstanceLock();

if (!gotInstanceLock) {
    app.quit();
    process.exit(0);
}

app.commandLine.appendSwitch('disable-site-isolation-trials');

// We need to disable hardware acceleration because its causes the screenshare to flicker.
app.commandLine.appendSwitch('disable-gpu');

app.allowRendererProcessReuse = false;

app.setAsDefaultProtocolClient(PROTOCOL_PREFIX);

/**
 * Run the application.
 */
app.on('open-url', event => {
    event.preventDefault();
});

app.on('activate', () => {
    if (mainWindow === null) {
        createJitsiMeetWindow();
    }
});

app.on('certificate-error',
    // eslint-disable-next-line max-params
    (event, webContents, url, error, certificate, callback) => {
        if (url.startsWith('https://localhost')) {
            event.preventDefault();
            callback(true);
        } else {
            callback(false);
        }
    }
);

app.on('ready', createJitsiMeetWindow);

app.on('second-instance', () => {
    /**
     * If someone creates second instance of the application, set focus on
     * existing window.
     */
    if (mainWindow) {
        mainWindow.isMinimized() && mainWindow.restore();
        mainWindow.focus();
    }
});

app.on('window-all-closed', () => {
    app.quit();
});

// remove so we can register each time as we run the app.
app.removeAsDefaultProtocolClient(PROTOCOL_PREFIX);

// If we are running a non-packaged version of the app && on windows
if (isDev && process.platform === 'win32') {
    // Set the path of electron.exe and your app.
    // These two additional parameters are only available on windows.
    app.setAsDefaultProtocolClient(
        PROTOCOL_PREFIX,
        process.execPath,
        [ path.resolve(process.argv[1]) ]
    );
} else {
    app.setAsDefaultProtocolClient(PROTOCOL_PREFIX);
}

/**
 * This is for mac [darwin]
 * so when someone tries to enter something like jitsi://test
 * it will trigger this event below
 */
app.on('open-url', (event, data) => {
    event.preventDefault();
    handleProtocolCall(data);
});

/**
 * This is for windows [win32]
 * so when someone tries to enter something like jitsi://test
 *  while app is opened
 * it will trigger this event below
 */
app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
        if (isDev) {
            handleProtocolCall(commandLine[4]);
        } else {
            handleProtocolCall(commandLine[3]);
        }
    }
});

/**
 * This is our own event
 * to notify main.js [this]
 * that front app is ready to receive
 * conference room and change to it
 */
ipcMain.on('renderer-ready', () => {
    rendererReady = true;
    if (protocolDataForFrontApp) {
        mainWindow
            .webContents
            .send('protocol-data-msg', protocolDataForFrontApp);
    }
});
