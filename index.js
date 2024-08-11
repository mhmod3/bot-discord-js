const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const { performance } = require('perf_hooks');
const { v4: uuidv4 } = require('uuid');
const { load } = require('cheerio'); // مكتبة لتحليل HTML
const keepAlive = require('./keep_alive.js');

const BOT_TOKEN = process.env['token'];
const bot = new Telegraf(BOT_TOKEN);

// زمن الانتظار الأقصى للطلبات (بالميلي ثانية)
const TIMEOUT = 10000;
const DELAY = 2000; // تأخير بين الطلبات لتقليل الحمل على الشبكة

bot.on('document', async (ctx) => {
  const fileId = ctx.message.document.file_id;
  const fileLink = await ctx.telegram.getFileLink(fileId);

  const tempFileName = `${uuidv4()}.txt`;

  try {
    // تنزيل الملف وحفظه باسم عشوائي
    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    fs.writeFileSync(tempFileName, response.data);

    await ctx.reply('هل تريد فعلاً فحص الروابط في الملف؟', Markup.inlineKeyboard([
      Markup.button.callback('نعم', `start_check_${tempFileName}`),
      Markup.button.callback('لا', `cancel_check_${tempFileName}`)
    ]));
  } catch (error) {
    console.error('Error downloading file:', error.message);
    await ctx.reply('حدث خطأ أثناء تنزيل الملف. يرجى المحاولة مرة أخرى.');
  }
});

bot.action(/start_check_(.+)/, async (ctx) => {
  const tempFileName = ctx.match[1];
  const startTime = performance.now();

  try {
    const fileContent = fs.readFileSync(tempFileName, 'utf-8');
    const links = fileContent.split('\n').filter(Boolean);
    const totalLinks = links.length;

    const estimatedTime = (totalLinks * 2).toFixed(2); // افتراض أن كل رابط سيأخذ حوالي 2 ثانية للفحص
    await ctx.reply(`سيستغرق الفحص حوالي ${estimatedTime} ثانية. بدء العملية الآن...`);

    let workingLinks = [];
    let nonWorkingLinks = [];

    for (let i = 0; i < totalLinks; i++) {
      const currentLink = links[i].trim();
      await ctx.reply(`جارِ فحص الرابط ${i + 1}/${totalLinks}: ${currentLink}`);

      try {
        const res = await axios.get(currentLink, { 
          headers: { 'User-Agent': 'Mozilla/5.0' }, 
          validateStatus: false,
          timeout: TIMEOUT
        });

        // تحليل محتوى HTML للبحث عن رسائل الأخطاء
        const $ = load(res.data);
        const statusCode = res.status;

        // تحقق من الأخطاء بناءً على النصوص المحددة في HTML
        const bodyText = $('body').text().toLowerCase();
        console.log(`Status Code: ${statusCode} for URL: ${currentLink}`);
        console.log(`Body Text: ${bodyText}`);
        if (statusCode >= 400 || bodyText.includes('404') || bodyText.includes('not found') || bodyText.includes('file not found')) {
          nonWorkingLinks.push(currentLink);
        } else {
          workingLinks.push(currentLink);
        }
      } catch (error) {
        console.error('Error checking link:', error.message);
        nonWorkingLinks.push(currentLink);
      }

      // إضافة تأخير بين الطلبات
      await new Promise(resolve => setTimeout(resolve, DELAY));
    }

    const endTime = performance.now();
    const actualTimeTaken = ((endTime - startTime) / 1000).toFixed(2);

    const workingMessage = workingLinks.length ? `الروابط الصالحة:\n${workingLinks.join('\n')}` : 'لم يتم العثور على روابط صالحة.';
    const nonWorkingMessage = nonWorkingLinks.length ? `الروابط غير الصالحة:\n${nonWorkingLinks.join('\n')}` : 'كل الروابط صالحة.\nقد تكون النتائج غير صحيحة.';

    await ctx.reply(`${workingMessage}\n\n${nonWorkingMessage}`);
    await ctx.reply(`تم إكمال عملية الفحص في ${actualTimeTaken} ثانية.`);
  } catch (error) {
    console.error('Error processing file:', error.message);
    await ctx.reply('حدث خطأ أثناء معالجة الملف. يرجى المحاولة مرة أخرى.');
  } finally {
    // حذف الملف بعد الانتهاء حتى في حال حدوث خطأ
    if (fs.existsSync(tempFileName)) {
      fs.unlinkSync(tempFileName);
    }
  }
});

bot.action(/cancel_check_(.+)/, async (ctx) => {
  const tempFileName = ctx.match[1];
  if (fs.existsSync(tempFileName)) {
    fs.unlinkSync(tempFileName);
  }
  await ctx.reply('تم إلغاء عملية الفحص وحذف الملف.');
});

keepAlive();
bot.launch();
