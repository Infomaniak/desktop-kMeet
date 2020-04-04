const i18n = require('i18next').default;

const initReactI18next = require('react-i18next').initReactI18next;
const translationEN = require('../../../locales/en/translation.json');
const translationFR = require('../../../locales/fr/translation.json');
const translationES = require('../../../locales/es/translation.json');
const translationIT = require('../../../locales/it/translation.json');
const translationDE = require('../../../locales/de/translation.json');

const i18nextOptions = {
    lng: 'fr',
    fallbackLng: 'en', // use en if detected lng is not available
    resources: {
        en: { translation: translationEN },
        fr: { translation: translationFR },
        es: { translation: translationES },
        it: { translation: translationIT },
        de: { translation: translationDE }
    },

    keySeparator: false, // we do not use keys in form messages.welcome

    interpolation: {
        escapeValue: false // react already safes from xss
    }
};

i18n.use(initReactI18next)
    .init(i18nextOptions);

export default i18n;
