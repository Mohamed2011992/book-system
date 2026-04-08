const express = require("express");
const app = express();

let links = {};

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send(`
    <h2>📘 نظام بيع الكتاب</h2>
    <button onclick="generate()">Generate Link</button>
    <p id="link"></p>

    <script>
      function generate() {
        fetch('/generate')
          .then(res => res.json())
          .then(data => {
            document.getElementById('link').innerText = data.link;
          });
      }
    </script>
  `);
});

// توليد لينك
app.get("/generate", (req, res) => {
  const id = Math.random().toString(36).substring(2, 10);

  links[id] = {
    used: false,
    expires: Date.now() + 10 * 60 * 1000
  };

  const link = req.protocol + "://" + req.get("host") + "/download/" + id;

  res.json({ link });
});

// التحميل
app.get("/download/:id", (req, res) => {
  const data = links[req.params.id];

  if (!data) return res.send("❌ لينك غير صالح");
  if (data.used) return res.send("❌ تم استخدام اللينك");
  if (Date.now() > data.expires)
    return res.send("⏳ انتهت الصلاحية");

  data.used = true;

  res.send("✅ تمام! هنا المفروض يتحمل الكتاب (هنظبطها كمان خطوة)");
});

app.listen(3000, () => console.log("Server running"));