import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";

const app = express();
app.use(express.json());
app.use(cors());

// -------------------- MongoDB Connection --------------------
const mongoURI = "mongodb+srv://kushalukumar909:JqUZTHivXaqyKcht@cluster1.zryphag.mongodb.net/chatdb";

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err.message));

// -------------------- Mongoose Schemas --------------------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  socketId: { type: String, default: null },
});

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  participants: [{ type: String }],
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);
const Room = mongoose.model("Room", roomSchema);

// -------------------- HTTP + Socket.IO Server --------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow frontend from anywhere
    methods: ["GET", "POST"],
  },
});

// -------------------- SOCKET HANDLERS --------------------
io.on("connection", (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  // Register username and socket
  socket.on("register", async (username) => {
    try {
      await User.findOneAndUpdate(
        { username },
        { socketId: socket.id },
        { upsert: true, new: true }
      );
      console.log(`✅ ${username} registered with socket ID: ${socket.id}`);
    } catch (err) {
      console.error("❌ Error registering user:", err.message);
    }
  });

  // Private message handler
  socket.on("private_message", async ({ sender, receiver, message }) => {
    try {
      // Save message to DB
      const msg = new Message({ sender, receiver, message });
      await msg.save();

      // Find both users
      const receiverData = await User.findOne({ username: receiver });
      const senderData = await User.findOne({ username: sender });

      // Send message to receiver if online
      if (receiverData?.socketId) {
        io.to(receiverData.socketId).emit("private_message", { sender, receiver, message });
      } else {
        console.warn(`⚠️ Receiver "${receiver}" is offline. Message saved.`);
      }

      // Send confirmation back to sender
      if (senderData?.socketId) {
        io.to(senderData.socketId).emit("private_message", { sender, receiver, message });
      }

      console.log(`📩 ${sender} → ${receiver}: ${message}`);
    } catch (err) {
      console.error("❌ Error sending private message:", err.message);
    }
  });

  // Handle disconnection
  socket.on("disconnect", async () => {
    try {
      await User.findOneAndUpdate({ socketId: socket.id }, { socketId: null });
      console.log(`🔴 User disconnected: ${socket.id}`);
    } catch (err) {
      console.error("❌ Error during disconnect:", err.message);
    }
  });
});

// -------------------- ROOM ROUTES (CRUD) --------------------

// Create a new room
app.post("/rooms", async (req, res) => {
  try {
    const { name, participants } = req.body;
    const room = new Room({ name, participants });
    await room.save();

    io.emit("new_room", room);
    res.status(201).json(room);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to create room" });
  }
});

// Get all rooms
app.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// Update room participants
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
    console.error(err.message);
    res.status(500).json({ error: "Failed to update room" });
  }
});

// Delete a room
app.delete("/rooms/:id", async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to delete room" });
  }
});

// -------------------- START SERVER --------------------
const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
