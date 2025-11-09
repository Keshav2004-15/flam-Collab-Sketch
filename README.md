🎨 CollabSketch – Real-Time Collaborative Drawing Canvas

CollabSketch is a multi-user, real-time drawing web application where multiple people can draw, erase, and interact on the same canvas simultaneously — powered by Node.js, Express, and Socket.io.

🚀 Project Overview

This project demonstrates how real-time web communication can synchronize a shared state (canvas) across multiple connected users using WebSockets.

Each user can draw freely, and everyone sees updates live — including strokes, color changes, and cursor movements. The goal is to test knowledge of HTML5 Canvas, real-time event streaming, and synchronization algorithms.

🧩 Features
✏️ Drawing Features

Tools: Pencil, Brush, and Eraser

Adjustable stroke width and color

Real-time zoom and pan

Undo / Redo functionality

Clear canvas option

⚡ Real-Time Collaboration

Multiple users draw simultaneously

All strokes sync live across clients

Cursor indicators show other users' positions

New users instantly receive the current shared canvas state

👥 User Management

Each connected user gets a unique session ID

Cursor indicators for users (colored dots)

Optional real-time "Artists Online" counter

🛠️ Tech Stack
Layer	Technology
Frontend	HTML5, CSS3, Vanilla JavaScript
Canvas Rendering	HTML5 Canvas API
Backend	Node.js + Express.js
Realtime Communication	Socket.io (WebSockets)
Development Tools	Nodemon, VS Code
📁 Project Structure
collaborative-canvas/
├── client/
│   ├── index.html          # Frontend UI
│   ├── style.css           # Styling and layout
│   ├── canvas.js           # Canvas drawing and rendering logic
│   ├── websocket.js        # WebSocket real-time communication
│   └── main.js             # Initialization and tool linking
├── server/
│   └── server.js           # Express + Socket.io backend
├── package.json            # Node dependencies
└── README.md               # Project documentation

⚙️ Installation and Setup
1️⃣ Clone the repository
git clone https://github.com/yourusername/collaborative-canvas.git
cd collaborative-canvas

2️⃣ Install dependencies
npm install

3️⃣ Start the server
npm start

4️⃣ Open in your browser
https://flam-48fce6.netlify.app/


Open two or more browser tabs (or browsers like Chrome + Edge) to test real-time collaboration.

🧠 WebSocket Message Flow
Event	Direction	Description
op	Client → Server → All	Drawing actions (stroke:start, stroke:append, stroke:end, undo, redo)
clear	Client → Server → All	Clear the canvas
cursor	Client → Server → All	Broadcast user cursor position
init-state	Server → Client	Send full drawing state to newly joined user
🔁 Undo/Redo Mechanism

Each stroke is stored in a drawingActions[] stack.

When Undo is triggered, the last stroke is removed and pushed into undoneActions[].

When Redo is triggered, it restores the last undone stroke.

These actions are synchronized globally using WebSocket broadcasts.

⚡ Real-Time Sync Logic

When a user starts drawing:

The client emits stroke:start with color, tool, and coordinates.

Each movement emits stroke:append.

When mouse is released, stroke:end is emitted.

The server broadcasts all these events to every connected client.

Each client applies them locally to render the same canvas view.

🧠 Technical Highlights

Uses event-driven synchronization (not pixel-by-pixel transfer).

Reduces network load by sending small stroke data packets.

Supports real-time cursor rendering using lightweight DOM elements.

Handles undo/redo and clear globally for all connected users.

🧩 Known Limitations

Undo/Redo is global — affects all users.

Cursor colors are not unique by default.

Shape tools (circle, rectangle, etc.) are planned but not yet active.

No user authentication (anonymous sessions only).

🧠 How to Test

Run the server (npm start).

Open http://localhost:3000
 in two browsers or tabs.

Start drawing in one — it should instantly appear in the other.

Use Undo, Redo, or Clear — all clients update together.

🖥️ Example Console Logs
In Browser 1
✏️ Sending stroke start: {...}
➡️ Sending stroke append: {...}
✅ Sending stroke end: {...}

In Browser 2
🎨 Received op from server: { type: "stroke:start", ... }
🎨 Received op from server: { type: "stroke:append", ... }
🎨 Received op from server: { type: "stroke:end", ... }

🧩 Development Scripts
Command	Description
npm start	Start production server
npm run dev	Start with auto-reload (Nodemon)
