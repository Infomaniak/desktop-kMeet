import type { IConference } from '../../types';


/**
 * Normalizes the given server URL so it has the proper scheme.
 *
 * @param {string} url - URL with or without scheme.
 * @returns {string}
 */
export function normalizeServerURL(url: string): string {
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
export function openExternalLink(link: string): void {
    window.jitsiNodeAPI.openExternalLink(link);
}


/**
 * Get URL, extract room name from it and create a Conference object.
 *
 * @param {string} inputURL - Combined server url with room separated by /.
 * @param {string} defaultServerURL - Server URL to use for room-only input.
 * @returns {IConference|undefined}
 */
export function createConferenceObjectFromURL(inputURL: string, defaultServerURL: string): IConference | undefined {
    const parts = inputURL.split('/');

    let room;
    let serverURL;
    let subject;

    if (parts.length === 1) {
        // Just a room name.
        room = parts[0];
        serverURL = normalizeServerURL(defaultServerURL || '');
    } else if (parts.length === 2) {
        // host/room
        room = parts[1];
        serverURL = normalizeServerURL(parts[0]);
    } else if (parts.length >= 3) {
        // host/room/subject
        room = parts[1];
        serverURL = normalizeServerURL(parts[0]);
        subject = parts.slice(2).join('/');
    }

    if (!room) {
        return;
    }

    return {
        room,
        serverURL,
        subject
    } as IConference;
}
