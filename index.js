import("aniwatch")
  .then(({ getAnimeEpisodeSources }) => {
    import { Telegraf } from 'telegraf';

    // توكن البوت من بوت فاذر
    const BOT_TOKEN = '7524565250:AAEE0v-IRhkTotEPtoMrktQCqrRWUhlZe0g';
    const bot = new Telegraf(BOT_TOKEN);

    // دالة استخراج ID الحلقة من الرابط
    function extractEpisodeId(url) {
      const match = url.match(/watch\/([^?]+)\?ep=(\d+)/);
      return match ? `${match[1]}?ep=${match[2]}` : null;
    }

    // استقبال الرسالة من المستخدم
    bot.on('text', async (ctx) => {
      const text = ctx.message.text;

      if (text.startsWith('https://hianime.to/watch/')) {
        const episodeId = extractEpisodeId(text);

        if (!episodeId) {
          return ctx.reply('❌ لم أتمكن من استخراج ID الحلقة، تأكد من صحة الرابط.');
        }

        try {
          const episodeData = await getAnimeEpisodeSources(episodeId, 'hd-1', 'sub');
          const response = `
📺 *معلومات الحلقة*:
- 🎥 *رابط الحلقة:* ${text}
- 🔗 *ID الحلقة:* ${episodeId}
- 📡 *المصادر:* ${JSON.stringify(episodeData, null, 2)}
`;

          ctx.reply(response, { parse_mode: 'Markdown' });
        } catch (err) {
          ctx.reply('❌ حدث خطأ أثناء جلب المعلومات.');
          console.error(err);
        }
      } else {
        ctx.reply('⚠️ أرسل رابطًا صحيحًا من Hianime.');
      }
    });

    // تشغيل البوت
    bot.launch();

  })
  .catch((err) => console.error("Error loading aniwatch:", err));
