/**
 * Sets the injected preprod host fixture before the hostAllowList module is
 * imported: the module captures KMEET_PREPROD_HOST at load time, exactly like
 * the esbuild `define` does in the app bundles (see .env.kmeet.example).
 * Import this module first in any test file that exercises the allow-list.
 */
process.env.KMEET_PREPROD_HOST = 'kmeet-preprod.example.test';

export const PREPROD_HOST_FIXTURE = process.env.KMEET_PREPROD_HOST;
