import { Telegraf, Markup } from 'telegraf';
import { HiAnime } from 'aniwatch';
import express from 'express';
import dotenv from 'dotenv';
import keepAlive from './keep_alive.js';  // استيراد خادم keep-alive

dotenv.config();

// إنشاء بوت التليجرام
const bot = new Telegraf(process.env.token); // استبدل بـ التوكن من البيئة
const hianime = new HiAnime.Scraper();

// إيموجي لتحسين الرسائل
const emojis = {
  success: '✅',
  error: '❌',
  loading: '⏳',
  hd: '🎥',
};

// تخزين بيانات الجلسة (مؤقت في الذاكرة)
const sessions = new Map();

// دالة لتحويل الثواني إلى تنسيق MM:SS
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

// إعداد Express
const app = express();
app.use(express.json());

// الدالة التي تعالج تحديثات البوت عبر Webhook
app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// بدء السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
  await bot.telegram.setWebhook(`https://bot-discord-js-4xqg.onrender.com/webhook`); // استبدل بعنوان تطبيقك
  keepAlive();  // تشغيل خادم keep-alive
});

bot.start((ctx) => {
  ctx.reply(
    `مرحبًا! ${emojis.hd} أرسل لي رابط الحلقة من موقع hianime وسأحاول إحضار المصادر لك.`
  );
});

bot.on('text', async (ctx) => {
  const url = ctx.message.text;
  const match = url.match(/https:\/\/hianime\.to\/watch\/([^\/]+)/);

  if (match && match[1]) {
    const episodeId = match[1];

    // حفظ episodeId في حالة الجلسة (session)
    sessions.set(ctx.from.id, { episodeId });

    // إرسال أزرار الاختيار
    ctx.reply(
      `${emojis.loading} اختر جودة التشغيل:`,
      Markup.inlineKeyboard([
        Markup.button.callback('HD-1', 'hd-1'),
        Markup.button.callback('HD-2', 'hd-2'),
      ])
    );
  } else {
    ctx.reply(`${emojis.error} الرابط غير صحيح. يرجى إرسال رابط صحيح من hianime.`);
  }
});

// معالجة الضغط على الأزرار
bot.action(/hd-\d/, async (ctx) => {
  const quality = ctx.match[0]; // hd-1 أو hd-2
  const userId = ctx.from.id;
  const session = sessions.get(userId);

  if (!session || !session.episodeId) {
    return ctx.reply(`${emojis.error} لم يتم العثور على الرابط. أرسل الرابط مرة أخرى.`);
  }

  try {
    // تحرير الرسالة لإظهار حالة التحميل
    await ctx.editMessageText(`${emojis.loading} جاري جلب البيانات...`);

    // جلب البيانات بناءً على الجودة المختارة
    const data = await hianime.getEpisodeSources(session.episodeId, quality, "sub");

    // تنسيق الرسالة
    const message = `
${emojis.success} *تم العثور على البيانات:*\n
*🎬 رابط الفيديو (m3u8):*\n
\`\`\`
${data.sources[0].url}
\`\`\`\n
*📝 ملفات الترجمة:*\n
${data.tracks
  .map(
    (track) =>
      `- *${track.label}:* \`${track.file}\` ${
        track.default ? "(الافتراضي)" : ""
      }`
  )
  .join("\n")}\n
*⏱️ مقدمة الأنمي:*\n
- البداية: ${formatTime(data.intro.start)}\n
- النهاية: ${formatTime(data.intro.end)}\n
*⏱️ نهاية الأنمي:*\n
- البداية: ${formatTime(data.outro.start)}\n
- النهاية: ${formatTime(data.outro.end)}\n
*📊 معلومات إضافية:*\n
- AniList ID: ${data.anilistID}\n
- MyAnimeList ID: ${data.malID}
    `;

    // إرسال النتائج
    await ctx.editMessageText(message, { parse_mode: 'Markdown' });
  } catch (err) {
    // في حالة حدوث خطأ
    await ctx.editMessageText(
      `${emojis.error} حدث خطأ: ${err.message}\n\n` +
      `تفاصيل الخطأ:\n` +
      `- الكود: ${err.status || 'غير معروف'}\n` +
      `- الرسالة: ${err.message || 'غير معروف'}`
    );
  }
});
