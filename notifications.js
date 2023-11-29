import { app, Notification } from 'electron';
import path from 'path';
import process from 'process';
import { localizeMessage } from './i18nManager';

const assetsDir = path.resolve(app.getAppPath(), 'assets');
const appIconURL = path.resolve(assetsDir, 'appicon_48.png');

const defaultOptions = {
    title: localizeMessage('notification.downloadnotification.title'),
    body: localizeMessage('notification.downloadnotification.body'),
    silent: false,
    icon: appIconURL,
    urgency: 'normal'
};

/**
 * Todo.
 */
export class NewVersionNotification extends Notification {
    /**
     * Todo.
     */
    constructor() {
        const options = { ...defaultOptions };

        if (process.platform === 'win32') {
            options.icon = appIconURL;
        } else if (process.platform === 'darwin') {
            // Notification Center shows app's icon, so there were two icons on the notification.
            Reflect.deleteProperty(options, 'icon');
        }

        super(options);
    }
}

/**
 * Todo.
 */
export class UpgradeNotification extends Notification {
    /**
     * Todo.
     */
    constructor() {
        const options = { ...defaultOptions };

        options.title = localizeMessage('notification.upgradenotification.title');
        options.body = localizeMessage('notification.upgradenotification.body');
        if (process.platform === 'win32') {
            options.icon = appIconURL;
        } else if (process.platform === 'darwin') {
            // Notification Center shows app's icon, so there were two icons on the notification.
            Reflect.deleteProperty(options, 'icon');
        }

        super(options);
    }
}

let upgrade;

/**
 * Todo.
 *
 * @param {string} version
 * @param {Function} handleUpgrade
 * @returns {void}
 */
export function displayUpgrade(version, handleUpgrade) {
    if (!Notification.isSupported()) {
        console.error('notification not supported');

        return;
    }

    if (upgrade) {
        upgrade.close();
    }
    upgrade = new NewVersionNotification();
    upgrade.on('click', () => {
        console.info(`User clicked to upgrade to ${version}`);
        handleUpgrade();
    });
    upgrade.show();
}

let restartToUpgrade;

/**
 * Todo.
 *
 * @returns {void}
 */
export function displayRestartToUpgrade(version, handleUpgrade) {
    if (!Notification.isSupported()) {
        console.error('notification not supported');

        return;
    }

    restartToUpgrade = new UpgradeNotification();
    restartToUpgrade.on('click', () => {
        console.info(`User requested perform the upgrade now to ${version}`);
        handleUpgrade();
    });
    restartToUpgrade.show();
}
