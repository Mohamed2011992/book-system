const express = require("express");
const { MongoClient } = require("mongodb"); // لاحظ أننا نستخدم mongodb وليس mongoose
const crypto = require("crypto");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

let db;
const client = new MongoClient(MONGO_URI);

async function connectDB() {
  try {
    if (!MONGO_URI) throw new Error("MONGO_URI is missing!");
    await client.connect();
    db = client.db("bookSystem");
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ DB Connection Error:", err.message);
  }
}

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
});

// المسارات
app.post("/generate", async (req, res) => {
  try {
    const token = crypto.randomBytes(20).toString("hex");
    await db.collection("links").insertOne({ token, used: false, createdAt: new Date() });
    res.json({ link: `${req.protocol}://${req.get('host')}/download?token=${token}` });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get("/download", async (req, res) => {
  try {
    const { token } = req.query;
    const result = await db.collection("links").findOneAndUpdate(
      { token, used: false },
      { $set: { used: true } }
    );

    if (!result) return res.status(403).send("❌ الرابط مستخدم أو غير صحيح");

    const fileUrl = "https://drive.google.com/uc?export=download&id=1HJ4chKohiI57LwP7OipVDYWwnFRLhyYY";
    return res.redirect(fileUrl);
  } catch (e) { res.status(500).send("Error"); }
});
