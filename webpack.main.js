const path = require('path');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');

module.exports = (env, argv) => {
    const plugins = argv.mode === 'development' ? [] : [
        sentryWebpackPlugin({
            include: '.',
            ignore: [ 'node_modules', 'webpack.config.js' ],
            authToken: process.env.SENTRY_AUTH_TOKEN,
            org: 'sentry',
            project: 'kmeet-desktop',
            url: 'https://sentry-kchat.infomaniak.com/'
        })
    ];

    return {
        target: 'electron-main',
        entry: { main: './main.js',
            preload: './app/preload/preload.js' },
        output: {
            path: path.resolve('./build'),
            filename: '[name].js'
        },
        devtool: 'source-map',
        plugins,
        node: {
            __dirname: true
        },
        externals: [ {
            '@infomaniak/jitsi-meet-electron-sdk': 'require(\'@infomaniak/jitsi-meet-electron-sdk\')',
            'electron-debug': 'require(\'electron-debug\')',
            'electron-reload': 'require(\'electron-reload\')',
            '@sentry/electron': 'require(\'@sentry/electron\')'
        } ],
        resolve: {
            modules: [
                path.resolve('./node_modules')
            ]
        }
    };
};

