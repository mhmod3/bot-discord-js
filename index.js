import express from 'express';
import { Telegraf } from 'telegraf';
import * as aniwatch from 'aniwatch';

const BOT_TOKEN = '7524565250:AAEdYw9Q9H_5WtGXIfUxCTl8K3ZpA49a4so';
const WEBHOOK_URL = 'https://bot-discord-js-4xqg.onrender.com'; // استبدل باسم تطبيقك على Render

const bot = new Telegraf(BOT_TOKEN);
const app = express();

app.use(express.json());
app.use(bot.webhookCallback('/webhook'));

// الصفحة الرئيسية للتأكد من أن السيرفر يعمل
app.get('/', (req, res) => {
  res.send('البوت يعمل بنجاح');
});

// تعيين Webhook للبوت
bot.telegram.setWebhook(WEBHOOK_URL);

// معالجة الرسائل الواردة
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

// تشغيل السيرفر على Render
app.listen(3000, () => {
  console.log('السيرفر يعمل على المنفذ 3000');
});
