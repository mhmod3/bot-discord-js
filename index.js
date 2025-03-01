import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public')); // لتقديم ملفات HTML

// نقطة النهاية لطلب حلقة الأنمي
app.get('/api/episode', async (req, res) => {
  const { episodeId } = req.query;

  if (!episodeId) {
    return res.status(400).json({ error: 'Missing episodeId' });
  }

  try {
    const aniwatch = await import("aniwatch"); // استدعاء ديناميكي للمكتبة
    const { getAnimeEpisodeSources } = aniwatch;
    
    const data = await getAnimeEpisodeSources(episodeId, "hd-1", "sub");
    res.json(data);
  } catch (err) {
    console.error("Error fetching episode data:", err);
    res.status(500).json({ error: 'Failed to fetch episode data' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
