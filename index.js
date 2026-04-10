const express = require("express");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

let db;
let client;

if (MONGO_URI) {
    client = new MongoClient(MONGO_URI);
}

// الاتصال بقاعدة البيانات
async function connectDB() {
    try {
        if (!client) {
            console.error("❌ MONGO_URI is missing!");
            return;
        }
        await client.connect();
        db = client.db("bookSystem");
        console.log("✅ MongoDB Connected");
    } catch (err) {
        console.error("❌ MongoDB Error:", err);
    }
}

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    connectDB();
});

// الصفحة الرئيسية
app.get("/", (req, res) => {
    res.send("Server is running 🚀");
});

// إنشاء لينك
app.get("/generate", async (req, res) => {
    try {
        if (!db) return res.status(500).send("Database not ready");

        const token = crypto.randomBytes(20).toString("hex");

        await db.collection("links").insertOne({
            token,
            used: false,
            createdAt: new Date()
        });

        const host = req.get("host");
        const protocol = req.headers["x-forwarded-proto"] || "http";

        res.json({
            link: `${protocol}://${host}/download?token=${token}`
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// تحميل الكتاب
app.get("/download", async (req, res) => {
    try {
        if (!db) return res.status(500).send("Database not ready");

        const { token } = req.query;

        if (!token) {
            return res.status(400).send("❌ Token missing");
        }

        const link = await db.collection("links").findOne({
            token,
            used: false
        });

        if (!link) {
            return res.status(403).send("❌ Link invalid or already used.");
        }

        const fileUrl = "https://raw.githubusercontent.com/Mohamed2011992/book-system/main/book.pdf";

        // redirect مباشر
        res.redirect(fileUrl);

        // حرق التوكن
        await db.collection("links").updateOne(
            { token },
            { $set: { used: true } }
        );

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error ❌");
    }
});
