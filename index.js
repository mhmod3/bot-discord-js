import { Telegraf } from 'telegraf';
import { HiAnime } from 'aniwatch';

const bot = new Telegraf('7524565250:AAEdYw9Q9H_5WtGXIfUxCTl8K3ZpA49a4so');
const hianime = new HiAnime.Scraper();

bot.on('text', (ctx) => {
  const url = ctx.message.text;

  // استخراج المعرف من الرابط
  const match = url.match(/hianime\.to\/watch\/([a-zA-Z0-9-?=]+)/);
  if (match) {
    const episodeId = match[1];
    hianime
      .getEpisodeSources(episodeId, 'hd-1', 'sub')
      .then((data) => {
        ctx.reply(JSON.stringify(data, null, 2)); // عرض النتائج للمستخدم
      })
      .catch((err) => {
        ctx.reply('حدث خطأ أثناء جلب البيانات.');
        console.error(err);
      });
  } else {
    ctx.reply('الرجاء إرسال رابط حلقة صحيح.');
  }
});

bot.launch();
