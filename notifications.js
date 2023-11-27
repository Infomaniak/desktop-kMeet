// @flow
import { app, Notification } from 'electron';
import path from 'path';
import process from 'process';

const assetsDir = path.resolve(app.getAppPath(), 'assets');
const appIconURL = path.resolve(assetsDir, 'appicon_48.png');

const defaultOptions = {
    title: 'New desktop version available',
    body: 'A new version is available for you to download now.',
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

        options.title = 'Click to restart and install update';
        options.body = 'A new desktop version is ready to install now.';
        if (process.platform === 'win32') {
            options.icon = appIconURL;
        } else if (process.platform === 'darwin') {
            // Notification Center shows app's icon, so there were two icons on the notification.
            Reflect.deleteProperty(options, 'icon');
        }

        super(options);
    }
}

let upgrade: NewVersionNotification;

/**
 * Todo.
 *
 * @returns {void}
 */
export function displayUpgrade(version: string, handleUpgrade: () => void): void {
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
export function displayRestartToUpgrade(version: string, handleUpgrade: () => void): void {
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
