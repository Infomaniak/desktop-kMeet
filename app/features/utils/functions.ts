import type { IConference } from '../../types';

import { isAllowedBrandHost, isAllowedHost, parseAuthority } from './hostAllowList';

/**
 * Trust level of the source that produced a join payload.
 */
interface ICreateConferenceOptions {
    /**
     * True when the payload comes from a trusted source (the embedded kMeet
     * web app's join button): custom brand hosts (kmeet.<customer>.com) are
     * accepted. OS deep links stay strict.
     */
    allowBrands?: boolean;
}


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
export function createConferenceObjectFromURL(
        inputURL: string,
        defaultServerURL: string,
        options: ICreateConferenceOptions = {}
): IConference | undefined {
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

    // Defense-in-depth: enforce the trust policy of the source even if the
    // main process check was bypassed. OS deep links only reach
    // Infomaniak-operated hosts; brand hosts (kmeet.<customer>.com) are only
    // accepted for joins initiated by the embedded web app. The value is
    // parsed with the WHATWG URL parser (the same one the iframe load
    // uses): string surgery would disagree with the browser about where the
    // authority ends, which is the YWH-PGM7461 "@"/"#" confusion class.
    const parsed = parseAuthority(serverURL);
    const allowed = options.allowBrands
        ? isAllowedBrandHost(parsed?.hostname)
        : isAllowedHost(parsed?.hostname);

    if (!parsed || !allowed) {
        // eslint-disable-next-line no-console
        console.warn(`Rejected conference with unauthorized server: ${serverURL}`);

        return;
    }

    return {
        room,
        // Canonical origin: the value that was checked and the value that
        // is loaded cannot differ.
        serverURL: parsed.origin,
        subject
    } as IConference;
}
