/* global __dirname */
const electron = require('electron');

const { SCREEN_SHARE_EVENTS_CHANNEL, SCREEN_SHARE_EVENTS, TRACKER_SIZE } = require('./constants');
const { isMac } = require('./utils');

const sourceId2Coordinates = require('../node_addons/sourceId2Coordinates');

/**
 * Main process component that sets up electron specific screen sharing functionality, like screen sharing
 * tracker and window selection.
 * The class will process events from {@link ScreenShareRenderHook} initialized in the renderer, and the
 * always on top screen sharing tracker window.
 */
class ScreenShareMainHook {
    display;
    /**
     * Create ScreenShareMainHook linked to jitsiMeetWindow.
     *
     * @param {BrowserWindow} jitsiMeetWindow - BrowserWindow where jitsi-meet api is loaded.
     * @param {string} identity - Name of the application doing screen sharing, will be displayed in the
     * screen sharing tracker window text i.e. {identity} is sharing your screen.
     */
    constructor(jitsiMeetWindow, identity, osxBundleId) {
        this._jitsiMeetWindow = jitsiMeetWindow;
        this._identity = identity;
        this._onScreenSharingEvent = this._onScreenSharingEvent.bind(this);

        if (osxBundleId && isMac()) {
            this._verifyScreenCapturePermissions(osxBundleId);
        }

        // Listen for events coming in from the main render window and the screen share tracker window.
        electron.ipcMain.on(SCREEN_SHARE_EVENTS_CHANNEL, this._onScreenSharingEvent);

        // Clean up ipcMain handlers to avoid leaks.
        this._jitsiMeetWindow.on('closed', () => {
            electron.ipcMain.removeListener(SCREEN_SHARE_EVENTS_CHANNEL, this._onScreenSharingEvent);
        });
    }

    /**
     * Listen for events coming on the screen sharing event channel.
     *
     * @param {Object} event - Electron event data.
     * @param {Object} data - Channel specific data.
     */
    _onScreenSharingEvent(event, { data }) {
        console.log(data)
        switch (data.name) {
            case SCREEN_SHARE_EVENTS.OPEN_TRACKER:
                console.log(data);
                this._createScreenShareTracker();
                this._createScreenShareBorder(data?.details?.sourceId);
                break;
            case SCREEN_SHARE_EVENTS.CLOSE_TRACKER:
                if (this._screenShareTracker) {
                    this._screenShareTracker.close();
                    this._screenShareTracker = undefined;
                }
                if (this._screenShareBorder) {
                    this._screenShareBorder.close();
                    this._screenShareBorder = undefined;
                }
                break;
            case SCREEN_SHARE_EVENTS.STOP_SCREEN_SHARE:
                this._jitsiMeetWindow.webContents.send(SCREEN_SHARE_EVENTS_CHANNEL, { data });
                break;
            default:
                console.warn(`Unhandled ${SCREEN_SHARE_EVENTS_CHANNEL}: ${data}`);
        }
    }

    /**
     * Opens an always on top window, in the bottom center of the screen, that lets a user know
     * a content sharing session is currently active.
     *
     * @return {void}
     */
    _createScreenShareTracker() {
        if (this._screenShareTracker) {
            return;
        }

        // Display always on top screen sharing tracker window in the center bottom of the screen.
        let display = electron.screen.getPrimaryDisplay();

        this._screenShareTracker = new electron.BrowserWindow({
            height: TRACKER_SIZE.height,
            width: TRACKER_SIZE.width,
            x: (display.workArea.width - TRACKER_SIZE.width) / 2,
            y: display.workArea.height - TRACKER_SIZE.height - 5,
            transparent: true,
            minimizable: true,
            maximizable: false,
            resizable: false,
            alwaysOnTop: true,
            fullscreen: false,
            fullscreenable: false,
            skipTaskbar: false,
            frame: false,
            show: false,
            webPreferences: {
                // TODO: these 3 should be removed.
                contextIsolation: false,
                enableRemoteModule: true,
                nodeIntegration: true
            }
        });

        // Avoid this window from being captured.
        this._screenShareTracker.setContentProtection(true);
        this._screenShareTracker.setVisibleOnAllWorkspaces(true);

        this._screenShareTracker.on('closed', () => {
            this._screenShareTracker = undefined;
        });
        // Prevent newly created window to take focus from main application.
        this._screenShareTracker.once('ready-to-show', () => {
            if (this._screenShareTracker && !this._screenShareTracker.isDestroyed()) {
                this._screenShareTracker.showInactive();
            }
        });

        this._screenShareTracker
            .loadURL(`file://${__dirname}/screenSharingTracker.html?sharingIdentity=${this._identity}`);
    }

