import log from 'electron-log';

import { languages } from './i18n/i18n';

/**
 * Class for managing i18n for the main process.
 */
export class I18nManager {
    currentLanguage;

    /**
     * Initializes a new {@code I18nManager} instance.
     *
     * @inheritdoc
     */
    constructor() {
        this.currentLanguage = this.getLanguages().en;

        this.setLocale = this.setLocale.bind(this);
        this.isLanguageAvailable = this.isLanguageAvailable.bind(this);
        this.getCurrentLanguage = this.getCurrentLanguage.bind(this);
    }

    /**
     * Sets locale to use for i18n.
     *
     * @returns {boolean} - Whether set was successful.
     */
    setLocale(locale) {
        log.debug('i18nManager.setLocale', locale);

        if (this.isLanguageAvailable(locale)) {
            this.currentLanguage = this.getLanguages()[locale];
            log.info('Set new language', locale);

            return true;
        }

        log.warn('Failed to set new language', locale);

        return false;
    }

    /**
     * Returns full language config.
     *
     * @returns {Record<string, Object>}
     */
    getLanguages() {
        return languages;
    }

    /**
     * Returns array of supported languages
     *
     * @returns {Array<string>}
     */
    getAvailableLanguages() {
        return Object.keys(languages);
    }

    /**
     * Returns if language exists in language map.
     *
     * @param {string} locale
     * @returns {boolean}
     */
    isLanguageAvailable(locale) {
        return Boolean(this.getLanguages()[locale]);
    }

    /**
     * Returns current language.
     *
     * @returns {Object} language
     * @returns {string} language.value
     * @returns {string} language.name
     * @returns {number} language.order
     * @returns {string} language.url
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

const i18nManager = new I18nManager();

export default i18nManager;

/**
 * Translate function to be used for translation.
 */
export function localizeMessage(s, defaultString = '', values = {}) {
    let str = i18nManager.currentLanguage.url[s] || defaultString;

    for (const key of Object.keys(values)) {
        str = str.replace(new RegExp(`{${key}}`, 'g'), values[key]);
    }

    return str;
}
