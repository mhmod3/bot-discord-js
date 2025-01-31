import { Telegraf } from 'telegraf';
import * as aniwatch from 'aniwatch';

const bot = new Telegraf('توكن البوت هنا');

bot.on('text', async (ctx) => {
  const url = ctx.message.text;
  const match = url.match(/hianime\.to\/watch\/([a-zA-Z0-9-?=]+)/);
  if (match) {
    const episodeId = match[1];
    try {
      const data = await aniwatch.getAnimeEpisodeSources(episodeId);
      ctx.reply(JSON.stringify(data, null, 2));
    } catch (err) {
      ctx.reply('حدث خطأ أثناء جلب البيانات.');
      console.error(err);
    }
  } else {
    ctx.reply('الرجاء إرسال رابط حلقة صحيح.');
  }
});

bot.launch();
