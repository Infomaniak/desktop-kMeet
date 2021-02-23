const popupConfigs = {
    'google-auth': {
        matchPatterns: {
            url: '^https:\\/\\/(www\\.)?accounts\\.google\\.com\\/'
        },
        target: 'electron'
    },
    'dropbox-auth': {
        matchPatterns: {
            url: '^https:\\/\\/(www\\.)?dropbox\\.com\\/oauth2\\/authorize'
        },
        target: 'electron'
    },
    'infomaniak-auth': {
        matchPatterns: {
            url: '^https:\\/\\/login\\.infomaniak\\.com\\/authorize'
        },
        target: 'electron'
    }
};

module.exports = {
    popupConfigs
};
