/**
 * Builds the kmeet:// protocol payload for a conference join triggered from
 * the embedded kMeet web homepage. The web app signals the join through a
 * matomo pixel (welcomePage.joinButton.clicked) whose cvar parameter carries
 * the room hostname, the conference name and the room subject.
 *
 * That payload is web-controlled input: it is handed to the main process
 * protocol gate (host allow-list plus non-default server confirmation),
 * never to the conference loader directly.
 */
const JOIN_BUTTON_MARKER = 'welcomePage.joinButton.clicked';

/**
 * Extracts the join target from a matomo joinButton pixel request and
 * returns the deep-link payload for it.
 *
 * @param {string} rawUrl - The intercepted request URL.
 * @param {string} defaultServerHost - Bare hostname of the default kMeet
 * server, used when the web app sends no room hostname.
 * @returns {string|null} A kmeet://host/room/subject payload, or null when
 * the URL is not a joinButton pixel or carries no conference name.
 */
export function buildJoinButtonProtocolPayload(
        rawUrl: string,
        defaultServerHost: string
): string | null {
    if (!rawUrl || rawUrl.indexOf(JOIN_BUTTON_MARKER) < 0) {
        return null;
    }

    try {
        const url = new URL(rawUrl);

        // The web app sends the matomo cvar param as an object
        // {"1":["name","value"],...}, not as an array of pairs —
        // Object.values() normalizes both shapes into pairs.
        const cvarPairs = Object.values(
            JSON.parse(url.searchParams.get('cvar') ?? '{}') as Record<string, [ string, string ]>
        );

        // Scans backwards like lodash's findLast did; written as a plain
        // loop because Array.prototype.findLast is ES2023 and the tsconfig
        // lib is ES2022.
        const findCvar = (name: string): string => {
            for (let i = cvarPairs.length - 1; i >= 0; i--) {
                if (cvarPairs[i][0] === name) {
                    return cvarPairs[i][1] ?? '';
                }
            }

            return '';
        };

        // The hostname may arrive with a scheme; the protocol gate re-parses
        // the whole payload with the URL parser anyway.
        const joinHost = findCvar('room_hostname').replace(/^https?:\/\//, '');
        const joinRoom = findCvar('conference_name');
        const joinSubject = findCvar('room_subject');

        if (!joinRoom) {
            return null;
        }

        return `kmeet://${joinHost || defaultServerHost}/${joinRoom}/${joinSubject}`;
    } catch {
        return null;
    }
}
