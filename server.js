// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
const app = express();
app.use(cors());
app.use(express.json());
const mongoURI = "mongodb+srv://kushalukumar909:JqUZTHivXaqyKcht@cluster1.zryphag.mongodb.net/crud";
// MongoDB connection
//const mongoURI ="mongodb://localhost:27017/chatdb"
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

// User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  age: Number
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

// Routes

// CREATE
app.post("/api/users", async (req, res) => {
  try {
    const user = new User(req.body);

    console.log("rw",req.body)
    console.log("us",user)
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (err) {
    console.log("err",err)
    res.status(400).json({ message: err.message });
  }
});

// READ ALL
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE
app.put("/api/users/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
app.delete("/api/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
