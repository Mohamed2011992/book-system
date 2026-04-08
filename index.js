const https = require("https");

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

        const fileUrl = "https://drive.google.com/uc?export=download&id=1HJ4chKohiI57LwP7OipVDYWwnFRLhyYY";

        // 👇 هنا بقى السحر
        https.get(fileUrl, (fileRes) => {
            res.setHeader("Content-Disposition", "attachment; filename=book.pdf");
            fileRes.pipe(res);
        });

    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error ❌");
    }
});
