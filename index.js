import express from 'express';
import { HiAnime } from "aniwatch"; // استيراد المكتبة بالطريقة الصحيحة

const app = express();
const port = process.env.PORT || 3000;

// إنشاء كائن `Scraper` من `HiAnime`
const hianime = new HiAnime.Scraper();

app.use(express.json()); // دعم JSON للطلبات

app.get('/api/episode', async (req, res) => {
  const { episodeId } = req.query;

  if (!episodeId) {
    return res.status(400).json({ error: '❌ Missing episodeId' });
  }

  try {
    console.log(`🔍 جلب بيانات الحلقة: ${episodeId}`);

    // استدعاء `getEpisodeSources` وفقًا للتوثيق الرسمي
    const data = await hianime.getEpisodeSources(episodeId, "hd-1", "sub");

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
