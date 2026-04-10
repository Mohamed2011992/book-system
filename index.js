const express = require("express");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");
const https = require("https");

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

// تحميل الكتاب (مرة واحدة فقط + تحميل إجباري)
app.get("/download", async (req, res) => {
    try {
        if (!db) return res.status(500).send("Database not ready");

        const { token } = req.query;

        if (!token) {
            return res.status(400).send("❌ Token missing");
        }

        const result = await db.collection("links").findOneAndUpdate(
            { token: token, used: false },
            { $set: { used: true } },
            { returnDocument: "after" }
        );

        if (!result.value) {
            return res.status(403).send("❌ Link invalid or already used.");
        }

        // 🔥 لينك Dropbox
        const fileUrl = "https://www.dropbox.com/scl/fi/r9e5d8u8rlc5kgi5sosh9/1.pdf?rlkey=l9oqcqhfpcerv2ymikizkzi7m&raw=1";

        // 🔥 إجبار التحميل الحقيقي
        https.get(fileUrl, (fileRes) => {
            res.setHeader("Content-Disposition", "attachment; filename=book.pdf");
            res.setHeader("Content-Type", "application/pdf");

            fileRes.pipe(res);
        }).on("error", (err) => {
            console.error("Download error:", err);
            res.status(500).send("Error downloading file ❌");
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error ❌");
    }
});
