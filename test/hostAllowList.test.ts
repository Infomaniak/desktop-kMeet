import assert from 'node:assert';

import { createConferenceObjectFromURL } from '../app/features/utils/functions';
import {
    ALLOWED_HOSTS,
    isAllowedBrandHost,
    isAllowedHost,
    parseAuthority
} from '../app/features/utils/hostAllowList';

/**
 * Regression tests for the host allow-list (YWH-PGM7461-3062 and the 2.0.2
 * allowlist bypass report).
 *
 * The allow-list prevents a crafted kmeet:// link from loading an
 * attacker-controlled HTTPS origin as the meeting iframe. It is enforced in
 * both the main process (handleProtocolCall) and the renderer
 * (createConferenceObjectFromURL, defense in depth), and once more at load
 * time in Conference._loadConference.
 *
 * Parsing must agree with the WHATWG URL parser the iframe load uses:
 * string surgery on '@', ':' or '/' disagrees with the browser about where
 * the authority ends, which is the reported bypass class
 * (kmeet://127.0.0.1:8899#@kmeet.infomaniak.com/room).
 */

const DEFAULT_SERVER_URL = 'https://kmeet.infomaniak.com';

describe('Host allow-list', () => {
    describe('ALLOWED_HOSTS', () => {
        it('contains the production hosts', () => {
            assert.ok(ALLOWED_HOSTS.includes('kmeet.infomaniak.com'));
            assert.ok(ALLOWED_HOSTS.includes('kmeet.preprod.dev.infomaniak.ch'));
            // Brand domains (kmeet.infomaniakgroup.com, ...) are dynamic:
            // they are served by the "kmeet." naming convention, never
            // enumerated in the static list.
            assert.ok(!ALLOWED_HOSTS.some(h => h !== 'kmeet.infomaniak.com' && h !== 'kmeet.preprod.dev.infomaniak.ch'));
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
            assert.strictEqual(isAllowedHost('https:'), false);
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

        it('rejects userinfo even when it names an allowed host', () => {
            // A kMeet link never carries userinfo; fail closed instead of
            // trusting every consumer to read hostname, not href.
            assert.strictEqual(isAllowedHost('user@kmeet.infomaniak.com'), false);
            assert.strictEqual(isAllowedHost('user@kmeet.infomaniak.com:8443'), false);
        });

        it('rejects hosts that merely contain an allowed host as substring', () => {
            assert.strictEqual(isAllowedHost('xkmeet.infomaniak.com'), false);
            assert.strictEqual(isAllowedHost('kmeet.infomaniak.comx'), false);
        });

        describe('YWH-PGM7461-3062 bypass payloads (URL-parser confusion)', () => {
            it('rejects the reported @/# payload: 127.0.0.1:8899#@kmeet.infomaniak.com', () => {
                // normalizeHost used to take the substring after the last
                // '@' and see kmeet.infomaniak.com while the browser ends
                // the authority at '#' and connects to 127.0.0.1:8899.
                assert.strictEqual(isAllowedHost('127.0.0.1:8899#@kmeet.infomaniak.com'), false);
            });

            it('rejects the ? and \\ variants of the reported payload', () => {
                assert.strictEqual(isAllowedHost('127.0.0.1:8899?@kmeet.infomaniak.com'), false);
                assert.strictEqual(isAllowedHost('127.0.0.1:8899\\#@kmeet.infomaniak.com'), false);
            });

            it('rejects an attacker host that names kmeet after @', () => {
                // The browser loads evil.com (WHATWG reads '\' as a path
                // separator, so the authority ends before the backslash).
                assert.strictEqual(isAllowedHost('evil.com\\@kmeet.infomaniak.com'), false);
            });

            it('still allows a fragment pointing at kmeet from a kmeet host', () => {
                // The browser loads kmeet.infomaniak.com here; the fragment
                // is inert and the renderer legitimately passes config.*
                // fragments to the conference.
                assert.strictEqual(isAllowedHost('kmeet.infomaniak.com#@attacker.invalid'), true);
            });

            it('rejects customer brand hosts (deep links never reach brands)', () => {
                // OS deep links come from untrusted sources; customer brands
                // are only reachable through the embedded web app's join
                // button or the settings field.
                assert.strictEqual(isAllowedHost('kmeet.customer.com'), false);
                assert.strictEqual(isAllowedHost('kmeet.someone.co.uk'), false);
                assert.strictEqual(isAllowedHost('kmeet.infomaniakgroup.com'), false);
            });
        });

        describe('isAllowedBrandHost (web-app and settings joins)', () => {
            it('accepts everything the strict policy accepts', () => {
                assert.strictEqual(isAllowedBrandHost('kmeet.infomaniak.com'), true);
                assert.strictEqual(isAllowedBrandHost('kmeet.preprod.dev.infomaniak.ch'), true);
                assert.strictEqual(isAllowedBrandHost('sub.kmeet.infomaniak.com'), true);
                assert.strictEqual(isAllowedBrandHost(''), true);
            });

            it('accepts kmeet.-prefixed brand domains', () => {
                assert.strictEqual(isAllowedBrandHost('kmeet.infomaniakgroup.com'), true);
                assert.strictEqual(isAllowedBrandHost('kmeet.customer.com'), true);
                assert.strictEqual(isAllowedBrandHost('kmeet.someone.co.uk'), true);
            });

            it('accepts sub-domains of the kmeet. pattern only as far as the convention goes', () => {
                // KNOWN LIMITATION of the naming-convention pattern: a
                // kmeet.-prefixed sub-domain of an attacker domain
                // (kmeet.customer.com.evil.com) cannot be distinguished from
                // a legit brand without domain-ownership verification. These
                // flows are only reached from Infomaniak's own web app or
                // the user's own settings input, never from crafted links.
                assert.strictEqual(isAllowedBrandHost('kmeet.customer.com.evil.com'), true);
                assert.strictEqual(isAllowedBrandHost('kmeet.infomaniakgroup.com.evil.com'), true);
            });

            it('rejects hosts without the kmeet. prefix', () => {
                assert.strictEqual(isAllowedBrandHost('attacker.invalid'), false);
                assert.strictEqual(isAllowedBrandHost('evil.com'), false);
                assert.strictEqual(isAllowedBrandHost('xkmeet.customer.com'), false);
            });

            it('rejects lookalikes embedding an allowed host', () => {
                // kmeet.infomaniak.com smuggled inside a longer domain.
                assert.strictEqual(isAllowedBrandHost('kmeet.infomaniak.com.evil.com'), false);
                assert.strictEqual(isAllowedBrandHost('kmeet.preprod.dev.infomaniak.ch.evil.com'), false);
            });

            it('rejects the YWH bypass payloads', () => {
                assert.strictEqual(isAllowedBrandHost('127.0.0.1:8899#@kmeet.infomaniak.com'), false);
                assert.strictEqual(isAllowedBrandHost('evil.com\\@kmeet.infomaniak.com'), false);
            });
        });
    });

    describe('parseAuthority', () => {
        it('parses a bare authority', () => {
            assert.deepStrictEqual(parseAuthority('kmeet.infomaniak.com'), {
                hostname: 'kmeet.infomaniak.com',
                origin: 'https://kmeet.infomaniak.com',
                port: ''
            });
        });

        it('keeps a non-default port in the canonical origin', () => {
            const parsed = parseAuthority('kmeet.infomaniak.com:8443');

            assert.strictEqual(parsed?.hostname, 'kmeet.infomaniak.com');
            assert.strictEqual(parsed?.port, '8443');
            assert.strictEqual(parsed?.origin, 'https://kmeet.infomaniak.com:8443');
        });

        it('drops the default port', () => {
            const parsed = parseAuthority('kmeet.infomaniak.com:443');

            assert.strictEqual(parsed?.origin, 'https://kmeet.infomaniak.com');
        });

        it('lowercases and drops a trailing dot', () => {
            const parsed = parseAuthority('Kmeet.Infomaniak.Com.');

            assert.strictEqual(parsed?.hostname, 'kmeet.infomaniak.com');
            assert.strictEqual(parsed?.origin, 'https://kmeet.infomaniak.com');
        });

        it('accepts full URLs and keeps only the origin', () => {
            const parsed = parseAuthority('https://kmeet.infomaniak.com/room#config.x=y');

            assert.strictEqual(parsed?.origin, 'https://kmeet.infomaniak.com');
        });

        it('accepts a kmeet:// payload', () => {
            const parsed = parseAuthority('kmeet://kmeet.infomaniak.com/room');

            assert.strictEqual(parsed?.origin, 'https://kmeet.infomaniak.com');
        });

        it('fails closed on empty and unparsable input', () => {
            assert.strictEqual(parseAuthority(''), null);
            assert.strictEqual(parseAuthority('   '), null);
            assert.strictEqual(parseAuthority(undefined), null);
            assert.strictEqual(parseAuthority(null), null);
            assert.strictEqual(parseAuthority('https://'), null);
            assert.strictEqual(parseAuthority(':8443'), null);
        });

        it('parses scheme-like input as a hostname and lets the allow-list reject it', () => {
            // 'https:' is not a scheme+// value, so it becomes the host of
            // 'https://https'. The URL parser is right; the allow-list
            // comparison rejects the host.
            const parsed = parseAuthority('https:');

            assert.strictEqual(parsed?.hostname, 'https');
            assert.strictEqual(isAllowedHost('https:'), false);
        });

        it('fails closed on userinfo', () => {
            assert.strictEqual(parseAuthority('user@kmeet.infomaniak.com'), null);
            assert.strictEqual(parseAuthority('user:pass@kmeet.infomaniak.com'), null);
        });
    });

    describe('Protocol link parsing (handleProtocolCall)', () => {
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

        it('rejects the reported bypass kmeet://127.0.0.1:8899#@kmeet.infomaniak.com/room', () => {
            const inputURL = '127.0.0.1:8899#@kmeet.infomaniak.com/room';
            const hostPart = inputURL.split('/')[0];

            assert.strictEqual(isAllowedHost(hostPart), false);
            // The parser sees what the browser sees: host 127.0.0.1 — the
            // kmeet.infomaniak.com part is only a fragment.
            assert.strictEqual(parseAuthority(hostPart)?.hostname, '127.0.0.1');
        });
    });

    describe('createConferenceObjectFromURL (renderer entry)', () => {
        it('rejects an unauthorized server', () => {
            assert.strictEqual(
                createConferenceObjectFromURL('attacker.invalid/room', DEFAULT_SERVER_URL),
                undefined);
        });

        it('allows an authorized host/room and canonicalizes the origin', () => {
            const conference = createConferenceObjectFromURL(
                'kmeet.infomaniak.com/room', DEFAULT_SERVER_URL);

            assert.deepStrictEqual(conference, {
                room: 'room',
                serverURL: 'https://kmeet.infomaniak.com',
                subject: undefined
            });
        });

        it('uses the default server for a room-only link', () => {
            const conference = createConferenceObjectFromURL('room', DEFAULT_SERVER_URL);

            assert.deepStrictEqual(conference, {
                room: 'room',
                serverURL: 'https://kmeet.infomaniak.com',
                subject: undefined
            });
        });

        it('rejects the reported bypass payload end-to-end', () => {
            const conference = createConferenceObjectFromURL(
                '127.0.0.1:8899#@kmeet.infomaniak.com/room', DEFAULT_SERVER_URL);

            assert.strictEqual(conference, undefined);
        });

        it('rejects the ? and \\ bypass variants end-to-end', () => {
            assert.strictEqual(
                createConferenceObjectFromURL('127.0.0.1:8899?@kmeet.infomaniak.com/room', DEFAULT_SERVER_URL),
                undefined);
            assert.strictEqual(
                createConferenceObjectFromURL('127.0.0.1:8899\\#@kmeet.infomaniak.com/room', DEFAULT_SERVER_URL),
                undefined);
        });

        it('keeps an inert fragment on an allowed host and canonicalizes the origin', () => {
            // The fragment (@attacker.invalid) is inert: the browser loads
            // the parsed origin, which is kmeet.infomaniak.com.
            const conference = createConferenceObjectFromURL(
                'kmeet.infomaniak.com#@attacker.invalid/room', DEFAULT_SERVER_URL);

            assert.strictEqual(conference?.serverURL, 'https://kmeet.infomaniak.com');
            assert.strictEqual(conference?.room, 'room');
        });

        it('keeps a non-default port of an allowed host', () => {
            const conference = createConferenceObjectFromURL(
                'kmeet.infomaniak.com:8443/room', DEFAULT_SERVER_URL);

            assert.strictEqual(conference?.serverURL, 'https://kmeet.infomaniak.com:8443');
        });

        it('carries the subject through', () => {
            const conference = createConferenceObjectFromURL(
                'kmeet.infomaniak.com/room/subject', DEFAULT_SERVER_URL);

            assert.strictEqual(conference?.subject, 'subject');
        });

        it('rejects customer brand hosts in strict mode (OS deep links)', () => {
            assert.strictEqual(
                createConferenceObjectFromURL('kmeet.customer.com/room', DEFAULT_SERVER_URL),
                undefined);
        });

        it('rejects brand domains in strict mode (deep links never reach brands)', () => {
            assert.strictEqual(
                createConferenceObjectFromURL(
                    'kmeet.infomaniakgroup.com/room/subject', DEFAULT_SERVER_URL),
                undefined);
        });

        it('accepts brand hosts when the join comes from the web app', () => {
            const conference = createConferenceObjectFromURL(
                'kmeet.infomaniakgroup.com/room/subject',
                DEFAULT_SERVER_URL,
                { allowBrands: true });

            assert.deepStrictEqual(conference, {
                room: 'room',
                serverURL: 'https://kmeet.infomaniakgroup.com',
                subject: 'subject'
            });
        });

        it('still rejects attacker hosts in brand mode', () => {
            assert.strictEqual(
                createConferenceObjectFromURL(
                    'attacker.invalid/room', DEFAULT_SERVER_URL, { allowBrands: true }),
                undefined);
            assert.strictEqual(
                createConferenceObjectFromURL(
                    'kmeet.infomaniak.com.evil.com/room', DEFAULT_SERVER_URL, { allowBrands: true }),
                undefined);
        });
    });
});
