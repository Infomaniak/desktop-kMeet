import i18n from 'i18next';
const { app } = require('electron');

import { initReactI18next } from 'react-i18next';

const languages = {
    de: { translation: require('./lang/de.json') },
    en: { translation: require('./lang/en.json') },
    es: { translation: require('./lang/es.json') },
    fr: { translation: require('./lang/fr.json') },
    it: { translation: require('./lang/it.json') }
};

i18n
    .use(initReactI18next)
    .init({
        lng: app.getLocale(),
        resources: languages,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // not needed for react as it escapes by default
        }
    });

export default i18n;
