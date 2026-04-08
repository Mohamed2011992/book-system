const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

// الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected ✅"))
.catch((err) => console.log("MongoDB Error ❌", err));

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

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// توليد لينك تحميل
app.get("/generate", async (req, res) => {
  try {
    const token = Math.random().toString(36).substring(2);

    await Token.create({ token });

    const link = `https://${req.headers.host}/download?token=${token}`;

    res.json({
      message: "Link generated successfully",
      link: link
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Error generating link");
  }
});

// تحميل الملف
app.get("/download", async (req, res) => {
  try {
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

    // تحديث الحالة
    record.used = true;
    await record.save();

    // لينك التحميل
    const fileUrl = "https://drive.google.com/uc?export=download&id=1HJ4chKohiI57LwP7OipVDYWwnFRLhyYY";

    return res.redirect(fileUrl);

  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
