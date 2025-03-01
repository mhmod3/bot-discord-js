import { Telegraf, Markup } from 'telegraf';
import { HiAnime } from 'aniwatch';

const bot = new Telegraf('7524565250:AAEdYw9Q9H_5WtGXIfUxCTl8K3ZpA49a4so'); // استبدل بـ التوكن الخاص بك
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

// تشغيل البوت
bot.launch();
