const { SCREEN_SHARE_DRAW_EVENTS_CHANNEL } = require("./constants");
const { ipcRenderer } = require("electron");
const getStroke = require("perfect-freehand").default;
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

/**
 * The following code is needed as string to create a URL from a Blob.
 * The URL is then passed to a WebWorker. Reason for this is to enable
 * use of setInterval that is not throttled when tab is inactive.
 */
// const code = `
//       var timer;

//       onmessage = function(request) {
//           switch (request.data.id) {
//           case ${SET_INTERVAL}: {
//               timer = setInterval(() => {
//                   postMessage({ id: ${INTERVAL_TIMEOUT} });
//               }, request.data.timeMs);
//               break;
//           }
//           case ${CLEAR_INTERVAL}: {
//               if (timer) {
//                   clearInterval(timer);
//               }
//               break;
//           }
//           }
//       };
//   `;

function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}

// function getFlatSvgPathFromStroke(stroke) {
//   const poly = polygonClipping.union([stroke]);

//   const d = [];

//   for (let face of poly) {
//     for (let points of face) {
//       d.push(getSvgPathFromStroke(points));
//     }
//   }

//   return d.join(" ");
// }

function getStrokePath(mark, simulatePressure, options, last) {
  const stroke = getStroke(mark.points, {
    ...options,
    smoothing: 4,
    easing: options.easing.evaluate,
    simulatePressure,
    start: {
      taper: options.taperStart,
      easing: options.taperStartEasing.evaluate,
    },
    end: {
      taper: options.taperEnd,
      easing: options.taperEndEasing.evaluate,
    },
    last,
  });

  //   const path = options.clip
  //     ? getFlatSvgPathFromStroke(stroke)
  //     : getSvgPathFromStroke(stroke);
  const path = getSvgPathFromStroke(stroke);

  return path;
}

// const timerWorkerScript = URL.createObjectURL(
//   new Blob([code], { type: "application/javascript" })
// );

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

function redraw(id) {
//   draw(id, { size: 15 }, "destination-out", coords);
//   draws[id].coords = [];
//   ctx.globalCompositeOperation = 'copy';
//   ctx.fillStyle = 'rgba(0,0,0,0)';
//   ctx.fill(draws[id].path);

  // if we dont have an associated interval when this is called that means this was called recursively
  // after the interval has been cleared so we avoid the race condition here.
  //   if (!cleaningInterval[id]) {
  //       return;
  //   }

  //   for (let i = 0; i < coords.length - 1; i++) {
  //     const x = coords[i].x;
  //     const y = coords[i].y;
  //     const nextX = coords[i + 1].x;
  //     const nextY = coords[i + 1].y;
  //     draw(nextX, nextY, coords[i].dragging, 3, "#000000", id, 0, x, y, "destination-out");
  //   }
  //   document.getElementById(id).style.opacity = 0;

  //   const c = hexToRgb(color.split("#")[1]);
  //   const newAlpha = alpha < 1 ? round(alpha - 0.05, 2) : 1;
  //   const newColor = "rgba(" + c + ", " + newAlpha + ")";

  //   if (newAlpha < 0) {
  //     clearTimeout(timeouts[id]);
  //     draws[id].coords = [];
  //     draws[id].dirty = false;

  //     return;
  //   }
  //   timeouts[id] = setTimeout(() => {
  //     for (let i = 0; i < coords.length - 1; i++) {
  //       const x = coords[i].x;
  //       const y = coords[i].y;
  //       const nextX = coords[i + 1].x;
  //       const nextY = coords[i + 1].y;
  //       document.getElementById(id).style.opacity = newAlpha;
  //       draw(nextX, nextY, coords[i].dragging, 3, "#000000", id, newAlpha, x, y, "destination-out");
  //       draw(nextX, nextY, coords[i].dragging, 2, newColor, id, newAlpha, x, y);
  //     }
  //     if (!restore) redraw(coords, id, color, newAlpha);
  //   }, 200);
}

function draw(id, strokeOptions = {}, gco = "source-over", coords = undefined) {
  //   const lastX = lx ?? draws[id].positions.x;
  //   const lastY = ly ?? draws[id].positions.y;
  ctx.fillStyle = draws[id].color;
  ctx.strokeStyle = draws[id].color;
  ctx.globalCompositeOperation = gco;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 2;
  ctx.shadowColor = draws[id].color;

  ctx.stroke(draws[id].path);
  draws[id].dirty = false;
  //   if (lastX && lastY && (x !== lastX || y !== lastY)) {
  //     ctx.lineWidth = size * 2;
  //     ctx.beginPath();
  //     ctx.moveTo(lastX, lastY);
  //     if (shouldStroke) {
  //       ctx.lineTo(x, y);
  //       ctx.stroke();
  //     }
  //   }
  //   ctx.beginPath();
  //   ctx.arc(x, y, size, 0, Math.PI * 2, true);
  //   ctx.closePath();
  //   ctx.fill();
//   const alg = Object.assign({}, defaultOptions, strokeOptions);

//   const path = getStrokePath(
//     { points: coords ?? draws[id].coords },
//     false,
//     alg,
//     true
//   );

//   const pathData = new Path2D(path);
//   draws[id].path = pathData;
//   ctx.fill(pathData);
}

function onMouseMove(destX, destY, color, id) {
  draws[id].color = color;
  destY = destY - 20;
  if (draws[id].drawing) {
    const label = document.getElementById(id);
    label.style.top = destY + 10 + "px";
    label.style.left = destX + "px";
    label.style.backgroundColor = color;
    label.style.opacity = '1';
    //   draws[id].coords.push({ x: destX, y: destY });
    draws[id].path.lineTo( destX, destY );

    if (!draws[id].dirty) {
        draws[id].dirty = true;
        // requestAnimationFrame(function (id) {
            draw(id);
        // });
    }
    // draw(id);
  }
}

ipcRenderer.on(SCREEN_SHARE_DRAW_EVENTS_CHANNEL, (event, { data, display }) => {
    if (!document.getElementById(data.participantId)) {
    var nameLabel = document.createElement("span");
    nameLabel.style.opacity = 1;
    nameLabel.style.position = "absolute";
    nameLabel.id = data.participantId;
    nameLabel.style.backgroundColor = data.color;
    nameLabel.style.color = "white";
    nameLabel.style.padding = "5px";
    nameLabel.style.borderRadius = "2px";

    const txt = document.createTextNode(data.nameLabel);
    nameLabel.appendChild(txt);
    nameLayer.appendChild(nameLabel);
  }
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
      cleaningInterval[data.participantId] = setInterval(() => {
        redraw(data.participantId);
          draws[data.participantId].dirty = false;
          if (document.getElementById(data.participantId)) {
              document.getElementById(data.participantId).remove();
          }
      }, 3000);

      break;
    case "mousedown":
      if (
        cleaningInterval[data.participantId]
      ) {
        clearInterval(cleaningInterval[data.participantId]);
      }
      draws[data.participantId].drawing = true;
      draws[data.participantId].path = new Path2D();
      draws[data.participantId].path.moveTo(data.destX, data.destY);

      break;
    case "mousemove":
      onMouseMove(data.destX, data.destY, data.color, data.participantId);
      //   draws[data.participantId].positions.x = data.destX;
      //   draws[data.participantId].positions.y = data.destY - 20;

      break;

    default:
      break;
  }
});
