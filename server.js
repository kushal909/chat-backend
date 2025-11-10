import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
const app = express();
app.use(express.json());
app.use(cors());

// -------------------- MongoDB --------------------
const mongoURI = "mongodb+srv://kushalukumar909:JqUZTHivXaqyKcht@cluster1.zryphag.mongodb.net/chatapp";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// -------------------- Mongoose Schemas --------------------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  socketId: String,
});
const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

// -------------------- HTTP + Socket.IO --------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://65.2.81.219:5000", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);
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
  socket.on("private_message", async ({ sender, receiver, message }) => {
    // Save message to DB
    try {
      const msg = new Message({ sender, receiver, message });
      await msg.save();
    } catch (err) {
      console.error("❌ Error saving message:", err);
    }
    // Emit to receiver and sender
    const receiverData = await User.findOne({ username: receiver });
    if (receiverData && receiverData.socketId) {
      console.log("sender, receiver, message rev",sender, receiver, message)
      io.to(receiverData.socketId).emit("private_message", { sender, receiver, message });
    }
    const senderData = await User.findOne({ username: sender });
    if (senderData && senderData.socketId) {
            console.log("sender, receiver, message send",sender, receiver, message)
      io.to(senderData.socketId).emit("private_message", { sender, receiver, message });
    }
    console.log(`📩 ${sender} → ${receiver}: ${message}`);
  });
  socket.on("disconnect", async () => {
    console.log("🔴 Disconnected:", socket.id);
    await User.findOneAndUpdate({ socketId: socket.id }, { socketId: null });
  });
});

// -------------------- Start server --------------------
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
