/**
 * Adds the marker consumed by the kMeet homepage before it renders its login
 * action. Keeping this idempotent avoids changing the UA when a session has
 * already been configured.
 */
export function buildInfomaniakUserAgent(userAgent: string, version: string): string {
    const marker = `Infomaniak/${version}`;

    return userAgent.includes(marker) ? userAgent : `${userAgent} ${marker}`;
}
