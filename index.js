const express = require("express");
const aniwatch = require("aniwatch");

const app = express();
const port = 3000;

// خدمة الملفات الثابتة
app.use(express.static("public"));

// API لجلب المصادر
app.get("/get-episode", async (req, res) => {
    const episodeId = req.query.episodeId;

    if (!episodeId) {
        return res.status(400).json({ error: "يجب إدخال ID الحلقة" });
    }

    try {
        const data = await aniwatch.getAnimeEpisodeSources(episodeId, "hd-1", "sub");
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "فشل في جلب البيانات", details: err.message });
    }
});

// بدء تشغيل الخادم
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
