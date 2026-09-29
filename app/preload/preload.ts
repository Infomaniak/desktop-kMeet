import { install as installJitsiElectronSdk } from '@infomaniak/jitsi-meet-electron-sdk/preload';
import { IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';

// Expose the SDK's own bridge (window.jitsiElectronSDK, an SDK-internal detail
// the renderer helpers read) before wiring up our own bridge below. This
// requires the window to be created with contextIsolation enabled.
installJitsiElectronSdk();

const whitelistedIpcChannels = [
    'protocol-data-msg',
    'protocol-data-homepage',
    'protocol-data-create-meeting',
    'protocol-data-join-meeting',
    'protocol-data-plan-meeting',
    'renderer-ready'
];

/**
 * Open an external URL.
 *
 * @param {string} url - The URL to open.
 * @returns {void}
 */
function openExternalLink(url: string): void {
    ipcRenderer.send('jitsi-open-url', url);
}

// The app's own bridge, separate from window.jitsiElectronSDK. It only carries
// cloneable data plus callbacks (listeners and the unsubscribe they return),
// which contextBridge supports, so it works under contextIsolation.
contextBridge.exposeInMainWorld('jitsiNodeAPI', {
    openExternalLink,
    ipc: {
        on: (channel: string, listener: (...args: any[]) => void) => {
            if (!whitelistedIpcChannels.includes(channel)) {
                // Match the declared contract (types/global.d.ts): on() must
                // always return a callable unsubscribe.
                return () => undefined;
            }

            const cb = (_event: IpcRendererEvent, ...args: any[]) => {
                listener(...args);
            };

            ipcRenderer.on(channel, cb);

            return () => {
                ipcRenderer.removeListener(channel, cb);
            };
        },
        send: (channel: string, ...args: any[]) => {
            if (!whitelistedIpcChannels.includes(channel)) {
                return;
            }

            ipcRenderer.send(channel, ...args);
        }
    }
});
