const RemoteDrawMain = require('./main');
const RemoteDraw = require('./render');
const { popupsConfigRegistry } = require('../popupsconfig');


// popupsConfigRegistry.registerPopupConfig('remote-draw-window', {
//     matchPatterns: {
//         frameName: 'RemoteDrawWindow'
//     },
//     target: 'electron'
// });

module.exports = {
    RemoteDrawMain,
    RemoteDraw
};