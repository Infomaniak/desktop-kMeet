const { 
    app,
    ipcMain,
    BrowserWindow,
    systemPreferences
} = require('electron');
const sourceId2Coordinates = require("../node_addons/sourceId2Coordinates");
const { SCREEN_SHARE_EVENTS_CHANNEL, SCREEN_SHARE_EVENTS } = require('../screensharing/constants');
const { SCREEN_SHARE_DRAW_EVENTS_CHANNEL } = require('./constants');

/**
 * Module to run on main process to get display dimensions for remote draw.
 */
class RemoteDrawMain {
    constructor(jitsiMeetWindow) {
        this._jitsiMeetWindow = jitsiMeetWindow;
        this._onNewWindow = this._onNewWindow.bind(this)
        this._onScreenSharingEvent = this._onScreenSharingEvent.bind(this);
        this._jitsiMeetWindow.webContents.on('new-window', this._onNewWindow)

        ipcMain.on('jitsi-remotedraw-get-display', (event, sourceId) => {
            const display = this._getDisplay(sourceId);
            event.returnValue = display;
            this.display = display
        });

        ipcMain.on(SCREEN_SHARE_EVENTS_CHANNEL, this._onScreenSharingEvent);

        app.whenReady().then(() => {
            const { screen } = require('electron');

            screen.on('display-metrics-changed', () => {
                this._jitsiMeetWindow.webContents.send('jitsi-remotedraw-displays-changed');
            });
        });

        // this._jitsiMeetWindow.on('closed', () => {
        //     ipcMain.removeListener(SCREEN_SHARE_DRAW_EVENTS_CHANNEL, this._onScreenSharingEvent);
        // });
    }

    _onNewWindow(event, url, frameName, disposition, options) {
        if (frameName === 'RemoteDrawWindow') {
            if (this._screenShareDrawer) {
                return;
            }
    
            // Make the window transparent only if the platform supports it.
            if (process.platform === 'win32' && !systemPreferences.isAeroGlassEnabled()) {
                return;
            }
    
            this._screenShareDrawer = new BrowserWindow({
                width: this.display.size.width,
                height: this.display.size.height,
                x: this.display.workArea.x,
                y: this.display.workArea.y,

                transparent: true,
                frame: false,
                fullscreen: true,
                simpleFullscreen: true,
                fullscreenable: true,
                enableLargerThanScreen: true,
                backgroundColor: '#00FFFFFF',
                hasShadow: false,
                resizable: false,
                movable: false,
                minimizable: false,
                maximizable: false,
                closable: false,
                focusable: false,
                skipTaskbar: true,
                webPreferences: {
                    contextIsolation: false,
                    enableRemoteModule: true,
                    nodeIntegration: true
                }
            });
    
    
            this._screenShareDrawer.setAlwaysOnTop(true, 'pop-up-menu', 5);
            this._screenShareDrawer.setVisibleOnAllWorkspaces(true);
            this._screenShareDrawer.setIgnoreMouseEvents(true);
            this._screenShareDrawer.setFocusable(false);

            this._screenShareDrawer.loadURL(`file://${__dirname}/remoteDraw.html`);

            ipcMain.on(SCREEN_SHARE_DRAW_EVENTS_CHANNEL, (event, datas) => {
                this._screenShareDrawer.webContents.send(SCREEN_SHARE_DRAW_EVENTS_CHANNEL, datas);
            });

            // this._screenShareDrawer.once('ready-to-show', () => {
            //     this._screenShareDrawer.showInactive();
            // });

            this._screenShareDrawer.webContents.on('error', error => {
                console.log(error);
            });

        }
    }

    /**
     * Listen for events coming on the screen sharing event channel.
     *
     * @param {Object} event - Electron event data.
     * @param {Object} data - Channel specific data.
     */
     _onScreenSharingEvent(event, { data }) {
        switch (data.name) {
        case SCREEN_SHARE_EVENTS.CLOSE_TRACKER:
            if (this._screenShareDrawer) {
                this._screenShareDrawer.close();
                this._screenShareDrawer = undefined;
            }
            break;
        case SCREEN_SHARE_EVENTS.STOP_SCREEN_SHARE:
            if (this._screenShareDrawer) {
                this._screenShareDrawer.close();
                this._screenShareDrawer = undefined;
            }
            break;
        default:
            console.warn(`Unhandled ${SCREEN_SHARE_EVENTS_CHANNEL}: ${data}`);
        }
    }



    /**
     * Returns the display metrics(x, y, width, height, scaleFactor, etc...) of the display that will be used for the
     * remote control.
     *
     * @param {string} sourceId - The source id of the desktop sharing stream.
     * @returns {Object} bounds and scaleFactor of display matching sourceId.
     */
     _getDisplay(sourceId) {
        const { screen } = require('electron');

        const displays = screen.getAllDisplays();

        switch(displays.length) {
            case 0:
                return undefined;
            case 1:
                // On Linux probably we'll end up here even if there are
                // multiple monitors.
                return displays[0];
            // eslint-disable-next-line no-case-declarations
            default: { // > 1 display
                // Remove the type part from the sourceId
                const parsedSourceId = sourceId.replace('screen:', '');
                const coordinates = sourceId2Coordinates(parsedSourceId);
                if(coordinates) {
                    // Currently sourceId2Coordinates will return undefined for
                    // any OS except Windows. This code will be executed only on
                    // Windows.
                    const { x, y } = coordinates;
                    const display
                        = screen.getDisplayNearestPoint({
                            x: x + 1,
                            y: y + 1
                        });

                    if (typeof display !== 'undefined') {
                        // We need to use x and y returned from sourceId2Coordinates because the ones returned from
                        // Electron don't seem to respect the scale factors of the other displays.
                        const { width, height } = display.bounds;

                        return {
                            bounds: {
                                x,
                                y,
                                width,
                                height
                            },
                            scaleFactor: display.scaleFactor
                        };
                    } else {
                        return undefined;
                    }
                } else {
                    // On Mac OS the sourceId = 'screen' + displayId.
                    // Try to match displayId with sourceId.
                    let displayId = Number(parsedSourceId);

                    if (isNaN(displayId)) {
                        // The source id may have the following format "desktop_id:0".

                        const idArr = parsedSourceId.split(":");

                        if (idArr.length <= 1) {
                            return;
                        }

                        displayId = Number(idArr[0]);
                    }
                    return displays.find(display => display.id === displayId);
                }
            }
        }
    }

    /**
     * Executes the passed message.
     * @param {Object} message the remote control message.
     */
    // _onRemoteDrawMessage(message) {
    //     const {
    //         id,
    //         data
    //     } = message;

    //     // If we haven't set the display prop. We haven't received the remote
    //     // control start message or there was an error associating a display.
    //     // if (!this._display
    //     //     && data.type != REQUESTS.start) {
    //     //     return;
    //     // }

    //     switch (data.type) {
    //     case REQUESTS.start: {
    //         this._start(id, data.sourceId);
    //         break;
    //     }
    //     case EVENTS.stop: {
    //         this._stop();
    //         break;
    //     }
    //     default:
    //         console.error('Unknown event type!');
    //     }
    // }
}

module.exports = RemoteDrawMain;