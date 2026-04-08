const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

// الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => console.log("MongoDB Error ❌", err));

// Schema
const tokenSchema = new mongoose.Schema({
  token: String,
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Token = mongoose.model("Token", tokenSchema);

// Routes

// Home
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// Generate token
app.get("/generate", async (req, res) => {
  const token = Math.random().toString(36).substring(2);

  await Token.create({ token });

  const link = `https://${req.headers.host}/download?token=${token}`;

  res.json({
    message: "Link generated successfully",
    link: link
  });
});

// Download route
app.get("/download", async (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.send("Token missing ❌");
  }

  const record = await Token.findOne({ token });

  if (!record) {
    return res.send("Invalid token ❌");
  }

  if (record.used) {
    return res.send("Token already used ❌");
  }

  // Mark as used
  record.used = true;
  await record.save();

  // Google Drive direct link
  const fileUrl = "https://drive.google.com/uc?export=download&id=1HJ4chKohiI57LwP7OipVDYWwnFRLhyYY";

  res.redirect(fileUrl);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
