

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";

const app = express();
app.use(express.json());
app.use(cors());

// -------------------- MongoDB --------------------
const mongoURI = "mongodb+srv://kushalukumar909:JqUZTHivXaqyKcht@cluster1.zryphag.mongodb.net/chatdb";
//const mongoURI ="mongodb://localhost:27017/chatdb"
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// -------------------- Mongoose Schemas --------------------
const userSchema = new mongoose.Schema({
  username: { type: String, 
  //  required: true, unique: true
   },
  socketId: String,
});

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  participants: [{ type: String }]
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);
const Room = mongoose.model("Room", roomSchema);

// -------------------- HTTP + Socket.IO --------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// -------------------- Socket.IO Handlers --------------------
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Register username
  socket.on("register", async (username) => {
    try {
      await User.findOneAndUpdate(
        { username },
        { socketId: socket.id },
        { upsert: true }
      );
      console.log(`✅ ${username} registered with id ${socket.id}`);
    } catch (err) {
      console.error(err);
    }
  });

  // Private message
  socket.on("private_message", async ({ sender, receiver, message }) => {
    try {
      // Save to DB
      const msg = new Message({ sender, receiver, message });
      await msg.save();

      // Emit to receiver
      const receiverData = await User.findOne({ username: receiver });
      // if (receiverData && receiverData.socketId) {
        io.to(receiverData.socketId).emit("private_message", { sender, receiver, message });
      //}

      // Emit back to sender
      const senderData = await User.findOne({ username: sender });
      // if (senderData && senderData.socketId) {
        io.to(senderData.socketId).emit("private_message", { sender, receiver, message });
      //}

      console.log(`📩 ${sender} → ${receiver}: ${message}`);
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  });

  // Disconnect
  socket.on("disconnect", async () => {
    console.log("🔴 Disconnected:", socket.id);
    await User.findOneAndUpdate({ socketId: socket.id }, { socketId: null });
  });
});

// -------------------- Room CRUD Routes --------------------

// Create room
app.post("/rooms", async (req, res) => {
  try {
    const { name, participants } = req.body;
    const room = new Room({ name, participants });
    await room.save();

    // Emit to all users
    io.emit("new_room", room);

    res.status(201).json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

// Get all rooms
app.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// Update room
app.put("/rooms/:id", async (req, res) => {
  try {
    const { participants } = req.body;
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { participants },
      { new: true }
    );
    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update room" });
  }
});

// Delete room
app.delete("/rooms/:id", async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete room" });
  }
});

// -------------------- Start server --------------------
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
