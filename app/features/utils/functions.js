// @flow


/**
 * Hosts that are allowed in protocol links. This is a defense-in-depth check
 * in the renderer; the main process already validates the host in
 * handleProtocolCall before forwarding the protocol payload.
 */
const ALLOWED_HOSTS = [
    'kmeet.infomaniak.com',
    'kmeet.preprod.dev.infomaniak.ch'
];

/**
 * Checks whether a host is in the allow-list.
 *
 * @param {string} host - The host to check (without scheme/port).
 * @returns {boolean}
 */
function isAllowedHost(host) {
    if (!host) {
        return true;
    }

    return ALLOWED_HOSTS.some(allowed =>
        host === allowed || host.endsWith(`.${allowed}`));
}

/**
 * Normalizes the given server URL so it has the proper scheme.
 *
 * @param {string} url - URL with or without scheme.
 * @returns {string}
 */
export function normalizeServerURL(url: string) {
    // eslint-disable-next-line no-param-reassign
    url = url.trim();

    if (url && url.indexOf('://') === -1) {
        return `https://${url}`;
    }

    return url;
}

/**
 * Opens the provided link in default broswer.
 *
 * @param {string} link - Link to open outside the desktop app.
 * @returns {void}
 */
export function openExternalLink(link: string) {
    window.jitsiNodeAPI.openExternalLink(link);
}


/**
 * Get URL, extract room name from it and create a Conference object.
 *
 * @param {string} inputURL - Combined server url with room separated by /.
 * @returns {Object|undefined}
 */
export function createConferenceObjectFromURL(inputURL: string) {
    const slashed = inputURL.split('/');
    const room = slashed[1];
    const serverURL = normalizeServerURL(slashed[0]);
    let subject = room;

    if (slashed.length > 2) {
        subject = decodeURIComponent(slashed[2]);
    }

    // Don't navigate if no room was specified.
    if (!room) {
        return;
    }

    // Defense-in-depth: reject unauthorized hosts even if the main process
    // check was bypassed. This prevents loading an attacker-controlled
    // origin as the meeting iframe.
    const host = serverURL.replace(/https?:\/\//, '').split(':')[0];

    if (!isAllowedHost(host)) {
        // eslint-disable-next-line no-console
        console.warn(`Rejected conference with unauthorized server: ${serverURL}`);

        return;
    }

    return {
        room,
        serverURL,
        subject
    };
}
