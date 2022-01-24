/* global process */

const { ipcRenderer } = require('electron');
const jitsiMeetElectronUtils = require('@jitsi/electron-sdk');
const { openExternalLink } = require('../features/utils/openExternalLink');


const whitelistedIpcChannels = [
    'protocol-data-msg',
    'protocol-data-homepage',
    'protocol-data-create-meeting',
    'protocol-data-join-meeting',
    'protocol-data-plan-meeting',
    'renderer-ready'
];

window.jitsiNodeAPI = {
    openExternalLink,
    platform: process.platform,
    jitsiMeetElectronUtils,
    // getLocale: remote.app.getLocale,
    ipc: {
        on: (channel, listener) => {
            if (!whitelistedIpcChannels.includes(channel)) {
                return;
            }

            return ipcRenderer.on(channel, listener);
        },
        send: channel => {
            if (!whitelistedIpcChannels.includes(channel)) {
                return;
            }

            return ipcRenderer.send(channel);
        },
        removeListener: (channel, listener) => {
            if (!whitelistedIpcChannels.includes(channel)) {
                return;
            }

            return ipcRenderer.removeListener(channel, listener);
        }
    }
};
