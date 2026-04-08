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

async function connectDB() {
    try {
        if (!client) {
            console.error("❌ MONGO_URI is missing in Railway variables!");
            return;
        }
        await client.connect();
        db = client.db("bookSystem");
        console.log("✅ MongoDB Connected Successfully");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err);
    }
}

// تشغيل السيرفر فوراً لتجاوز الـ Health Check
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    connectDB();
});

// إنشاء الرابط
app.post("/generate", async (req, res) => {
    try {
        if (!db) return res.status(500).send("Database not ready");
        const token = crypto.randomBytes(20).toString("hex");
        await db.collection("links").insertOne({
            token,
            used: false,
            createdAt: new Date()
        });
        const host = req.get('host');
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        res.json({ link: `${protocol}://${host}/download?token=${token}` });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// التحميل
app.get("/download", async (req, res) => {
    try {
        if (!db) return res.status(500).send("Database not ready");
        const { token } = req.query;
        
        // البحث والتحديث في خطوة واحدة
        const result = await db.collection("links").findOneAndUpdate(
            { token: token, used: false },
            { $set: { used: true } },
            { returnDocument: "after" }
        );

        if (!result) {
            return res.status(403).send("❌ Link invalid or already used.");
        }

        const fileUrl = "https://drive.google.com/uc?export=download&id=1HJ4chKohiI57LwP7OipVDYWwnFRLhyYY";
        res.setHeader("Referrer-Policy", "no-referrer");
        return res.redirect(fileUrl);
    } catch (err) {
        res.status(500).send("Internal Error");
    }
});
