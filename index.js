const { Telegraf, session } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const keepAlive = require('./keep_alive.js');

const BOT_TOKEN = process.env['token'];
const bot = new Telegraf(BOT_TOKEN);


// إعدادات الجلسة
bot.use(session({
    defaultSession: () => ({ processing: false, lastUsed: 0 })  // تهيئة الجلسة الافتراضية
}));

// ترجمة الحالة إلى العربية
const translateStatus = (status) => {
    switch (status.toLowerCase()) {
        case 'finished':
            return 'مُكتمل';
        case 'releasing':
            return 'مُستمر';
        case 'not_yet_released':
            return 'لم يُعرض بعد';
        case 'cancelled':
            return 'ملغي';
        default:
            return 'أخرى';
    }
};

// تنفيذ الأمر /start
bot.start((ctx) => {
    ctx.reply("مرحباً! الرجاء إرسال لقطة للأنمي وأنا سأحاول التعرف عليه.");
});

bot.on('photo', async (ctx) => {
    const currentTime = Date.now();

    try {
        // التحقق من فترة الانتظار بين الاستخدامات
        if (ctx.session.processing) {
            return ctx.reply("⚠️ جاري معالجة صورة بالفعل، الرجاء الانتظار قليلاً.");
        }
        if (currentTime - ctx.session.lastUsed < 16000) { // 16 ثانية
            return ctx.reply("⚠️ يجب الانتظار 16 ثانية بين كل استخدام وآخر.");
        }

        // وضع علامة لبدء الجلسة ومعالجة الصورة
        ctx.session.processing = true;
        ctx.session.lastUsed = currentTime; // تحديث وقت آخر استخدام

        // احصل على الصورة بجودة عالية
        const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        const file = await ctx.telegram.getFileLink(fileId);

        // إرسال رسالة أولية
        const initialMessage = await ctx.reply("📸 جاري معالجة الصورة...");

        // استدعاء API موقع trace.moe
        const traceMoeResponse = await axios.get('https://api.trace.moe/search', {
            params: {
                url: file.href
            }
        });

        const traceData = traceMoeResponse.data.result[0];

        // تأكد من أن الـ AniList ID موجود في الاستجابة
        if (!traceData.anilist) {
            throw new Error("لم يتم العثور على ID الخاص بـ AniList.\nتواصل مع : @liM7mod");
        }

        const anilistId = traceData.anilist;

        // استدعاء API موقع AniList للحصول على تفاصيل الأنمي
        const anilistResponse = await axios.post('https://graphql.anilist.co', {
            query: `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    title {
                        romaji
                        english
                        native
                    }
                    status
                    startDate {
                        year
                    }
                }
            }
            `,
            variables: {
                id: anilistId
            }
        });

        const animeData = anilistResponse.data.data.Media;

        // تأكد من وجود عنوان الأنمي
        if (!animeData.title) {
            throw new Error("لم يتم العثور على اسم الأنمي.");
        }

        const titles = [animeData.title.romaji, animeData.title.english, animeData.title.native].filter(Boolean);
        const mainTitle = titles.shift();  // احصل على الاسم الأساسي (أول اسم)
        const otherTitles = titles.map(title => `\`${title}\``).join('، ');  // الاسماء الأخرى

        const status = translateStatus(animeData.status);  // ترجمة الحالة إلى العربية
        const year = animeData.startDate.year;

        // اسم الملف المؤقت
        const tempFileName = `${uuidv4()}.mp4`;

        // إعداد الرسالة مع الفيديو
        const message = `
📺 *اسم الأنمي:* \`${mainTitle}\`
*أسماء أخرى:* \n${otherTitles}
🎥 *الحالة:* ${status}
📅 *سنة الإنتاج:* ${year}
🕒 *الحلقة:* ${traceData.episode}
⏱ *الوقت:* ${new Date(traceData.from * 1000).toISOString().substr(11, 8)}


هذه ليس الانمي الذي تبحث عنه؟ \nأذن توجه هنا : \`https://shorturl.at/lDMF3\`\n\nقد تكون هذه النتائج غير صحيحة.`;

        // إرسال رسالة للتأكيد على بدء معالجة الصورة
        await ctx.telegram.editMessageText(initialMessage.chat.id, initialMessage.message_id, undefined, message, { parse_mode: 'Markdown' });

        const videoUrl = traceData.video;
        const videoStream = await axios({
            url: videoUrl,
            responseType: 'stream'
        });

        // حفظ الفيديو في ملف مؤقت
        const videoPath = path.join(__dirname, tempFileName);
        videoStream.data.pipe(fs.createWriteStream(videoPath));

        // الانتظار حتى يتم حفظ الفيديو
        await new Promise((resolve) => {
            videoStream.data.on('end', resolve);
        });

        // إرسال الفيديو
        await ctx.replyWithVideo({ source: videoPath });

        // حذف الملف المؤقت
        fs.unlinkSync(videoPath);

    } catch (error) {
        console.error('حدث خطأ: \nتواصل مع : @liM7mod', error.message);
        await ctx.reply(`⚠️ حدث خطأ أثناء معالجة الصورة: ${error.message}\nتواصل مع : @liM7mod`);
    } finally {
        // إغلاق الجلسة بعد الانتهاء من معالجة الصورة
        ctx.session.processing = false;
    }
});

// بدء تشغيل البوت
keepAlive();
bot.launch();