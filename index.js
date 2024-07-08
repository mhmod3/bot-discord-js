const { Telegraf } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { nanoid } = require('nanoid');

// استبدل 'YOUR_BOT_TOKEN' برمز الوصول الخاص ببوتك
TOKEN = process.env['TOKEN'];
const bot = new Telegraf('TOKEN');

// معرف المجموعة التي ستتلقى التقارير
const REPORT_GROUP_ID = '-10023145567';

bot.start(async (ctx) => {
  await ctx.reply('أدخل اسم الأنمي:');
  bot.on('text', async (ctx) => {
    const animeName = ctx.message.text;
    await ctx.reply('أدخل رقم الحلقة:');
    
    bot.once('text', async (ctx) => {
      const episodeNumber = ctx.message.text;
      const animeSlug = animeName.replace(/\s+/g, '-');
      const url = `https://witanime.cyou/episode/${animeSlug}-${episodeNumber}/`;

      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
          },
        });

        if (response.status === 200) {
          const $ = cheerio.load(response.data);
          $('title').text('Anime');
          const modifiedHtml = $.html();
          const filename = `${nanoid()}.html`;

          fs.writeFileSync(filename, modifiedHtml);

          await ctx.replyWithDocument({ source: filename, filename }, { caption: 'الصفحة المعدلة لأنميك' });
          fs.unlinkSync(filename);
        } else {
          await ctx.reply('لم يتم العثور على الصفحة المطلوبة.');
        }
      } catch (error) {
        await ctx.reply('حدث خطأ أثناء تحميل الصفحة.');
        console.error(error);
      }
    });
  });
});

bot.command('report', async (ctx) => {
  await ctx.reply('الرجاء وصف المشكلة التي تواجهها:');
  bot.once('text', async (ctx) => {
    const reportMessage = ctx.message.text;
    await bot.telegram.sendMessage(REPORT_GROUP_ID, `تقرير من ${ctx.from.username}:\n${reportMessage}`);
    await ctx.reply('تم إرسال تقريرك بنجاح.');
  });
});

bot.launch();
console.log('Bot is running...');
