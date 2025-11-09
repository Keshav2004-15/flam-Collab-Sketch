// ===== Canvas setup =====
let canvas, ctx;
let drawing = false;
let currentTool = "pencil";
let color = "#000000";
let lineWidth = 3;
let startX, startY;
let lastX, lastY;

// Zoom & pan
let scale = 1;
let offsetX = 0;
let offsetY = 0;
const scaleStep = 0.1;
const maxScale = 3;
const minScale = 0.5;

// Drawing history
let drawingActions = [];
let undoneActions = [];
let currentAction = null;

// Panning
let isPanning = false;
let lastPanX, lastPanY;

// DOM
let zoomInfo;

// Networking hooks (wired by websocket.js)
let net = {
  onStrokeStart: () => {},
  onStrokeAppend: () => {},
  onStrokeEnd: () => {},
  onUndo: () => {},
  onRedo: () => {},
  onClear: () => {},
  onCursor: () => {},
};

function initCanvas() {
  canvas = document.getElementById("drawCanvas");
  ctx = canvas.getContext("2d");
  zoomInfo = document.querySelector(".zoom-info");
  resizeCanvas();

  // --- Drawing listeners ---
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseleave", stopDrawing);
  canvas.addEventListener("wheel", handleZoom);

  // --- Panning ---
  canvas.addEventListener("mousedown", startPanning);
  canvas.addEventListener("mousemove", panCanvas);
  canvas.addEventListener("mouseup", stopPanning);
  canvas.addEventListener("mouseleave", stopPanning);

  // --- Broadcast cursor position ---
  canvas.addEventListener("mousemove", (evt) => {
    const p = getMousePos(evt);
    net.onCursor({ type: "cursor", x: p.x, y: p.y });
  });

  // --- Tool selection ---
  document.querySelectorAll(".tool").forEach((tool) => {
    tool.addEventListener("click", function () {
      if (this.dataset.tool) setActiveTool(this.dataset.tool);
    });
  });

  // --- Color and brush size ---
  document.getElementById("colorPicker").addEventListener("change", (e) => {
    color = e.target.value;
  });

  document.getElementById("strokeWidth").addEventListener("input", (e) => {
    lineWidth = parseInt(e.target.value);
    const lbl = document.getElementById("brushValue");
    if (lbl) lbl.textContent = `${lineWidth}px`;
  });

  // --- Zoom buttons ---
  document.getElementById("zoomInBtn").onclick = () => zoomCanvas(true);
  document.getElementById("zoomOutBtn").onclick = () => zoomCanvas(false);
  document.getElementById("resetZoomBtn").onclick = resetZoom;

  // --- Undo/Redo/Clear ---
  document.getElementById("undoBtn").onclick = undo;
  document.getElementById("redoBtn").onclick = redo;
  document.getElementById("clearBtn").onclick = clearCanvas;

  // Resize handling
  window.addEventListener("resize", resizeCanvas);

  // Initial draw
  redrawAll();
  updateZoomInfo();
}

// ===== Helper functions =====

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  redrawAll();
}

function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left - offsetX) / scale,
    y: (evt.clientY - rect.top - offsetY) / scale,
  };
}

// ===== Drawing logic =====

function startDrawing(e) {
  if (e.button !== 0 || isPanning) return;

  drawing = true;
  const pos = getMousePos(e);
  startX = lastX = pos.x;
  startY = lastY = pos.y;

  currentAction = {
    tool: currentTool,
    color,
    lineWidth,
    points: [[pos.x, pos.y]],
    isShape: ["line", "arrow"].includes(currentTool),
    strokeId: crypto.randomUUID(),
  };

  // Notify others
  net.onStrokeStart({
    type: "stroke:start",
    strokeId: currentAction.strokeId,
    tool: currentAction.tool,
    color: currentAction.color,
    lineWidth: currentAction.lineWidth,
    point: [pos.x, pos.y],
  });

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.restore();
}

function draw(e) {
  const pos = getMousePos(e);
  net.onCursor({ type: "cursor", x: pos.x, y: pos.y });
  if (!drawing) return;

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  switch (currentTool) {
    case "pencil":
    case "pen":
    case "brush":
    case "eraser":
      currentAction.points.push([pos.x, pos.y]);
      net.onStrokeAppend({
        type: "stroke:append",
        strokeId: currentAction.strokeId,
        point: [pos.x, pos.y],
      });

      ctx.strokeStyle = currentTool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = getToolLineWidth();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = currentTool === "brush" ? 0.7 : 1;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      break;

    case "line":
    case "arrow":
      redrawAll();
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      if (currentTool === "arrow") drawArrowHead(startX, startY, pos.x, pos.y);
      break;
  }

  ctx.restore();
  lastX = pos.x;
  lastY = pos.y;
}

function stopDrawing() {
  if (!drawing) return;
  drawing = false;

  if (currentAction && currentAction.points.length > 1) {
    drawingActions.push(currentAction);
    undoneActions = [];
  }

  // Notify network
  net.onStrokeEnd({ type: "stroke:end", strokeId: currentAction.strokeId });
  currentAction = null;
}

