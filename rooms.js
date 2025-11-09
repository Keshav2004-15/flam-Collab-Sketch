const DrawingState = require("./drawing-state");

class Rooms {
  constructor() {
    this.rooms = new Map(); // roomId -> { state, users: Map(socketId -> {color}), colorPool }
  }

  get(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        state: new DrawingState(),
        users: new Map(),
        colorPool: [
          '#e74c3c','#3498db','#2ecc71','#9b59b6','#f1c40f',
          '#e67e22','#1abc9c','#e84393','#fd79a8','#6c5ce7',
        ],
      });
    }
    return this.rooms.get(roomId);
  }

  assignColor(room, socketId) {
    const color = room.colorPool[room.users.size % room.colorPool.length];
    room.users.set(socketId, { color });
    return color;
  }
}

module.exports = Rooms;
