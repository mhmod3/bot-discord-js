import("aniwatch")
  .then(async ({ getAnimeEpisodeSources }) => {
    const { Telegraf } = await import('telegraf'); // استخدم dynamic import لكل المكتبات

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
          const sources = episodeData.sources || []; // التأكد من وجود المصادر
          let sourcesList = '';

          // جمع روابط m3u8 من المصادر إذا كانت موجودة
          sources.forEach((source, index) => {
            if (source.file && source.file.includes('m3u8')) {
              sourcesList += `\n${index + 1}. [رابط m3u8](${source.file})`;
            }
          });

          if (!sourcesList) {
            sourcesList = '❌ لم أتمكن من إيجاد رابط m3u8.';
          }

          const response = `
📺 *معلومات الحلقة*:
- 🎥 *رابط الحلقة:* ${text}
- 🔗 *ID الحلقة:* ${episodeId}
- 📡 *المصادر:* ${sourcesList}
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
