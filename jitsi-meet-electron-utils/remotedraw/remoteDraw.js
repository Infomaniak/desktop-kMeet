const { SCREEN_SHARE_DRAW_EVENTS_CHANNEL } = require("./constants");
const { ipcRenderer } = require("electron");

// const getStroke = require("perfect-freehand").default;
// const polygonClipping = require("polygon-clipping");
// const { v4: uuidv4 } = require('uuid');

const SET_INTERVAL = 1;
const CLEAR_INTERVAL = 2;
const INTERVAL_TIMEOUT = 3;

const defaultOptions = {
  size: 10,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
  clip: false,
  easing: {
    0: 0.25,
    1: 0.25,
    2: 0.75,
    3: 0.75,
    evaluate: (t) => t,
  },
  taperStart: 0,
  taperEnd: 0,
  taperStartEasing: {
    0: 0.25,
    1: 0.25,
    2: 0.75,
    3: 0.75,
    evaluate: (t) => t,
  },
  taperEndEasing: {
    0: 0.25,
    1: 0.25,
    2: 0.75,
    3: 0.75,
    evaluate: (t) => t,
  },
};

// create canvas element and append it to document body
var canvas = document.createElement("canvas");
var nameLayer = document.createElement("div");
document.body.appendChild(canvas);

document.body.style.margin = 0;
canvas.style.position = "fixed";
nameLayer.style.position = "fixed";
nameLayer.style.height = "100%";
nameLayer.style.width = "100%";
nameLayer.style.fontFamily = "SuisseIntl";
document.body.appendChild(nameLayer);

// get canvas 2D context and set him correct size
var ctx = canvas.getContext("2d");
ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

var cleaningInterval = {};
var draws = {};
var timeouts = {};


function _onFrameTimer(response) {
  if (response.data.id === INTERVAL_TIMEOUT) {
    // drawFromStorage();
  }
}

function hexToRgb(hex) {
  var bigint = parseInt(hex, 16);
  var r = (bigint >> 16) & 255;
  var g = (bigint >> 8) & 255;
  var b = bigint & 255;

  return r + ", " + g + ", " + b;
}

function round(value, precision) {
  var multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}

// function redraw(path) {
//   ctx.globalCompositeOperation = 'source-over';
//   ctx.fillStyle = 'rgba(0,0,0,0)';
//   ctx.shadowColor = 'rgba(0,0,0,0)';
//   ctx.shadowBlur = 0;
//   ctx.fill(path);
// }

function draw(id, strokeOptions = {}, gco = "source-over", coords = undefined) {
  ctx.fillStyle = draws[id].color;
  ctx.strokeStyle = draws[id].color;
  ctx.globalCompositeOperation = gco;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 1;
  ctx.shadowColor = draws[id].color;

  ctx.stroke(draws[id].path);

  draws[id].dirty = false;
}

function onMouseMove(destX, destY, color, id, display) {
  console.log(destX, destY, display)
  draws[id].color = color;
  // destY = destY - display.workArea.y;
  if (draws[id].drawing) {
    draws[id].path.lineTo( destX, destY );

    if (!draws[id].dirty) {
      draws[id].dirty = true;
      const label = document.getElementById(id);
      if (label) {
        label.style.top = destY + 10 + "px";
        label.style.left = destX + "px";
        label.style.backgroundColor = color;
        label.style.opacity = '1';
      }
      draw(id);
    }
  }
}

ipcRenderer.on(SCREEN_SHARE_DRAW_EVENTS_CHANNEL, (event, { data, display }) => {
  // const display = ipcRenderer.sendSync('jitsi-remotedraw-get-display', data.sourceId);
  if (!draws[data.participantId]) {
    draws[data.participantId] = {
      drawing: false,
      positions: {},
      color: data.color,
      coords: [],
      path: undefined,
      dirty: false,
    };
  }

  switch (data.type) {
    case "mouseup":
      draws[data.participantId].drawing = false;
      break;
    case "mousedown":
      if (cleaningInterval[data.participantId]) {
        clearTimeout(cleaningInterval[data.participantId]);
      }

      var nameLabel = document.getElementById(data.participantId)

      if (!nameLabel) {
        nameLabel = document.createElement("span");
        nameLabel.style.position = "absolute";
        nameLabel.id = data.participantId;
        nameLabel.style.backgroundColor = data.color;
        nameLabel.style.color = "white";
        nameLabel.style.padding = "5px";
        nameLabel.style.borderRadius = "2px";
        nameLabel.style.fontFamily = "SuisseIntl,Helvetica,verdana,serif";

        const txt = document.createTextNode(data.nameLabel);
        nameLabel.appendChild(txt);
        nameLayer.appendChild(nameLabel);
      }
      nameLabel.style.opacity = '0';
      nameLabel.style.top = "-2000px";
      nameLabel.style.left = "-2000px";

      draws[data.participantId].drawing = true;
      draws[data.participantId].path = new Path2D();
      draws[data.participantId].path.moveTo(data.destX, data.destY);

      break;
    case "mousemove":
      if (
        cleaningInterval[data.participantId]
      ) {
        clearTimeout(cleaningInterval[data.participantId]);
      }
      onMouseMove(data.destX, data.destY, data.color, data.participantId, display);
      cleaningInterval[data.participantId] = setTimeout(() => {
            if (document.getElementById(data.participantId)) {
                document.getElementById(data.participantId).remove();
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            draws[data.participantId].path = new Path2D();
            Object.keys(draws).forEach(pid => {
                if (pid !== data.participantId) {
                    draw(pid);
                }
            });
            draws[data.participantId].dirty = false;
            draws[data.participantId].drawing = false;
          }, 3000);
      break;

    default:
      break;
  }
});
