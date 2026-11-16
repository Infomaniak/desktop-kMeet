import assert from 'node:assert';

import { buildInfomaniakUserAgent } from '../app/features/utils/userAgent';

describe('Infomaniak user agent', () => {
    it('adds the app marker before the first page request', () => {
        const userAgent = buildInfomaniakUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Electron/43.3.0',
            '2.0.1'
        );

        assert.strictEqual(userAgent, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Electron/43.3.0 Infomaniak/2.0.1');
    });

    it('does not duplicate the app marker', () => {
        const userAgent = buildInfomaniakUserAgent(
            'Mozilla/5.0 Electron/43.3.0 Infomaniak/2.0.1',
            '2.0.1'
        );

        assert.strictEqual(userAgent, 'Mozilla/5.0 Electron/43.3.0 Infomaniak/2.0.1');
    });
});
