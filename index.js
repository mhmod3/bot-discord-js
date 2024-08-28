const { Telegraf, session, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const keepAlive = require('./keep_alive.js');



const BOT_TOKEN = process.env['token'];
const bot = new Telegraf(BOT_TOKEN);

// إعدادات الجلسة
bot.use(session({
    defaultSession: () => ({ processing: false, lastUsed: 0, fileToProcess: null, messageToDelete: null })  // تهيئة الجلسة الافتراضية
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

// التحقق مما إذا كان الأنمي فيلمًا
const isMovie = (type) => {
    return type && type.toLowerCase() === 'movie';
};

// التحقق من نسبة الأبعاد للصورة
const checkAspectRatio = (width, height) => {
    const ratio = width / height;

    // قبول الصور بنسبة (16:9) أو (4:3) بفارق بسيط
    if (Math.abs(ratio - 16 / 9) <= 0.1) return '16:9';
    if (Math.abs(ratio - 4 / 3) <= 0.1) return '4:3';

    // التحقق مما إذا كانت الصورة كبيرة أو صغيرة
    if (ratio > 16 / 9) return 'large';
    if (ratio < 4 / 3) return 'small';

    return 'unknown';
};

// تنفيذ الأمر /start
bot.start((ctx) => {
    ctx.reply("مرحباً! الرجاء إرسال لقطة للأنمي أو ملف GIF أو فيديو MP4 وأنا سأحاول التعرف على ألانمي.");
});

// معالجة الصور، GIF، وفيديوهات MP4
const handleMedia = async (ctx, file) => {
    const currentTime = Date.now();

    try {
        // التحقق من فترة الانتظار بين الاستخدامات
        if (ctx.session.processing) {
            return ctx.reply("⚠️ جاري معالجة ملف بالفعل، الرجاء الانتظار قليلاً.");
        }
        if (currentTime - ctx.session.lastUsed < 16000) { // 16 ثانية
            return ctx.reply("⚠️ يجب الانتظار 16 ثانية بين كل استخدام وآخر.");
        }

        // الحصول على تفاصيل الملف
        const fileLink = await ctx.telegram.getFileLink(file.file_id);

        // التحقق من حجم الملف
        const fileSizeInMB = file.file_size / (1024 * 1024);
        if (fileSizeInMB > 20) {
            throw new Error("حجم الملف أكبر من 20 ميغابايت.");
        }

        // وضع علامة لبدء الجلسة ومعالجة الملف
        ctx.session.processing = true;
        ctx.session.lastUsed = currentTime; // تحديث وقت آخر استخدام

        // حذف رسالة الموافقة/الرفض إذا كانت موجودة
        if (ctx.session.messageToDelete) {
            await ctx.deleteMessage(ctx.session.messageToDelete);
            ctx.session.messageToDelete = null; // مسح معرف الرسالة بعد حذفها
        }

        // إرسال رسالة أولية
        const initialMessage = await ctx.reply("📸 جاري معالجة الملف...");

        // استدعاء API موقع trace.moe
        const traceMoeResponse = await axios.get('https://api.trace.moe/search', {
            params: {
                url: fileLink.href
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
                    format
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

        // التحقق مما إذا كان الأنمي فيلمًا
        const isAnimeMovie = isMovie(animeData.format);

        // إعداد الرسالة مع الفيديو
        const episodeOrMovie = isAnimeMovie ? "فيلم" : `الحلقة: ${traceData.episode}`;
        const fromTime = new Date(traceData.from * 1000).toISOString().substr(11, 8);
        const toTime = new Date(traceData.to * 1000).toISOString().substr(11, 8);

        const message = `
📺 *اسم الأنمي:* \`${mainTitle}\`
*أسماء أخرى:* \n${otherTitles}
🎥 *الحالة:* ${status}
📅 *سنة الإنتاج:* ${year}
🕒 *${episodeOrMovie}*
⏱ *الوقت:* ${fromTime} - ${toTime}

هذه ليس الانمي الذي تبحث عنه؟ \nأذن توجه هنا : \`https://shorturl.at/lDMF3\`\n\nقد تكون هذه النتائج غير صحيحة.`;

        // إرسال رسالة للتأكيد على بدء معالجة الملف
        await ctx.telegram.editMessageText(initialMessage.chat.id, initialMessage.message_id, undefined, message, { parse_mode: 'Markdown' });

        // تنزيل ومعالجة الفيديو إن وجد
        if (traceData.video) {
            const videoUrl = traceData.video;
            const tempFileName = `${uuidv4()}.mp4`;
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
        }

    } catch (error) {
        console.error('حدث خطأ: \nتواصل مع : @liM7mod', error.message);
        await ctx.reply(`⚠️ حدث خطأ أثناء معالجة الملف: ${error.message}\nتواصل مع : @liM7mod`);
    } finally {
        // إغلاق الجلسة بعد الانتهاء من معالجة الملف
        ctx.session.processing = false;
    }
};

// متابعة معالجة الملف بعد تأكيد المستخدم
bot.action('continue_processing', async (ctx) => {
    await ctx.answerCbQuery();
    const file = ctx.session.fileToProcess;
    if (file) {
        await handleMedia(ctx, file);
    }
});

// إلغاء معالجة الملف بعد رفض المستخدم
bot.action('cancel_processing', async (ctx) => {
    await ctx.answerCbQuery();

    // حذف رسالة الموافقة/الرفض
    if (ctx.session.messageToDelete) {
        await ctx.deleteMessage(ctx.session.messageToDelete);
        ctx.session.messageToDelete = null; // مسح معرف الرسالة بعد حذفها
    }

    ctx.reply("🚫 تم إلغاء العملية.");
    ctx.session.processing = false;
    ctx.session.fileToProcess = null;
});

// التعامل مع الصور
bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1]; // اختيار أعلى دقة
    const fileDetails = await ctx.telegram.getFile(photo.file_id);
    const fileLink = await ctx.telegram.getFileLink(photo.file_id); // استرجاع الرابط المباشر للصورة
    const aspectRatio = checkAspectRatio(photo.width, photo.height);

    if (aspectRatio === '16:9' || aspectRatio === '4:3') {
        handleMedia(ctx, { file_id: photo.file_id, file_size: photo.file_size });
    } else if (aspectRatio === 'large' || aspectRatio === 'small') {
        ctx.session.fileToProcess = { file_id: photo.file_id, file_size: photo.file_size };
        ctx.session.messageToDelete = (await ctx.reply(`⚠️ الصورة غير مناسبة بنسب الأبعاد (${photo.width}x${photo.height}). هل تريد الاستمرار؟`, Markup.inlineKeyboard([
            Markup.button.callback('نعم', 'continue_processing'),
            Markup.button.callback('لا', 'cancel_processing')
        ]))).message_id;
    } else {
        ctx.reply("⚠️ الصورة غير مناسبة بنسب أبعاد غير معروفة.");
    }
});

// التعامل مع GIF
bot.on('document', async (ctx) => {
    const { document } = ctx.message;

    // التحقق من نوع الملف إذا كان GIF
    if (document.mime_type === 'image/gif') {
        handleMedia(ctx, document);
    } else {
        ctx.reply("⚠️ الملف المرسل ليس صوره او فيديو او GIF.");
    }
});

// التعامل مع MP4
bot.on('video', async (ctx) => {
    const { video } = ctx.message;

    // التحقق من نوع الملف إذا كان MP4
    if (video.mime_type === 'video/mp4') {
        handleMedia(ctx, video);
    } else {
        ctx.reply("⚠️ الملف المرسل ليس صوره او فيديو او GIF.");
    }
});
keepAlive();
bot.launch();
