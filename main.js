window.onload = () => {
  console.log("🟢 Initializing CollabSketch...");

  // Initialize Canvas first (sets up tools + net placeholder)
  initCanvas();

  // Initialize WebSocket connection
  initSocket();

  // Confirm everything is linked
  if (typeof window.net !== "undefined" && typeof window.canvasOps !== "undefined") {
    console.log("✅ Canvas and Socket successfully linked!");
  } else {
    console.error("❌ Linking failed — check script order in index.html");
  }

  console.log("✅ App initialized");
};
