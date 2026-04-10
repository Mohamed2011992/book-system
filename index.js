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

        // ✅ حط اللينك هنا صح
        const fileUrl = "https://www.dropbox.com/scl/fi/r9e5d8u8rlc5kgi5sosh9/1.pdf?rlkey=l9oqcqhfpcerv2ymikizkzi7m&raw=1";

        res.setHeader("Referrer-Policy", "no-referrer");
        return res.redirect(fileUrl);

    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error ❌");
    }
});