function getToolLineWidth() {
  switch (currentTool) {
    case "pen":
      return lineWidth * 1.2;
    case "brush":
      return lineWidth * 3;
    case "eraser":
      return lineWidth * 4;
    default:
      return lineWidth;
  }
}

function drawArrowHead(fromX, fromY, toX, toY) {
  const headlen = 15;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

// ===== Redrawing =====

function redrawAll() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  drawGrid();
  redrawDrawingActions();
  ctx.restore();
}

function redrawDrawingActions() {
  drawingActions.forEach((action) => {
    ctx.save();
    ctx.strokeStyle = action.tool === "eraser" ? "#ffffff" : action.color;
    ctx.lineWidth = action.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (action.tool === "brush") ctx.globalAlpha = 0.7;
    if (action.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(action.points[0][0], action.points[0][1]);
      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i][0], action.points[i][1]);
      }
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawGrid() {
  const gridSize = 20;
  const width = canvas.width / scale;
  const height = canvas.height / scale;
  ctx.strokeStyle = "#f0f0f0";
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

// ===== Zoom / Pan =====

function handleZoom(event) {
  event.preventDefault();
  const mouse = getMousePos(event);
  const zoomIn = event.deltaY < 0;
  zoomCanvas(zoomIn, mouse);
}

function zoomCanvas(zoomIn, mousePos = null) {
  if (!mousePos) {
    mousePos = {
      x: canvas.width / (2 * scale) - offsetX / scale,
      y: canvas.height / (2 * scale) - offsetY / scale,
    };
  }
  const oldScale = scale;
  scale = zoomIn ? scale + scaleStep : scale - scaleStep;
  scale = Math.min(Math.max(scale, minScale), maxScale);
  offsetX -= mousePos.x * (scale - oldScale);
  offsetY -= mousePos.y * (scale - oldScale);
  updateZoomInfo();
  redrawAll();
}

function resetZoom() {
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  updateZoomInfo();
  redrawAll();
}

function updateZoomInfo() {
  if (zoomInfo) zoomInfo.textContent = `Zoom: ${Math.round(scale * 100)}%`;
}

// ===== Panning =====

function startPanning(e) {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    isPanning = true;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    canvas.style.cursor = "grabbing";
    e.preventDefault();
  }
}

function panCanvas(e) {
  if (!isPanning) return;
  const dx = e.clientX - lastPanX;
  const dy = e.clientY - lastPanY;
  offsetX += dx;
  offsetY += dy;
  lastPanX = e.clientX;
  lastPanY = e.clientY;
  redrawAll();
  e.preventDefault();
}

function stopPanning() {
  isPanning = false;
  canvas.style.cursor = "crosshair";
}

function setActiveTool(tool) {
  currentTool = tool;
  document.querySelectorAll(".tool").forEach((t) => t.classList.remove("active"));
  const btn = document.querySelector(`[data-tool="${tool}"]`);
  if (btn) btn.classList.add("active");
}

// ===== Undo/Redo/Clear (emit to network) =====

function undo() {
  if (drawingActions.length > 0) {
    undoneActions.push(drawingActions.pop());
    redrawAll();
    net.onUndo({ type: "undo" });
  }
}

function redo() {
  if (undoneActions.length > 0) {
    drawingActions.push(undoneActions.pop());
    redrawAll();
    net.onRedo({ type: "redo" });
  }
}

function clearCanvas() {
  if (confirm("Are you sure you want to clear the canvas?")) {
    drawingActions = [];
    undoneActions = [];
    redrawAll();
    net.onClear({ type: "clear" });
  }
}

// ===== Remote operations (called from websocket.js) =====

function applyRemoteStrokeStart(op) {
  const action = {
    strokeId: op.strokeId,
    tool: op.tool,
    color: op.color,
    lineWidth: op.lineWidth,
    points: [op.point],
  };
  drawingActions.push(action);
}

function applyRemoteStrokeAppend(op) {
  const action = drawingActions.find((a) => a.strokeId === op.strokeId);
  if (!action) return;
  action.points.push(op.point);

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  ctx.strokeStyle = action.tool === "eraser" ? "#ffffff" : action.color;
  ctx.lineWidth = action.lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (action.tool === "brush") ctx.globalAlpha = 0.7;
  const n = action.points.length;
  if (n >= 2) {
    ctx.beginPath();
    ctx.moveTo(action.points[n - 2][0], action.points[n - 2][1]);
    ctx.lineTo(action.points[n - 1][0], action.points[n - 1][1]);
    ctx.stroke();
  }
  ctx.restore();
}

function applyRemoteStrokeEnd() {
  redrawAll();
}

function applyRemoteUndo() {
  if (drawingActions.length) {
    undoneActions.push(drawingActions.pop());
    redrawAll();
  }
}

function applyRemoteRedo() {
  if (undoneActions.length) {
    drawingActions.push(undoneActions.pop());
    redrawAll();
  }
}

function applyRemoteClear() {
  drawingActions = [];
  undoneActions = [];
  redrawAll();
}

window.canvasOps = {
  applyRemoteStrokeStart,
  applyRemoteStrokeAppend,
  applyRemoteStrokeEnd,
  applyRemoteUndo,
  applyRemoteRedo,
  applyRemoteClear,
  redrawAll,
  drawingActions,
  undoneActions,
};
