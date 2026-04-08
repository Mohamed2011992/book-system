const express = require("express");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// ======================
// 🔗 MongoDB Connection
// ======================

const MONGO_URI = process.env.MONGO_URI;

const client = new MongoClient(MONGO_URI);

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("bookSystem");
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.log("❌ MongoDB Error:", err);
  }
}

connectDB();

// ======================
// 🔐 Generate Token
// ======================

function generateToken() {
  return crypto.randomBytes(20).toString("hex");
}

// ======================
// 🎯 Create Download Link
// ======================

app.post("/generate", async (req, res) => {
  try {
    const token = generateToken();

    await db.collection("links").insertOne({
      token,
      used: false,
      createdAt: new Date()
    });

    res.json({
      message: "✅ Link created",
      link: `https://${req.headers.host}/download?token=${token}`
    });
  } catch (err) {
    res.status(500).json({ error: "❌ Error creating link" });
  }
});

// ======================
// 📥 Download Route (One-Time)
// ======================

app.get("/download", async (req, res) => {
  try {
    const token = req.query.token;

    if (!token) {
      return res.send("❌ No token provided");
    }

    const record = await db.collection("links").findOne({ token });

    if (!record) {
      return res.send("❌ Invalid link");
    }

    if (record.used) {
      return res.send("❌ Link already used");
    }

    // قفل اللينك بعد الاستخدام
    await db.collection("links").updateOne(
      { token },
      { $set: { used: true } }
    );

    // 🔗 تحويل لينك Google Drive إلى تحميل مباشر
    const fileUrl = "https://drive.google.com/uc?export=download&id=1HJ4chKohiI57LwP7OipVDYWwnFRLhyYY";

    return res.redirect(fileUrl);

  } catch (err) {
    res.status(500).send("❌ Server error");
  }
});

// ======================
// 🚀 Start Server
// ======================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
