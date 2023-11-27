// @flow

import { ipcMain, app, BrowserWindow } from 'electron';
import { autoUpdater, CancellationToken, UpdateInfo } from 'electron-updater';
import { displayRestartToUpgrade, displayUpgrade } from './notifications';

// Public constants
export const UPDATE_AVAILABLE = 'update-available';
export const UPDATE_DOWNLOADED = 'update-downloaded';
export const NO_UPDATE_AVAILABLE = 'no-update-available';

autoUpdater.autoDownload = false;
autoUpdater.disableWebInstaller = true;

const NEXT_NOTIFY = 86400000; // 24 hours
const NEXT_CHECK = 3600000; // 1 hour

/** to test this during development
 * add the following to electron-builder.json in the publish entry
    {
      "provider": "generic",
      "url": "http://localhost:8000"
    },
 * create a packaged build, copy that to a directory B
 * upgrade the package.json version
 * package a second copy of the app
 * on release dir setup an http server (using `python -m SimpleHTTPServer` should match the above entry)
 * start the app from directory B
**/
export class UpdateManager {
    lastNotification: ?TimeoutID;
    lastCheck: ?TimeoutID;
    cancellationToken: ?CancellationToken;
    versionDownloaded: ?string;
    downloadedInfo: ?UpdateInfo;
    versionAvailable: ?string;
    versionDownloaded: ?string;

    /**
     * Todo.
     */
    constructor() {
        this.cancellationToken = new CancellationToken();

        this._checkForUpdates = this._checkForUpdates.bind(this);
        this._notify = this._notify.bind(this);
        this._notifyUpgrade = this._notifyUpgrade.bind(this);
        this._notifyDownloaded = this._notifyDownloaded.bind(this);
        this._handleDownload = this._handleDownload.bind(this);
        this._handleUpdate = this._handleUpdate.bind(this);
    }

    /**
     * Todo.
     *
     * @returns {void}
     */
    _checkForUpdates() {
        if (this.lastCheck) {
            clearTimeout(this.lastCheck);
        }
        if (!this.lastNotification && !this.versionDownloaded) {
            autoUpdater.checkForUpdates().then(result => {
                if (!result || !result.updateInfo) {
                    ipcMain.emit(NO_UPDATE_AVAILABLE);
                }
            })
            .catch(reason => {
                ipcMain.emit(NO_UPDATE_AVAILABLE);
                console.error(`[kMeet] Failed to check for updates: ${reason}`);
            });

            this.lastCheck = setTimeout(() => this._checkForUpdates(), NEXT_CHECK);
        }
    }

    _checkForUpdates: () => void;

    /**
     * Todo.
     *
     * @returns {void}
     */
    _notify() {
        if (this.lastNotification) {
            clearTimeout(this.lastNotification);
        }
        this.lastNotification = setTimeout(this._notify, NEXT_NOTIFY);
        if (this.versionDownloaded) {
            this._notifyDownloaded();
        } else if (this.versionAvailable) {
            this._notifyUpgrade();
        }
    }

    _notify: () => void;

    /**
     * Todo.
     *
     * @returns {void}
     */
    _notifyUpgrade() {
        ipcMain.emit(UPDATE_AVAILABLE, null, this.versionAvailable);
        displayUpgrade(this.versionAvailable || 'unknown', this._handleDownload);
    }

    _notifyUpgrade: () => void;

    /**
     * Todo.
     *
     * @returns {void}
     */
    _notifyDownloaded() {
        ipcMain.emit(UPDATE_DOWNLOADED, null, this.downloadedInfo);
        displayRestartToUpgrade(this.versionDownloaded || 'unknown', this._handleUpdate);
    }

    _notifyDownloaded: () => void;

    /**
     * Todo.
     *
     * @returns {void}
     */
    _handleDownload() {
        if (this.lastCheck) {
            clearTimeout(this.lastCheck);
        }

        autoUpdater.downloadUpdate(this.cancellationToken);
    }

    _handleDownload: () => void;

    /**
     * Todo.
     *
     * @returns {void}
     */
    _handleUpdate() {
        // long history of this not working well
        // https://github.com/electron-userland/electron-builder/issues/3271
        // https://github.com/electron-userland/electron-builder/issues/3269
        // do it just like develar says:
        // https://github.com/electron-userland/electron-builder/issues/1604#issuecomment-306709572
        console.info('quitting and installing now');

        // eslint-disable-next-line no-undef
        setImmediate(() => {
            global.willAppQuit = true;
            app.removeAllListeners('window-all-closed');
            const browserWindows = BrowserWindow.getAllWindows();

            console.info(`closing ${browserWindows.length} BrowserWindows for autoUpdater.quitAndInstall`);
            for (const browserWindow of browserWindows) {
                browserWindow.close();
            }
            autoUpdater.quitAndInstall(false);
        });
    }

    _handleUpdate: () => void;
}

const updateManager = new UpdateManager();

export default updateManager;
