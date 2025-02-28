const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// لتفعيل الوصول من المتصفح (CORS)
const cors = require('cors');
app.use(cors());

app.use(express.static('public'));  // لإظهار ملف HTML

// نقطة النهاية لطلب حلقة الأنمي
app.get('/api/episode', (req, res) => {
  const { episodeId } = req.query;

  if (!episodeId) {
    return res.status(400).send({ error: 'Missing episodeId' });
  }

  // استدعاء المكتبة بشكل ديناميكي
  import("aniwatch")
    .then((aniwatch) => {
      const { getAnimeEpisodeSources } = aniwatch;

      getAnimeEpisodeSources(episodeId, "hd-1", "sub")
        .then((data) => {
          res.json(data);  // إرسال البيانات إلى العميل
        })
        .catch((err) => {
          console.error("Error fetching episode data:", err);
          res.status(500).send({ error: 'Failed to fetch episode data' });
        });
    })
    .catch((err) => {
      console.error("Error loading aniwatch:", err);
      res.status(500).send({ error: 'Failed to load aniwatch' });
    });
});

app.listen(port, () => {
  console.log(`Server running at https://bot-discord-js-4xqg.onrender.com`);
});
