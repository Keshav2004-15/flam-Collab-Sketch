const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// Serve static client folder
app.use(express.static(path.join(__dirname, "..", "client")));

const PORT = process.env.PORT || 3000;

// Store drawing state per room
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Default room
  let roomId = "default";
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { actions: [], users: new Set() });
  }

  const room = rooms.get(roomId);
  room.users.add(socket.id);
  socket.join(roomId);
  console.log(`👥 ${room.users.size} user(s) in room.`);

  // Send existing state to new user
  socket.emit("init-state", room.actions);

  // Receive a drawing op
  socket.on("op", (op) => {
    const r = rooms.get(roomId);
    if (!r) return;

    r.actions.push(op); // save operation
    // broadcast to everyone except sender
    socket.to(roomId).emit("op", op);
  });

  // Cursor updates
  socket.on("cursor", (data) => {
    socket.to(roomId).emit("cursor", { userId: socket.id, ...data });
  });

  // Clear canvas
  socket.on("clear", () => {
    const r = rooms.get(roomId);
    if (!r) return;
    r.actions = [];
    io.to(roomId).emit("clear");
  });

  socket.on("disconnect", () => {
    const r = rooms.get(roomId);
    if (r) {
      r.users.delete(socket.id);
      if (r.users.size === 0) rooms.delete(roomId);
    }
    console.log("🔴 Disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
