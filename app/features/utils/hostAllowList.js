'use strict';

/**
 * Single source of truth for the hosts that are allowed in kmeet:// protocol
 * links. A link like kmeet://attacker.invalid/room must not load an arbitrary
 * HTTPS origin as the meeting iframe, because the remote control bridge
 * trusts whatever page is loaded. When no host is specified (kmeet://room),
 * the configured defaultServerURL is used and is always trusted.
 *
 * This module is plain CommonJS so it can be required by the main process,
 * bundled for the renderer (defense in depth) and required directly by the
 * regression tests: a change to the production logic can no longer silently
 * pass the suite.
 */
const ALLOWED_HOSTS = [
    'kmeet.infomaniak.com',
    'kmeet.preprod.dev.infomaniak.ch'
];

/**
 * Normalizes a host for allow-list comparison: strips userinfo and port,
 * lowercases (hostnames are case-insensitive per RFC 3986) and drops a
 * trailing dot (same FQDN).
 *
 * @param {string} rawHost - Host as it appears in a link (may include
 * userinfo, a port or a trailing dot).
 * @returns {string} The bare, lowercase hostname, or '' when empty.
 */
function normalizeHost(rawHost) {
    if (!rawHost) {
        return '';
    }

    // Strip userinfo and the port. IPv6 literals never match the
    // allow-list, so passing them through lowercased is fine.
    let host = String(rawHost).trim().split('@').pop().split(':')[0];

    host = host.toLowerCase();

    // A trailing dot denotes the DNS root: same FQDN.
    if (host.endsWith('.')) {
        host = host.slice(0, -1);
    }

    return host;
}

/**
 * Checks whether a host extracted from a kmeet:// link is allowed.
 *
 * @param {string} host - The host as it appears in the link, or empty when
 * the link contains only a room name.
 * @returns {boolean} True if the host is allowed or empty (room-only link).
 */
function isAllowedHost(host) {
    const normalized = normalizeHost(host);

    if (!normalized) {
        return true;
    }

    return ALLOWED_HOSTS.some(allowed =>
        normalized === allowed || normalized.endsWith(`.${allowed}`));
}

module.exports = {
    ALLOWED_HOSTS,
    isAllowedHost,
    normalizeHost
};
