/**
 * Single source of truth for the hosts that are allowed in kmeet:// protocol
 * links and in the server URL settings field. A link like
 * kmeet://attacker.invalid/room must not load an arbitrary HTTPS origin as
 * the meeting iframe, because the remote control bridge trusts whatever page
 * is loaded. When no host is specified (kmeet://room), the configured
 * defaultServerURL is used and is always trusted.
 *
 * Everything here parses with the WHATWG URL parser — the same one the
 * Chromium renderer uses when it loads the conference iframe. String surgery
 * (split on '@', ':', ...) disagrees with the browser about where the
 * authority ends ('@' vs '#', '?', '\'), which is exactly the
 * YWH-PGM7461-3062 bypass class. The parsed value is also the value that
 * gets loaded (canonical origin), so the checked value and the loaded value
 * cannot differ.
 */
const ALLOWED_HOSTS: string[] = [
    'kmeet.infomaniak.com',
    'kmeet.infomaniakgroup.com',
    'kmeet.preprod.dev.infomaniak.ch'
];

/**
 * The canonical form of a parsed server authority.
 */
export interface IParsedAuthority {
    /**
     * Lowercase hostname: no userinfo, no port, no trailing dot.
     */
    hostname: string;

    /**
     * Canonical https origin built from the parsed host: what the
     * conference iframe should load.
     */
    origin: string;

    /**
     * Port as written in the input, '' when absent or default.
     */
    port: string;
}

/**
 * Matches a scheme followed by "//" (WHATWG "special scheme" notation used
 * by both kmeet:// payloads already stripped of their scheme and full
 * https:// URLs).
 */
const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Parses a server value with the same URL parser the renderer will use to
 * load it. Accepts a bare authority ("host", "host:8443") or a full URL
 * ("https://host:8443", "kmeet://host/room"); the path, query and fragment
 * are ignored for validation.
 *
 * Anything that is not a plain authority fails closed: userinfo (user@),
 * unparsable garbage, empty hostname. WHATWG already treats "\" as a path
 * separator for special schemes, so "evil.com\@kmeet.infomaniak.com" parses
 * to hostname "evil.com" — it fails the allow-list comparison, not this
 * parser.
 *
 * @param {string|null|undefined} raw - Server value as it appears in a link
 * or a settings field.
 * @returns {IParsedAuthority|null} The parsed authority, or null when the
 * value is empty or not a parsable, userinfo-free authority.
 */
export function parseAuthority(raw: string | null | undefined): IParsedAuthority | null {
    if (!raw) {
        return null;
    }

    const value = String(raw).trim();

    if (!value) {
        return null;
    }

    let url: URL;

    try {
        url = new URL(SCHEME_PREFIX.test(value) ? value : `https://${value}`);
    } catch {
        return null;
    }

    // A legitimate kMeet link never carries userinfo. Rejecting it keeps
    // "user@kmeet.infomaniak.com" out of the system entirely instead of
    // hoping every consumer remembers to use hostname, not href.
    if (url.username || url.password) {
        return null;
    }

    let hostname = url.hostname.toLowerCase();

    // A trailing dot denotes the DNS root: same FQDN.
    if (hostname.endsWith('.')) {
        hostname = hostname.slice(0, -1);
    }

    if (!hostname) {
        return null;
    }

    const port = url.port;

    return {
        hostname,
        port,
        origin: `https://${hostname}${port ? `:${port}` : ''}`
    };
}

/**
 * Checks whether a server value is allowed as the conference iframe origin
 * for an OS deep link (kmeet:// delivered by mail, chat or a web page — an
 * untrusted source). Only the Infomaniak-operated hosts pass; custom brands
 * must not be reachable through crafted links, which is the YWH-PGM7461
 * delivery vector.
 *
 * @param {string|null|undefined} host - The host as it appears in a link
 * (bare authority or full URL), or empty when the link contains only a room
 * name.
 * @returns {boolean} True when the value is empty (room-only link on the
 * default server) or parses to an allowed host.
 */
export function isAllowedHost(host: string | null | undefined): boolean {
    // A genuinely absent host means a room-only link on the default server.
    if (host === undefined || host === null || host === '') {
        return true;
    }

    const parsed = parseAuthority(host);

    // Anything that does not parse into a plain authority (lone port, bare
    // userinfo, "@", ...) fails closed instead of being treated as
    // room-only.
    if (!parsed) {
        return false;
    }

    return ALLOWED_HOSTS.some(allowed =>
        parsed.hostname === allowed || parsed.hostname.endsWith(`.${allowed}`));
}

/**
 * Checks whether a server value is allowed for a join initiated by the
 * embedded kMeet web app (the joinButton pixel) or typed by the user in the
 * settings — trusted sources. Custom kMeet brands are deployed on the
 * customer's own domain, always prefixed "kmeet."
 * (kmeet.infomaniakgroup.com, kmeet.<customer>.com, ...), and cannot be
 * enumerated. The prefix is a naming convention, not a proof of ownership,
 * but these flows originate from Infomaniak's own web app or from the
 * user's explicit input, and a brand is never the default server. A
 * hostname that merely embeds an allowed host (kmeet.infomaniak.com inside
 * kmeet.infomaniak.com.evil.com) is a lookalike, not a brand.
 *
 * @param {string|null|undefined} host - The host as it appears in the join
 * payload or the settings field.
 * @returns {boolean} True when the value is empty, an Infomaniak host, or a
 * "kmeet."-prefixed brand host.
 */
export function isAllowedBrandHost(host: string | null | undefined): boolean {
    if (isAllowedHost(host)) {
        return true;
    }

    const parsed = parseAuthority(host);

    if (!parsed) {
        return false;
    }

    const { hostname } = parsed;

    return hostname.startsWith('kmeet.')
        && !ALLOWED_HOSTS.some(allowed => `.${hostname}.`.includes(`.${allowed}.`));
}

export {
    ALLOWED_HOSTS
};
