import express from 'express';
import("aniwatch") // استدعاء المكتبة بشكل ديناميكي
  .then((aniwatch) => {
    const { getAnimeEpisodeSources } = aniwatch; // استخدام الوظيفة المتاحة

    const app = express();
    const port = process.env.PORT || 3000;

    app.use(express.json());

    app.get('/api/episode', async (req, res) => {
      const { episodeId } = req.query;

      if (!episodeId) {
        return res.status(400).json({ error: '❌ Missing episodeId' });
      }

      try {
        console.log(`🔍 جلب بيانات الحلقة: ${episodeId}`);

        // استدعاء `getAnimeEpisodeSources`
        const data = await getAnimeEpisodeSources(episodeId, "hd-1", "sub");

        // التحقق من وجود المصادر
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
  })
  .catch((err) => {
    console.error("❌ خطأ أثناء تحميل aniwatch:", err);
  });
