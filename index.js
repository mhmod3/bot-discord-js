import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // دعم JSON للطلبات

app.get('/api/episode', async (req, res) => {
  const { episodeId } = req.query;

  if (!episodeId) {
    return res.status(400).json({ error: 'Missing episodeId' });
  }

  try {
    // استدعاء aniwatch ديناميكيًا لتجنب مشاكل ES Modules
    const aniwatch = await import("aniwatch");
    const { getAnimeEpisodeSources } = aniwatch;

    console.log(`🔍 جلب بيانات الحلقة: ${episodeId}`);

    // استدعاء API لجلب مصادر الحلقة
    const data = await getAnimeEpisodeSources({
      episodeId: episodeId,  // يجب تمرير `episodeId` ككائن وفقًا للتوثيق
      server: "vidstreaming", // اختيار السيرفر الصحيح لضمان الحصول على المصادر
    });

    // التأكد من أن البيانات تحتوي على روابط m3u8 أو vtt
    if (!data.sources || data.sources.length === 0) {
      console.warn("⚠️ لا توجد مصادر فيديو متاحة لهذه الحلقة.");
      return res.status(404).json({ error: "No episode sources found." });
    }

    res.json(data); // إرسال البيانات إلى المستخدم
  } catch (err) {
    console.error("❌ خطأ أثناء جلب البيانات:", err);
    res.status(500).json({ error: 'Failed to fetch episode data' });
  }
});

app.listen(port, () => {
  console.log(`✅ السيرفر يعمل على: https://bot-discord-js-4xqg.onrender.com`);
});
