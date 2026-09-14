

/**
 * Single source of truth for locating a protocol URL inside a command line.
 *
 * The URL is not always the last argument. Chromium appends switches of its own
 * when it forwards a command line to the first instance, so popping the last
 * element can yield a switch instead of the URL; handleProtocolCall then drops
 * the call and the meeting never opens. Matching on the scheme is independent
 * of position.
 *
 * This module is plain CommonJS so it can be required by the main process and
 * directly by the regression tests: a change to the production logic can no
 * longer silently pass the suite.
 */

/**
 * Finds the first argument that is a link for the given scheme.
 *
 * The comparison is case sensitive on purpose: callers strip the same prefix
 * from the match afterwards, so accepting a different casing here would leave
 * the scheme in the payload.
 *
 * @param {Array<string>} argv - The command line to search.
 * @param {string} scheme - The scheme prefix to look for, separator included
 * (for instance 'kmeet://').
 * @returns {string|undefined} The protocol URL, when present.
 */
function findProtocolArgument(argv, scheme) {
    if (!Array.isArray(argv) || !scheme) {
        return undefined;
    }

    return argv.find(arg =>
        typeof arg === 'string' && arg.indexOf(scheme) === 0);
}

module.exports = {
    findProtocolArgument
};
