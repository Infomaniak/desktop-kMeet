const assert = require('assert');

const { findProtocolArgument } = require('../app/features/utils/protocolArgument');

/**
 * Regression tests for locating the protocol URL in a command line.
 *
 * The handlers used to take the last argument (commandLine.pop()). That is not
 * reliable: Chromium appends switches of its own when it forwards a command
 * line to the first instance, and the URL is then no longer last. The call was
 * dropped, the meeting never opened, and the web page reported the app as not
 * installed.
 */

const SCHEME = 'kmeet://';
const URL = 'kmeet://kmeet.infomaniak.com/a-room';

describe('findProtocolArgument', () => {
    it('finds the URL when it is the last argument', () => {
        assert.strictEqual(
            findProtocolArgument([ 'kMeet.exe', URL ], SCHEME), URL);
    });

    it('finds the URL when a switch follows it', () => {
        const argv = [ 'kMeet.exe', URL, '--original-process-start-time=13418' ];

        assert.strictEqual(findProtocolArgument(argv, SCHEME), URL);
    });

    it('finds the URL between other switches', () => {
        const argv = [ 'kMeet.exe', '--allow-file-access-from-files', URL, '--no-sandbox' ];

        assert.strictEqual(findProtocolArgument(argv, SCHEME), URL);
    });

    it('returns the first URL when several are present', () => {
        const second = 'kmeet://kmeet.infomaniak.com/another-room';

        assert.strictEqual(
            findProtocolArgument([ 'kMeet.exe', URL, second ], SCHEME), URL);
    });

    it('returns undefined when no argument uses the scheme', () => {
        const argv = [ 'kMeet.exe', '--original-process-start-time=13418' ];

        assert.strictEqual(findProtocolArgument(argv, SCHEME), undefined);
    });

    it('ignores a URL that only contains the scheme elsewhere', () => {
        const argv = [ 'kMeet.exe', 'https://example.invalid/?next=kmeet://room' ];

        assert.strictEqual(findProtocolArgument(argv, SCHEME), undefined);
    });

    it('returns undefined for a command line that is not an array', () => {
        assert.strictEqual(findProtocolArgument(undefined, SCHEME), undefined);
        assert.strictEqual(findProtocolArgument(URL, SCHEME), undefined);
    });

    it('returns undefined when no scheme is given', () => {
        assert.strictEqual(findProtocolArgument([ 'kMeet.exe', URL ]), undefined);
    });

    it('skips non-string arguments', () => {
        const argv = [ 'kMeet.exe', null, 42, URL ];

        assert.strictEqual(findProtocolArgument(argv, SCHEME), URL);
    });
});
