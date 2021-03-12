
export default {
    /**
     * The URL with extra information about the app / service.
     */
    aboutURL: 'https://www.infomaniak.com/meet/',

    /**
     * Application name.
     */
    appName: 'Infomaniak kMeet',

    /**
     * The default server URL of Jitsi Meet Deployment that will be used.
     */
    defaultServerURL: 'https://kmeet.infomaniak.com',

    /**
     * URL to send feedback.
     */
    feedbackURL: 'https://www.infomaniak.com/gtl/support.contact',

    /**
     * The URL of Privacy Policy Page.
     */
    privacyPolicyURL: 'https://www.infomaniak.com/gtl/rgpd.confidentiality',

    /**
     * The URL of Terms and Conditions Page.
     */
    termsAndConditionsURL: 'https://www.infomaniak.com/gtl/rgpd.documents',

    /**
     * Some of default values for application.
     */
    defaults: {
        alwaysOnTopWindowEnabled: true
    },

    /**
     * All needed configurations for storage in our application.
     * This is including electron-store and redux-persist.
     */
    storage: {
        /**
         * Key where all redux-persist data is stored.
         * Note: FULL_STORE_KEY = redux-persist.KEY_PREFIX + storage.rootKey.
         */
        rootKey: 'root',
        settingsKey: 'settings',
        windowAlwaysOnTopKey: 'windowAlwaysOnTop'
    }
};
