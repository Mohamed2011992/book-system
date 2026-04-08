// تشغيل السيرفر فوراً حتى لا يظن Railway أن التطبيق تعطل
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  
  // الآن ابدأ الاتصال بقاعدة البيانات في الخلفية
  connectDB();
});

async function connectDB() {
  try {
    await client.connect();
    db = client.db("bookSystem");
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    // لا تغلق السيرفر هنا، فقط اطبع الخطأ
  }
}
const express = require("express");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// ======================
// 🔗 إعدادات MongoDB و Railway
// ======================

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;

// إعداد العميل مع خيارات الاستقرار
const client = new MongoClient(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // المحاولة لمدة 5 ثواني قبل الفشل
  socketTimeoutMS: 45000,
});

let db;

async function startServer() {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await client.connect();
    db = client.db("bookSystem");
    
    // إنشاء كشافات (Indexes) لضمان السرعة ومنع التكرار
    await db.collection("links").createIndex({ "token": 1 });
    // حذف اللينكات تلقائياً بعد 24 ساعة لتوفير المساحة
    await db.collection("links").createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 });

    console.log("✅ MongoDB Connected Successfully");

    // تشغيل السيرفر فقط بعد نجاح الاتصال بقاعدة البيانات
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err);
    // إعادة التشغيل التلقائي من قبل Railway في حال الفشل
    process.exit(1); 
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
// 📥 مسار التحميل (Atomic One-Time Use)
// ======================

app.get("/download", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("❌ No token provided");
    }

    // استخدام findOneAndUpdate لضمان أن العملية تتم مرة واحدة فقط (Atomic)
    // هذا يمنع الـ Crash والـ Race Condition
    const result = await db.collection("links").findOneAndUpdate(
      { token: token, used: false },
      { $set: { used: true, usedAt: new Date() } },
      { returnDocument: "after" }
    );

    // إذا لم يجد التوكن أو كان مستخدماً مسبقاً
    if (!result) {
      return res.status(403).send("❌ This link is invalid or has already been used.");
    }

    // رابط Google Drive المباشر
    const fileUrl = "https://drive.google.com/uc?export=download&id=1HJ4chKohiI57LwP7OipVDYWwnFRLhyYY";

    // منع تسريب التوكن في الـ Headers عند التحويل لـ Google
    res.setHeader("Referrer-Policy", "no-referrer");
    return res.redirect(fileUrl);

  } catch (err) {
    console.error("Download error:", err);
    res.status(500).send("❌ Internal Server Error");
  }
});

// ======================
// 🛡️ حماية السيرفر من الانهيار المفاجئ
// ======================

// التعامل مع أي أخطاء غير متوقعة في الوعود (Promises) دون توقف السيرفر
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// بدء التشغيل
startServer();
