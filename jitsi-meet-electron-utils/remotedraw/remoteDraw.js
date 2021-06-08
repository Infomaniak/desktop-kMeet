const {SCREEN_SHARE_DRAW_EVENTS_CHANNEL} = require("./constants");
const { ipcRenderer } = require('electron');

// create canvas element and append it to document body
var canvas = document.createElement('canvas');
document.body.appendChild(canvas);

document.body.style.margin = 0;
canvas.style.position = 'fixed';

// get canvas 2D context and set him correct size
var ctx = canvas.getContext('2d');
ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;
var cleaningInterval;
var draws = [];

ipcRenderer.on(SCREEN_SHARE_DRAW_EVENTS_CHANNEL, (event, { data, display }) => {
    if (!draws[data.participantId]) {
        draws[data.participantId] = {
            drawing: false,
            positions: {},
            color: data.color,
            cleaningInterval: undefined
        };
    }

    if (data.type === 'mouseup') {
        draws[data.participantId].drawing = false;
    } else if (data.type === 'mousedown') {
        draws[data.participantId].drawing = true;
    } else if (data.type === 'mousemove') {
        draws[data.participantId].color = data.color;
        if (draws[data.participantId].drawing) {
            if (cleaningInterval) {
                clearInterval(cleaningInterval);
            }

            ctx.beginPath();
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.strokeStyle = data.color;

            if (draws[data.participantId].positions.x) {
                ctx.moveTo(draws[data.participantId].positions.x, draws[data.participantId].positions.y - display.workArea.y);
                ctx.lineTo(data.destX, data.destY - display.workArea.y);
                ctx.stroke();

                cleaningInterval = setInterval(() => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }, 10000)
            }
        }

        draws[data.participantId].positions.x = data.destX;
        draws[data.participantId].positions.y = data.destY;
    }
});
