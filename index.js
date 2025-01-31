import { Telegraf } from 'telegraf';
import * as aniwatch from 'aniwatch';

const bot = new Telegraf('7524565250:AAEdYw9Q9H_5WtGXIfUxCTl8K3ZpA49a4so');

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

bot.launch({
  dropPendingUpdates: true, // يمنع التعارض في التحديثات القديمة
});
