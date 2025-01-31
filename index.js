import { Telegraf } from 'telegraf';
import { HiAnime } from 'aniwatch';

const bot = new Telegraf('توكن البوت هنا');
const hianime = new HiAnime.Scraper();

bot.on('text', async (ctx) => {
  const url = ctx.message.text;
  const match = url.match(/hianime\.to\/watch\/([a-zA-Z0-9-?=]+)/);
  if (match) {
    const episodeId = match[1];
    try {
      const data = await hianime.getEpisodeSources(episodeId, 'hd-1', 'sub');
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
