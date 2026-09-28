module.exports = {
    'root': true,
    'extends': [
        '@jitsi/eslint-config'
    ],
    'settings': {
        'react': {
            'version': '17.0'
        }
    },
    'overrides': [
        {
            'files': [ '*.ts', '*.tsx' ],
            'plugins': [ 'react' ],
            'rules': {
                'react/prop-types': 0,
                'react/react-in-jsx-scope': 2
            }
        }
    ]
};
