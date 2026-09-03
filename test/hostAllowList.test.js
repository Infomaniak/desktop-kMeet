const assert = require('assert');

const {
    ALLOWED_HOSTS,
    isAllowedHost,
    normalizeHost
} = require('../app/features/utils/hostAllowList');

/**
 * Regression tests for the host allow-list (YWH-PGM7461-3062).
 *
 * The allow-list prevents a crafted kmeet:// link from loading an
 * attacker-controlled HTTPS origin as the meeting iframe. It is enforced
 * in both the main process (handleProtocolCall) and the renderer
 * (createConferenceObjectFromURL, defense in depth).
 *
 * These tests require the shared module used by both layers
 * (app/features/utils/hostAllowList.js), so a change to the production
 * logic can no longer silently pass the suite.
 */

/**
 * Mirrors normalizeServerURL() from app/features/utils/functions.js (an ES
 * module, not importable here without a Babel setup).
 */
function normalizeServerURL(url) {
    url = url.trim();

    if (url && url.indexOf('://') === -1) {
        return `https://${url}`;
    }

    return url;
}

describe('Host allow-list', () => {
    describe('ALLOWED_HOSTS', () => {
        it('contains the production hosts', () => {
            assert.ok(ALLOWED_HOSTS.includes('kmeet.infomaniak.com'));
            assert.ok(ALLOWED_HOSTS.includes('kmeet.preprod.dev.infomaniak.ch'));
        });
    });

    describe('isAllowedHost', () => {
        it('allows empty host (room-only link uses default server)', () => {
            assert.strictEqual(isAllowedHost(''), true);
            assert.strictEqual(isAllowedHost(undefined), true);
            assert.strictEqual(isAllowedHost(null), true);
        });

        it('fails closed when a host is provided but yields no hostname', () => {
            assert.strictEqual(isAllowedHost(':8443'), false);
            assert.strictEqual(isAllowedHost('user@'), false);
        });

        it('allows kmeet.infomaniak.com', () => {
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.com'), true);
        });

        it('allows kmeet.preprod.dev.infomaniak.ch', () => {
            assert.strictEqual(isAllowedHost('kmeet.preprod.dev.infomaniak.ch'), true);
        });

        it('allows subdomains of allowed hosts', () => {
            assert.strictEqual(isAllowedHost('sub.kmeet.infomaniak.com'), true);
            assert.strictEqual(isAllowedHost('a.b.kmeet.preprod.dev.infomaniak.ch'), true);
        });

        it('is case-insensitive (RFC 3986)', () => {
            assert.strictEqual(isAllowedHost('KMEET.INFOMANIAK.COM'), true);
            assert.strictEqual(isAllowedHost('Sub.Kmeet.Infomaniak.Com'), true);
        });

        it('allows a trailing-dot FQDN', () => {
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.com.'), true);
            assert.strictEqual(isAllowedHost('sub.kmeet.infomaniak.com.'), true);
        });

        it('strips the port before matching (main and renderer agree)', () => {
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.com:8443'), true);
            assert.strictEqual(isAllowedHost('sub.kmeet.infomaniak.com:8080'), true);
        });

        it('strips userinfo before matching', () => {
            assert.strictEqual(isAllowedHost('user@kmeet.infomaniak.com'), true);
            assert.strictEqual(isAllowedHost('user@kmeet.infomaniak.com:8443'), true);
        });

        it('rejects attacker.invalid', () => {
            assert.strictEqual(isAllowedHost('attacker.invalid'), false);
        });

        it('rejects evil.com', () => {
            assert.strictEqual(isAllowedHost('evil.com'), false);
        });

        it('rejects lookalike hosts', () => {
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.com.evil.com'), false);
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.com.evil.com.'), false);
            assert.strictEqual(isAllowedHost('notkmeet.infomaniak.com'), false);
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.co'), false);
        });

        it('rejects userinfo smuggling a foreign host', () => {
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.com@attacker.invalid'), false);
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.com:8443@attacker.invalid'), false);
        });

        it('rejects hosts that merely contain an allowed host as substring', () => {
            assert.strictEqual(isAllowedHost('xkmeet.infomaniak.com'), false);
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.comx'), false);
        });
    });

    describe('normalizeHost', () => {
        it('lowercases, strips userinfo, port and trailing dot', () => {
            assert.strictEqual(
                normalizeHost('User@Kmeet.Infomaniak.com:8443.'),
                'kmeet.infomaniak.com');
            assert.strictEqual(normalizeHost('attacker.invalid:8080'), 'attacker.invalid');
            assert.strictEqual(normalizeHost(''), '');
            assert.strictEqual(normalizeHost(undefined), '');
        });
    });

    describe('Protocol link parsing (handleProtocolCall simulation)', () => {
        it('rejects kmeet://attacker.invalid/room', () => {
            const inputURL = 'attacker.invalid/room';
            const hostPart = inputURL.split('/')[0];

            assert.strictEqual(isAllowedHost(hostPart), false);
        });

        it('allows kmeet://kmeet.infomaniak.com/room', () => {
            const inputURL = 'kmeet.infomaniak.com/room';
            const hostPart = inputURL.split('/')[0];

            assert.strictEqual(isAllowedHost(hostPart), true);
        });

        it('allows kmeet://kmeet.preprod.dev.infomaniak.ch/room', () => {
            const inputURL = 'kmeet.preprod.dev.infomaniak.ch/room';
            const hostPart = inputURL.split('/')[0];

            assert.strictEqual(isAllowedHost(hostPart), true);
        });

        it('rejects kmeet://evil.example.com/room', () => {
            const inputURL = 'evil.example.com/room';
            const hostPart = inputURL.split('/')[0];

            assert.strictEqual(isAllowedHost(hostPart), false);
        });

        it('allows kmeet://kmeet.infomaniak.com:8443/room (port, like the renderer)', () => {
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.com:8443'), true);
        });

        it('rejects kmeet://kmeet.infomaniak.com.evil.com/room', () => {
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.com.evil.com'), false);
        });
    });

    describe('createConferenceObjectFromURL defense-in-depth', () => {
        it('rejects unauthorized server', () => {
            const serverURL = normalizeServerURL('attacker.invalid');

            assert.strictEqual(
                isAllowedHost(serverURL.replace(/https?:\/\//, '')), false);
        });

        it('allows authorized host', () => {
            const serverURL = normalizeServerURL('kmeet.infomaniak.com');

            assert.strictEqual(isAllowedHost(serverURL.replace(/https?:\/\//, '')), true);
        });

        it('allows authorized host with port', () => {
            const serverURL = normalizeServerURL('kmeet.infomaniak.com:8443');

            assert.strictEqual(isAllowedHost(serverURL.replace(/https?:\/\//, '')), true);
        });
    });
});
