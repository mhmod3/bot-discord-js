import express from 'express';

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

    // تحميل المكتبة `aniwatch` ديناميكيًا
    const aniwatch = await import("aniwatch");
    const { getAnimeEpisodeSources } = aniwatch;

    // جلب بيانات الحلقة
    const data = await getAnimeEpisodeSources(episodeId, "hd-1", "sub");

    if (!data || !data.sources || data.sources.length === 0) {
      console.warn("⚠️ لا توجد مصادر فيديو متاحة لهذه الحلقة.");
      return res.status(404).json({ error: "No episode sources found." });
    }

    // فلترة المصادر للحصول على روابط `.m3u8`
    const m3u8Sources = data.sources.filter(src => src.isM3U8);
    const vttSubtitles = data.subtitles || [];

    res.json({
      episodeId,
      m3u8Sources,
      vttSubtitles,
      anilistID: data.anilistID,
      malID: data.malID
    });

  } catch (err) {
    console.error("❌ خطأ أثناء جلب البيانات:", err);
    res.status(500).json({ error: '⚠️ Failed to fetch episode data', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅ السيرفر يعمل على: https://bot-discord-js-4xqg.onrender.com`);
});