    /**
     * Opens an always on top window, in the bottom center of the screen, that lets a user know
     * a content sharing session is currently active.
     *
     * @return {void}
     */
    _createScreenShareBorder(sourceId) {
        this.setDisplay(sourceId);

    // const screen = electron.screen;
    //     console.warn('!!!yolo', screen.getAllDisplays());

        if (this._screenShareBorderTop) {
            return;
        }
        console.log(this.display)
        // Display always on top screen sharing tracker window in the center bottom of the screen.
        // let display = electron.screen.getPrimaryDisplay();
        // console.log(display)
        const display = this.display;

        const bounds = display.bounds;
        this._screenShareBorder = new electron.BrowserWindow({
            x: bounds.x - 2,
            y: bounds.y - 2,
            width: bounds.width + 4,
            height: bounds.height + 4,
            frame: false,
            transparent: true,
            hasShadow: false,
            fullscreenable: false,
            enableLargerThanScreen: true,
            focusable: false,
            skipTaskbar: true,
            alwaysOnTop: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            titleBarStyle: undefined,
            fullscreen: true,
            backgroundColor: '#00FFFFFF',
            movable: false,
            closable: true,
            titleBarStyle: 'customButtonsOnHover',
            webPreferences: {
                nodeIntegration: true
            }
        })

        this._screenShareBorder.setAlwaysOnTop(true, 'screen-saver', 1);
        this._screenShareBorder.setVisibleOnAllWorkspaces(true);
        this._screenShareBorder.setIgnoreMouseEvents(true);
        this._screenShareBorder.loadURL(`file://${__dirname}/screenSharingBorder.html`);
    }

    /**
     * Sets the display metrics(x, y, width, height, scaleFactor, etc...) of the display that will be used for the
     * remote draw.
     *
     * @param {string} sourceId - The source id of the desktop sharing stream.
     * @returns {void}
     */
    setDisplay(sourceId) {
        const { screen } = electron;
        const displays = screen.getAllDisplays();

        switch (displays.length) {
        case 0:
            this.display = undefined;
            break;
        case 1:
            // On Linux probably we'll end up here even if there are
            // multiple monitors.
            this.display = displays[0];
            break;
            // eslint-disable-next-line no-case-declarations
        default: { // > 1 display
            // Remove the type part from the sourceId
            const parsedSourceId = sourceId.replace('screen:', '');
            const coordinates = sourceId2Coordinates(parsedSourceId);

            if (coordinates) {
                // Currently sourceId2Coordinates will return undefined for
                // any OS except Windows. This code will be executed only on
                // Windows.
                const {
                    x,
                    y
                } = coordinates;
                const display
                        = screen.getDisplayNearestPoint({
                            x: x + 1,
                            y: y + 1
                        });

                if (typeof display !== 'undefined') {
                    // We need to use x and y returned from sourceId2Coordinates because the ones returned from
                    // Electron don't seem to respect the scale factors of the other displays.
                    const {
                        width,
                        height
                    } = display.bounds;

                    this.display = {
                        bounds: {
                            x,
                            y,
                            width,
                            height
                        },
                        scaleFactor: display.scaleFactor
                    };
                } else {
                    this.display = undefined;
                }
            } else {
                // On Mac OS the sourceId = 'screen' + displayId.
                // Try to match displayId with sourceId.
                let displayId = Number(parsedSourceId);

                if (isNaN(displayId)) {
                    // The source id may have the following format "desktop_id:0".

                    const idArr = parsedSourceId.split(':');

                    if (idArr.length <= 1) {
                        return;
                    }

                    displayId = Number(idArr[0]);
                }
                this.display
                        = displays.find(display => display.id === displayId);
            }
        }
        }
    }

    /**
     * Verifies whether app has already asked for capture permissions.
     * If it did but the user denied, resets permissions for the app
     *
     * @param {string} bundleId- OSX Application BundleId
     */
    _verifyScreenCapturePermissions(bundleId) {
        const {
            hasPromptedForPermission,
            hasScreenCapturePermission,
            resetPermissions,
        } = require('mac-screen-capture-permissions');

        const hasPermission = hasScreenCapturePermission();
        const promptedAlready = hasPromptedForPermission();

        if (promptedAlready && !hasPermission) {
            resetPermissions({ bundleId });
        }
    }
}

/**
 * Initializes the screen sharing electron specific functionality in the main electron process.
 *
 * @param {BrowserWindow} jitsiMeetWindow - the BrowserWindow object which displays Jitsi Meet
 * @param {string} identity - Name of the application doing screen sharing, will be displayed in the
 * screen sharing tracker window text i.e. {identity} is sharing your screen.
 * @param {string} bundleId- OSX Application BundleId
 */
module.exports = function setupScreenSharingMain(jitsiMeetWindow, identity, osxBundleId) {
    return new ScreenShareMainHook(jitsiMeetWindow, identity, osxBundleId);
};
