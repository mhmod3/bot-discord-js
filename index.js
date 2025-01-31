import { Telegraf } from 'telegraf';
import * as aniwatch from 'aniwatch';

console.log(aniwatch); // تحقق من الهيكل لمعرفة كيفية استدعاء Scraper

const HiAnime = aniwatch.default?.HiAnime || aniwatch.HiAnime;

if (!HiAnime) {
  console.error('لم يتم العثور على HiAnime في aniwatch');
  process.exit(1);
}

const hianime = new HiAnime.Scraper();
const bot = new Telegraf('توكن البوت هنا');

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
