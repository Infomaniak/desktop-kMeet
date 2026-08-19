const assert = require('assert');
const path = require('path');

/**
 * Regression tests for the host allow-list (YWH-PGM7461-3062).
 *
 * The allow-list prevents a crafted kmeet:// link from loading an
 * attacker-controlled HTTPS origin as the meeting iframe. It is enforced
 * in both the main process (handleProtocolCall) and the renderer
 * (createConferenceObjectFromURL, defense in depth).
 *
 * These tests verify the allow-list logic directly. The functions are
 * re-implemented here (rather than imported) because the app uses ES module
 * syntax processed by Babel/webpack and has no test bundler. If the logic
 * changes, update both the source and these tests.
 */

const ALLOWED_HOSTS = [
    'kmeet.infomaniak.com',
    'kmeet.preprod.dev.infomaniak.ch'
];

function isAllowedHost(host) {
    if (!host) {
        return true;
    }

    return ALLOWED_HOSTS.some(allowed =>
        host === allowed || host.endsWith(`.${allowed}`));
}

function normalizeServerURL(url) {
    url = url.trim();

    if (url && url.indexOf('://') === -1) {
        return `https://${url}`;
    }

    return url;
}

function getHostFromServerURL(serverURL) {
    return serverURL.replace(/https?:\/\//, '').split(':')[0];
}

describe('Host allow-list', () => {
    describe('isAllowedHost', () => {
        it('allows empty host (room-only link uses default server)', () => {
            assert.strictEqual(isAllowedHost(''), true);
            assert.strictEqual(isAllowedHost(undefined), true);
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

        it('rejects attacker.invalid', () => {
            assert.strictEqual(isAllowedHost('attacker.invalid'), false);
        });

        it('rejects evil.com', () => {
            assert.strictEqual(isAllowedHost('evil.com'), false);
        });

        it('rejects lookalike hosts', () => {
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.com.evil.com'), false);
            assert.strictEqual(isAllowedHost('notkmeet.infomaniak.com'), false);
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.co'), false);
        });

        it('rejects hosts that merely contain an allowed host as substring', () => {
            assert.strictEqual(isAllowedHost('xkmeet.infomaniak.com'), false);
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.comx'), false);
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
    });

    describe('createConferenceObjectFromURL defense-in-depth', () => {
        it('extracts host from normalized serverURL and rejects unauthorized', () => {
            const serverURL = normalizeServerURL('attacker.invalid');
            const host = getHostFromServerURL(serverURL);

            assert.strictEqual(host, 'attacker.invalid');
            assert.strictEqual(isAllowedHost(host), false);
        });

        it('allows authorized host through defense-in-depth check', () => {
            const serverURL = normalizeServerURL('kmeet.infomaniak.com');
            const host = getHostFromServerURL(serverURL);

            assert.strictEqual(host, 'kmeet.infomaniak.com');
            assert.strictEqual(isAllowedHost(host), true);
        });

        it('strips port before checking host', () => {
            const serverURL = normalizeServerURL('kmeet.infomaniak.com:8443');
            const host = getHostFromServerURL(serverURL);

            assert.strictEqual(host, 'kmeet.infomaniak.com');
            assert.strictEqual(isAllowedHost(host), true);
        });
    });
});
