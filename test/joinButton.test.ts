import assert from 'node:assert';

import { isAllowedHost } from '../app/features/utils/hostAllowList';
import { buildJoinButtonProtocolPayload } from '../app/features/utils/joinButton';

/**
 * Tests for the joinButton interception (start/join button of the embedded
 * kMeet web homepage). The web app signals the join through a matomo pixel
 * whose cvar carries the room hostname — web-controlled input that must go
 * through the same protocol gate as an OS deep link.
 */

const DEFAULT_SERVER_HOST = 'kmeet.infomaniak.com';

function pixelUrl(cvar: unknown): string {
    return 'https://kmeet.infomaniak.com/matomo.php?idsite=1&rec=1'
        + '&url=https%3A%2F%2Fkmeet.infomaniak.com%2F%23welcomePage.joinButton.clicked'
        + `&cvar=${encodeURIComponent(JSON.stringify(cvar))}`;
}

describe('joinButton payload', () => {
    it('builds the payload from the object-shaped cvar', () => {
        const payload = buildJoinButtonProtocolPayload(pixelUrl({
            '1': [ 'room_hostname', 'https://client.kmeet.infomaniak.com' ],
            '2': [ 'conference_name', 'myroom' ],
            '3': [ 'room_subject', 'mysubject' ]
        }), DEFAULT_SERVER_HOST);

        assert.strictEqual(payload, 'kmeet://client.kmeet.infomaniak.com/myroom/mysubject');
    });

    it('builds the payload from an array-of-pairs cvar', () => {
        const payload = buildJoinButtonProtocolPayload(pixelUrl([
            [ 'room_hostname', 'client.kmeet.infomaniak.com' ],
            [ 'conference_name', 'myroom' ],
            [ 'room_subject', 'mysubject' ]
        ]), DEFAULT_SERVER_HOST);

        assert.strictEqual(payload, 'kmeet://client.kmeet.infomaniak.com/myroom/mysubject');
    });

    it('falls back to the default server when no room hostname is sent', () => {
        const payload = buildJoinButtonProtocolPayload(pixelUrl({
            '2': [ 'conference_name', 'myroom' ]
        }), DEFAULT_SERVER_HOST);

        assert.strictEqual(payload, `kmeet://${DEFAULT_SERVER_HOST}/myroom/`);
    });

    it('strips the scheme from the room hostname', () => {
        const payload = buildJoinButtonProtocolPayload(pixelUrl({
            '1': [ 'room_hostname', 'https://client.kmeet.infomaniak.com' ],
            '2': [ 'conference_name', 'myroom' ]
        }), DEFAULT_SERVER_HOST);

        assert.strictEqual(payload?.startsWith('kmeet://client.kmeet.infomaniak.com/'), true);
    });

    it('returns null when the conference name is missing', () => {
        const payload = buildJoinButtonProtocolPayload(pixelUrl({
            '1': [ 'room_hostname', 'client.kmeet.infomaniak.com' ]
        }), DEFAULT_SERVER_HOST);

        assert.strictEqual(payload, null);
    });

    it('returns null when the URL is not a joinButton pixel', () => {
        const url = 'https://kmeet.infomaniak.com/matomo.php?rec=1'
            + `&cvar=${encodeURIComponent(JSON.stringify({ '2': [ 'conference_name', 'r' ] }))}`;

        assert.strictEqual(buildJoinButtonProtocolPayload(url, DEFAULT_SERVER_HOST), null);
    });

    it('returns null on malformed cvar JSON', () => {
        const url = 'https://kmeet.infomaniak.com/matomo.php?rec=1'
            + '&url=https%3A%2F%2Fkmeet.infomaniak.com%2F%23welcomePage.joinButton.clicked'
            + `&cvar=${encodeURIComponent('{not json')}`;

        assert.strictEqual(buildJoinButtonProtocolPayload(url, DEFAULT_SERVER_HOST), null);
    });

    it('produces payloads the protocol gate accepts for allowed hosts', () => {
        const payload = buildJoinButtonProtocolPayload(pixelUrl({
            '1': [ 'room_hostname', 'https://client.kmeet.infomaniak.com' ],
            '2': [ 'conference_name', 'myroom' ]
        }), DEFAULT_SERVER_HOST);

        assert.strictEqual(isAllowedHost(payload?.split('kmeet://')[1].split('/')[0]), true);
    });

    it('produces payloads the protocol gate rejects for attacker hosts', () => {
        const payload = buildJoinButtonProtocolPayload(pixelUrl({
            '1': [ 'room_hostname', 'evil.example.com' ],
            '2': [ 'conference_name', 'myroom' ]
        }), DEFAULT_SERVER_HOST);

        assert.strictEqual(payload, 'kmeet://evil.example.com/myroom/');
        assert.strictEqual(isAllowedHost(payload?.split('kmeet://')[1].split('/')[0]), false);
    });

    it('produces payloads the protocol gate rejects for bypass shapes', () => {
        // A web-compromised cvar trying the YWH confusion shape.
        const payload = buildJoinButtonProtocolPayload(pixelUrl({
            '1': [ 'room_hostname', '127.0.0.1:8899#@kmeet.infomaniak.com' ],
            '2': [ 'conference_name', 'myroom' ]
        }), DEFAULT_SERVER_HOST);

        assert.strictEqual(payload, 'kmeet://127.0.0.1:8899#@kmeet.infomaniak.com/myroom/');
        assert.strictEqual(isAllowedHost(payload?.split('kmeet://')[1].split('/')[0]), false);
    });
});
