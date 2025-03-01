import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // دعم JSON للطلبات

app.get('/api/episode', async (req, res) => {
  const { episodeId } = req.query;

  if (!episodeId) {
    return res.status(400).json({ error: '❌ Missing episodeId' });
  }

  try {
    // استدعاء aniwatch ديناميكيًا لمنع مشاكل ES Modules
    const aniwatch = await import("aniwatch");
    const { getAnimeEpisodeSources } = aniwatch;

    console.log(`🔍 جلب بيانات الحلقة: ${episodeId}`);

    // جلب المصادر مع تحديد `server: "hd-1"`
    const data = await getAnimeEpisodeSources(episodeId, "hd-1", "sub");

    // التحقق من البيانات وإرجاع المصادر
    if (!data || !data.sources || data.sources.length === 0) {
      console.warn("⚠️ لا توجد مصادر فيديو متاحة لهذه الحلقة.");
      return res.status(404).json({ error: "No episode sources found." });
    }

    res.json(data); // إرسال البيانات إلى المستخدم
  } catch (err) {
    console.error("❌ خطأ أثناء جلب البيانات:", err);
    res.status(500).json({ error: '⚠️ Failed to fetch episode data', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅ السيرفر يعمل على: https://bot-discord-js-4xqg.onrender.com`);
});
