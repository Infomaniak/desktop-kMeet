/* global process */

module.exports = {
    platform: process.platform,
    port: process.env.PORT ? process.env.PORT : 3000,
    title: 'Electron i18n',
    languages: [ 'fr', 'en', 'de', 'es', 'it' ],
    fallbackLng: 'fr',
    namespace: 'translation'
};
