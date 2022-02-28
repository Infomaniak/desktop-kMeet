const path = require('path');
const SentryCliPlugin = require('@sentry/webpack-plugin');

const plugins = argv.mode === 'development' ? [] : [
        new SentryCliPlugin({
            include: '.',
            ignore: [ 'node_modules', 'webpack.config.js' ],
            configFile: 'sentry.properties'
        })
    ];

module.exports = {
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
        'jitsi-meet-electron-utils': 'require(\'jitsi-meet-electron-utils\')',
        'electron-debug': 'require(\'electron-debug\')',
        'electron-reload': 'require(\'electron-reload\')'
    } ],
    resolve: {
        modules: [
            path.resolve('./node_modules')
        ]
    }
};

