import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const users = new Map();

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("register", (username) => {
    users.set(username, socket.id);
    console.log(`✅ ${username} registered with id ${socket.id}`);
  });

  socket.on("private_message", ({ sender, receiver, message }) => {
    const receiverSocketId = users.get(receiver);
    const senderSocketId = users.get(sender);

    const msgData = { sender, receiver, message };

    if (receiverSocketId) {
      // Send to receiver
      io.to(receiverSocketId).emit("private_message", msgData);
    }

    // Always send back to sender as well
    if (senderSocketId) {
      io.to(senderSocketId).emit("private_message", msgData);
    }

    console.log(`📩 ${sender} → ${receiver}: ${message}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);
    for (const [username, id] of users.entries()) {
      if (id === socket.id) {
        users.delete(username);
        break;
      }
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 Server running at http://localhost:5000");
});
