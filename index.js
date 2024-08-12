const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const keepAlive = require('./keep_alive.js');

// استبدل بـ Token الخاص ببوتك
const BOT_TOKEN = process.env['token'];
const bot = new Telegraf(BOT_TOKEN);

// دالة لتوليد اسم عشوائي للملف
const generateRandomFileName = (extension) => {
    return crypto.randomBytes(16).toString('hex') + extension;
};

// دالة للتحقق من وجود روابط في النص
const containsUrls = (text) => {
    const urlPattern = /https?:\/\/[^\s]+/g;
    return urlPattern.test(text);
};

// دالة لتقسيم النص إلى أجزاء صغيرة
const splitMessage = (message, chunkSize = 4096) => {
    const chunks = [];
    for (let i = 0; i < message.length; i += chunkSize) {
        chunks.push(message.substring(i, i + chunkSize));
    }
    return chunks;
};

bot.start((ctx) => ctx.reply('لا تسوي خوي ارسل ملفك واسكت.'));

bot.on('document', async (ctx) => {
    const fileId = ctx.message.document.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    // توليد اسم عشوائي للملف
    const tempFileName = generateRandomFileName('.txt');
    const tempFilePath = path.join(__dirname, tempFileName);

    try {
        // تحميل الملف
        const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
        fs.writeFileSync(tempFilePath, response.data);

        // قراءة محتوى الملف
        const fileContent = fs.readFileSync(tempFilePath, 'utf-8');

        if (!containsUrls(fileContent)) {
            // حذف الملف بعد الفحص
            fs.unlinkSync(tempFilePath);
            return ctx.reply('تستهبل؟ الملف ما فيه روابط.');
        }

        const urls = fileContent.split('\n').filter(line => line.trim().startsWith('http'));

        if (urls.length === 0) {
            fs.unlinkSync(tempFilePath);
            return ctx.reply('تستهبل؟ الملف ما فيه روابط.');
        }

        const invalidLines = fileContent.split('\n').filter(line => !line.trim().startsWith('http'));

        if (invalidLines.length > 0) {
            fs.unlinkSync(tempFilePath);
            return ctx.reply('أمسح الكلمات الي بالملف وتعال.');
        }

        await ctx.reply('بدء نك* الروابط...');

        let results = [];
        for (const url of urls) {
            try {
                const headResponse = await axios.head(url, { 
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Connection': 'keep-alive'
                    }
                });
                if (headResponse.status === 200) {
                    results.push(`شغال يسطا: \n${url}`);
                } else {
                    results.push(`ما يشتغل يسطا: \n${url}`);
                }
            } catch (error) {
                results.push(`ما يشتغل يسطا: \n${url}`);
            }
        }

        // حذف الملف بعد الفحص
        fs.unlinkSync(tempFilePath);

        // إرسال نتائج الفحص بعد تقسيمها
        const messages = splitMessage(results.join('\n'));
        for (const message of messages) {
            await ctx.reply(message);
        }

    } catch (error) {
        await ctx.reply(`مشكلة: ${error.message}`);
    }
});

keepAlive();
bot.launch();
console.log('بوت التليجرام يعمل...');