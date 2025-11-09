let socket;

function initSocket() {
  socket = io();
  console.log("🔌 Socket initialized");

  // Request initial drawing state when connected
  socket.on("connect", () => {
    console.log("✅ Connected to server with ID:", socket.id);
  });

  // Receive the full drawing state on join
  socket.on("init-state", (actions) => {
    console.log("📦 Received full canvas state:", actions.length, "actions");
    actions.forEach((op) => applyOp(op));
  });

  // Receive live drawing ops from others
  socket.on("op", (op) => {
    console.log("🎨 Received op from server:", op);
    applyOp(op);
  });

  // Receive clear signal
  socket.on("clear", () => {
    console.log("🧹 Received clear signal");
    window.canvasOps.applyRemoteClear();
  });

  // Receive remote cursor movement
  socket.on("cursor", ({ userId, x, y, color }) => {
    drawCursorIndicator(userId, x, y, color);
  });
}

// ===== Apply incoming drawing operation to local canvas =====
function applyOp(op) {
  switch (op.type) {
    case "stroke:start":
      window.canvasOps.applyRemoteStrokeStart(op);
      break;
    case "stroke:append":
      window.canvasOps.applyRemoteStrokeAppend(op);
      break;
    case "stroke:end":
      window.canvasOps.applyRemoteStrokeEnd(op);
      break;
    case "undo":
      window.canvasOps.applyRemoteUndo();
      break;
    case "redo":
      window.canvasOps.applyRemoteRedo();
      break;
    case "clear":
      window.canvasOps.applyRemoteClear();
      break;
    default:
      console.log("⚠️ Unknown op type:", op.type);
  }
}

// ===== Draw small colored cursor circles for other users =====
const cursorMap = {};
function drawCursorIndicator(userId, x, y, color = "#00c2ff") {
  let el = cursorMap[userId];
  if (!el) {
    el = document.createElement("div");
    el.className = "remote-cursor";
    el.style.position = "absolute";
    el.style.width = "10px";
    el.style.height = "10px";
    el.style.borderRadius = "50%";
    el.style.pointerEvents = "none";
    el.style.zIndex = "100";
    el.style.background = color;
    document.body.appendChild(el);
    cursorMap[userId] = el;
  }

  const rect = document.getElementById("drawCanvas").getBoundingClientRect();
  el.style.left = rect.left + x + "px";
  el.style.top = rect.top + y + "px";

  // Remove cursor after inactivity
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.remove();
    delete cursorMap[userId];
  }, 1000);
}

// ===== Outgoing events (used by canvas.js) =====
window.net = {
  onStrokeStart: (data) => {
    console.log("✏️ Sending stroke start:", data);
    socket.emit("op", data);
  },
  onStrokeAppend: (data) => {
    console.log("➡️ Sending stroke append:", data);
    socket.emit("op", data);
  },
  onStrokeEnd: (data) => {
    console.log("✅ Sending stroke end:", data);
    socket.emit("op", data);
  },
  onUndo: () => {
    console.log("↩️ Sending undo");
    socket.emit("op", { type: "undo" });
  },
  onRedo: () => {
    console.log("↪️ Sending redo");
    socket.emit("op", { type: "redo" });
  },
  onClear: () => {
    console.log("🧹 Sending clear");
    socket.emit("clear");
  },
  onCursor: (data) => {
    socket.emit("cursor", data);
  },
};
