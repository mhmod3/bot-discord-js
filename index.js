const { exec } = require('child_process');
const { Telegraf } = require('telegraf');

// تثبيت المكتبات المطلوبة إذا كانت غير مثبتة
exec('npm install telegraf aniwatch', async (err, stdout, stderr) => {
  if (err) {
    console.error(`Error: ${err.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);

  // تحميل مكتبة aniwatch ديناميكيًا
  const aniwatch = await import('aniwatch');

  // بعد تثبيت المكتبات، يمكنك إضافة الكود الخاص بك هنا
  const bot = new Telegraf('توكن البوت هنا');
  const hianime = new aniwatch.HiAnime.Scraper();

  bot.on('text', (ctx) => {
    const url = ctx.message.text;
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
});
