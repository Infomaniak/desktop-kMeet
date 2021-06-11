const { SCREEN_SHARE_DRAW_EVENTS_CHANNEL } = require("./constants");
const { ipcRenderer } = require("electron");

const SET_INTERVAL = 1;
const CLEAR_INTERVAL = 2;
const INTERVAL_TIMEOUT = 3;

/**
 * The following code is needed as string to create a URL from a Blob.
 * The URL is then passed to a WebWorker. Reason for this is to enable
 * use of setInterval that is not throttled when tab is inactive.
 */
const code = `
      var timer;
  
      onmessage = function(request) {
          switch (request.data.id) {
          case ${SET_INTERVAL}: {
              timer = setInterval(() => {
                  postMessage({ id: ${INTERVAL_TIMEOUT} });
              }, request.data.timeMs);
              break;
          }
          case ${CLEAR_INTERVAL}: {
              if (timer) {
                  clearInterval(timer);
              }
              break;
          }
          }
      };
  `;

// const timerWorkerScript = URL.createObjectURL(
//   new Blob([code], { type: "application/javascript" })
// );

// create canvas element and append it to document body
var canvas = document.createElement("canvas");
document.body.appendChild(canvas);

document.body.style.margin = 0;
canvas.style.position = "fixed";

// get canvas 2D context and set him correct size
var ctx = canvas.getContext("2d");
ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;
var cleaningInterval;
var draws = [];

var rx = 20;
var ry = 20;
var rw = 120;
var rh = 80;
const DELAY = 200;
var alpha = 1;

// const _maskFrameTimerWorker = new Worker(timerWorkerScript, {
//   name: "Draw effect worker",
// });
// _maskFrameTimerWorker.onmessage = _onFrameTimer;

// _maskFrameTimerWorker.postMessage({
//     id: SET_INTERVAL,
//     timeMs: 1000 / 30,
// });

function _onFrameTimer(response) {
  if (response.data.id === INTERVAL_TIMEOUT) {
    // drawFromStorage();
  }
}

// function drawFromStorage() {
//     ctx.beginPath();
//     for (let i = 1; i <= pointsStorage.length; i++) {
//         // draw(pointsStorage[i].x, pointsStorage[i].y, 2, pointsStorage[i].color)
//         ctx.moveTo(pointsStorage[i - 1].x, pointsStorage[i - 1].y);
//         ctx.lineTo(pointsStorage[i].x, pointsStorage[i].y);
//         ctx.stroke();
//     }
//     pointsStorage = [];
// }

function draw(x, y, size, color, id) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  if (draws[id].positions.x && draws[id].positions.y && (x !== draws[id].positions.x || y !== draws[id].positions.y)) {
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(draws[id].positions.x, draws[id].positions.y);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
}

function onMouseMove(destX, destY, color, id) {
  if (draws[id].drawing) {
    // pointsStorage.push({ x: mouseX, y: mouseY, color });
    if (draws[id].positions.x) {
        draw(destX, destY, 2, color, id);
        if (cleaningInterval) {
          clearInterval(cleaningInterval);
        }
    
        cleaningInterval = setInterval(() => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
            // fadeout();
        }, 4000);
    }
  }
}

ipcRenderer.on(SCREEN_SHARE_DRAW_EVENTS_CHANNEL, (event, { data, display }) => {
  if (!draws[data.participantId]) {
    draws[data.participantId] = {
      drawing: false,
      positions: {},
      color: data.color,
      shapes: []
    };
  }

  switch (data.type) {
    case "mouseup":
      draws[data.participantId].drawing = false;

      break;
    case "mousedown":
      draws[data.participantId].drawing = true;

      break;
    case "mousemove":
        onMouseMove(data.destX, data.destY, data.color, data.participantId);
        draws[data.participantId].positions.x = data.destX;
        draws[data.participantId].positions.y = data.destY;

      break;

    default:
      break;
  }
});
