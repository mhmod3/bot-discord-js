import { Telegraf } from 'telegraf';
import aniwatch from 'aniwatch';
import keepAlive from './keep_alive.js';

// إنشاء البوت
const bot = new Telegraf(process.env['token']);

// إنشاء الكائن الخاص بالـ Scraper
const hianime = new aniwatch.HiAnime.Scraper();
// التعامل مع الرسائل الواردة
bot.on('text', (ctx) => {
  const text = ctx.message.text;

  // التأكد من أن الرسالة تحتوي على رابط
  const regex = /https:\/\/hianime\.to\/watch\/([a-zA-Z0-9\-]+)\?ep=[0-9]+/;
  const match = text.match(regex);

  if (match) {
    const animeId = match[1]; // استخراج الـ animeId من الرابط
    const episodeId = text.split('?ep=')[1]; // استخراج الـ episodeId من الرابط

    // التحقق من أن الـ animeId و episodeId موجودين
    if (animeId && episodeId) {
      // إرسال الزرين للمستخدم
      ctx.reply(
        'Please choose the server to extract data from:',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'HD-1', callback_data: `hd-1|${animeId}?ep=${episodeId}` },
                { text: 'HD-2', callback_data: `hd-2|${animeId}?ep=${episodeId}` }
              ]
            ]
          }
        }
      );
    } else {
      // إذا لم يكن الـ id صحيحًا
      ctx.reply('Invalid anime episode ID.');
    }
  } else {
    // إذا لم يكن الرابط صحيحًا
    ctx.reply('Please send a valid link.');
  }
});

// التعامل مع الضغط على الأزرار
bot.on('callback_query', (ctx) => {
  const data = ctx.callbackQuery.data; // الحصول على البيانات من الزر
  const [server, id] = data.split('|'); // تقسيم البيانات إلى السيرفر و الـ id

  // اختيار السيرفر بناءً على الضغط
  hianime
    .getEpisodeSources(id, server, 'sub')
    .then((data) => {
      if (data.sources && data.sources.length > 0) {
        // تنسيق البيانات وإرسالها للمستخدم
        const formattedData = `
Anime ID: ${data.anilistID || 'N/A'}
MAL ID: ${data.malID || 'N/A'}
Intro: Start - ${data.intro.start}, End - ${data.intro.end}
Outro: Start - ${data.outro.start}, End - ${data.outro.end}

Subtitles:
${data.tracks.map(track => `${track.label}: ${track.file}`).join('\n')}

Sources:
${data.sources.map(source => `Type: ${source.type}, URL: ${source.url}`).join('\n')}
        `;
        ctx.reply(formattedData);
      } else {
        // إذا لم تكن هناك معلومات
        ctx.reply('No information found. Thank you!');
      }
    })
    .catch((err) => {
      // في حال حدوث خطأ
      ctx.reply(`Error: ${err.message}`);
    });

  // تأكيد الضغط على الزر
  ctx.answerCbQuery();
});

keepAlive();
bot.launch();
