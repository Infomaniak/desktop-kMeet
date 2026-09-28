import { install as installJitsiElectronSdk } from '@infomaniak/jitsi-meet-electron-sdk/preload';
import { RemoteDraw } from '@infomaniak/jitsi-meet-electron-sdk/remotedraw';
import {
    initPopupsConfigurationRender,
    setupPictureInPictureRender,
    setupPowerMonitorRender,
    setupRemoteControlRender,
    setupScreenSharingRender
} from '@infomaniak/jitsi-meet-electron-sdk/renderer';
import { ipcRenderer } from 'electron';

installJitsiElectronSdk();

const whitelistedIpcChannels = [
    'protocol-data-msg',
    'protocol-data-homepage',
    'protocol-data-create-meeting',
    'protocol-data-join-meeting',
    'protocol-data-plan-meeting',
    'renderer-ready'
];

function openExternalLink(url: string): void {
    ipcRenderer.send('jitsi-open-url', url);
}

function setupRenderer(api: any, options: { enableRemoteControl?: boolean; enableAlwaysOnTopWindow?: boolean } = {}): void {
    initPopupsConfigurationRender(api);
    setupScreenSharingRender(api);
    setupPictureInPictureRender(api);
    setupPowerMonitorRender(api);

    if (options.enableRemoteControl) {
        setupRemoteControlRender(api);
    }

    new RemoteDraw(api);
}

(window as any).jitsiNodeAPI = {
    openExternalLink,
    setupRenderer,
    ipc: {
        on: (channel: string, listener: (...args: any[]) => void) => {
            if (!whitelistedIpcChannels.includes(channel)) {
                return;
            }

            return ipcRenderer.on(channel, listener);
        },
        send: (channel: string, ...args: any[]) => {
            if (!whitelistedIpcChannels.includes(channel)) {
                return;
            }

            return ipcRenderer.send(channel, ...args);
        },
        removeListener: (channel: string, listener: (...args: any[]) => void) => {
            if (!whitelistedIpcChannels.includes(channel)) {
                return;
            }

            return ipcRenderer.removeListener(channel, listener);
        }
    }
};
