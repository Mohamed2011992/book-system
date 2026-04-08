const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

// تخزين التوكنات (مؤقت في الذاكرة)
const tokens = {};

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// توليد لينك تحميل
app.get("/generate", (req, res) => {
  const token = Math.random().toString(36).substring(2);

  // حفظ التوكن
  tokens[token] = true;

  const link = `https://${req.headers.host}/download?token=${token}`;

  res.json({
    message: "Link generated successfully",
    link: link
  });
});

// تحميل الملف
app.get("/download", (req, res) => {
  const token = req.query.token;

  // التحقق من التوكن
  if (!token || !tokens[token]) {
    return res.send("Invalid or expired token ❌");
  }

  // حذف التوكن بعد الاستخدام (تحميل مرة واحدة)
  delete tokens[token];

  // لينك Google Drive direct
  const fileUrl = "https://drive.google.com/uc?export=download&id=1HJ4chKohiI57LwP7OipVDYWwnFRLhyYY";

  // تحويل مباشر للتحميل
  res.redirect(fileUrl);
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
