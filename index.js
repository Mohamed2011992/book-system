const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

// تخزين بسيط للتوكنات (مؤقت)
const tokens = {};

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// توليد token + لينك تحميل
app.get("/generate", (req, res) => {
  const token = Math.random().toString(36).substring(2);

  tokens[token] = true;

  const link = `https://${req.headers.host}/download?token=${token}`;

  res.json({
    message: "Link generated",
    link: link
  });
});

// download route
app.get("/download", (req, res) => {
  const token = req.query.token;

  if (!token || !tokens[token]) {
    return res.send("Invalid or used token ❌");
  }

  // امسح التوكن بعد الاستخدام (تحميل مرة واحدة)
  delete tokens[token];

  const fileUrl = "https://drive.google.com/uc?export=download&id=1HJ4chKohiI57LwP7OipVDYWwnFRLhyYY";

  res.redirect(fileUrl);
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
