const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const { performance } = require('perf_hooks');
const { v4: uuidv4 } = require('uuid'); 
const keepAlive = require('./keep_alive.js');

const BOT_TOKEN = process.env['token'];
const bot = new Telegraf(BOT_TOKEN);


bot.on('document', async (ctx) => {
  const startTime = performance.now();
  const fileId = ctx.message.document.file_id;
  const fileLink = await ctx.telegram.getFileLink(fileId);

  // توليد اسم عشوائي للملف
  const tempFileName = `${uuidv4()}.txt`;

  // تنزيل الملف وحفظه باسم عشوائي
  const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
  fs.writeFileSync(tempFileName, response.data);

  const fileContent = fs.readFileSync(tempFileName, 'utf-8');
  const links = fileContent.split('\n').filter(Boolean);
  const totalLinks = links.length;

  const estimatedTime = (totalLinks * 2).toFixed(2); // افتراض أن كل رابط سيأخذ حوالي 2 ثانية للفحص
  await ctx.reply(`تم استلام الملف وفيه ${totalLinks} رابط. سيستغرق الفحص حوالي ${estimatedTime} ثانية. بدء العملية الآن... (أحلم اذا ستغرق الفحص هذه الوقت)`);

  let workingLinks = [];
  let nonWorkingLinks = [];

  for (let i = 0; i < totalLinks; i++) {
    const currentLink = links[i];
    await ctx.reply(`جارِ فحص الرابط ${i + 1}/${totalLinks}: ${currentLink}`);

    try {
      await axios.get(currentLink, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      workingLinks.push(currentLink);
    } catch (error) {
      nonWorkingLinks.push(currentLink);
    }
  }

  const endTime = performance.now();
  const actualTimeTaken = ((endTime - startTime) / 1000).toFixed(2);

  const workingMessage = workingLinks.length ? `الروابط الصالحة:\n${workingLinks.join('\n')}` : 'لم يتم العثور على روابط صالحة.';
  const nonWorkingMessage = nonWorkingLinks.length ? `الروابط غير الصالحة:\n${nonWorkingLinks.join('\n')}` : 'كل الروابط صالحة.\nقد تكون النتائج غير صحيحة.';

  await ctx.reply(`${workingMessage}\n\n${nonWorkingMessage}`);
  await ctx.reply(`تم إكمال عملية الفحص في ${actualTimeTaken} ثانية.`);

  // حذف الملف بعد الانتهاء
  fs.unlinkSync(tempFileName);
});
keepAlive();
bot.launch();
