const express = require("express");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");

// 1. تهيئة التطبيق أولاً (لتجنب خطأ ReferenceError)
const app = express();
app.use(express.json());

// 2. إعدادات البيئة
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;

// 3. تشغيل السيرفر فوراً ليراه Railway ويتجنب إغلاقه (Crash)
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  
  // استدعاء الاتصال بقاعدة البيانات بعد أن يعمل السيرفر
  connectDB();
});

// ======================
// 🔗 إعدادات MongoDB
// ======================
const client = new MongoClient(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
});

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("bookSystem");
    
    // إنشاء كشافات (Indexes) لضمان السرعة وحذف اللينكات بعد 24 ساعة
    await db.collection("links").createIndex({ "token": 1 });
    await db.collection("links").createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 });

    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}

// ======================
// 🔐 توليد التوكن
// ======================

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ======================
// 🎯 إنشاء رابط التحميل
// ======================

app.post("/generate", async (req, res) => {
  try {
    const token = generateToken();

    await db.collection("links").insertOne({
      token,
      used: false,
      createdAt: new Date()
    });

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;

    res.json({
      message: "✅ Link created (Valid for 24 hours)",
      link: `${protocol}://${host}/download?token=${token}`
    });
  } catch (err) {
    console.error("Error creating link:", err);
    res.status(500).json({ error: "❌ Error creating link" });
  }
});

// ======================
// 📥 مسار التحميل (للاستخدام مرة واحدة فقط)
// ======================

app.get("/download", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("❌ No token provided");
    }

    // تحديث والتحقق في نفس الوقت لمنع الاستخدام المتكرر (Race Condition)
    const result = await db.collection("links").findOneAndUpdate(
      { token: token, used: false },
      { $set: { used: true, usedAt: new Date() } },
      { returnDocument: "after" }
    );

    // إذا لم يجد التوكن أو كان مستخدماً من قبل
    if (!result) {
      return res.status(403).send("❌ This link is invalid or has already been used.");
    }

    // رابط Google Drive المباشر
    const fileUrl = "https://drive.google.com/uc?export=download&id=1HJ4chKohiI57LwP7OipVDYWwnFRLhyYY";

    // منع تسريب التوكن عند التحويل لجوجل
    res.setHeader("Referrer-Policy", "no-referrer");
    return res.redirect(fileUrl);

  } catch (err) {
    console.error("Download error:", err);
    res.status(500).send("❌ Internal Server Error");
  }
});

// ======================
// 🛡️ حماية السيرفر من الانهيار
// ======================

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
