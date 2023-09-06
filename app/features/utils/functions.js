// @flow


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
 * @returns {Object}
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

    return {
        room,
        serverURL,
        subject
    };
}
