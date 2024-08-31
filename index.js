const { Telegraf, session, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const keepAlive = require('./keep_alive.js');

const BOT_TOKEN = process.env['token'];
const bot = new Telegraf(BOT_TOKEN);

const dataFilePath = path.join(__dirname, 'botData.json');

// تحميل البيانات من الملف
let botData = { usageCount: 0, ratings: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 }, userRatings: {} };
if (fs.existsSync(dataFilePath)) {
    botData = JSON.parse(fs.readFileSync(dataFilePath));
}

let { usageCount, ratings, userRatings } = botData;

// حفظ البيانات في الملف
const saveData = () => {
    fs.writeFileSync(dataFilePath, JSON.stringify({ usageCount, ratings, userRatings }, null, 2));
};

// إعدادات الجلسة
bot.use(session({
    defaultSession: () => ({ processing: false, fileToProcess: null, messageToDelete: null })
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

    if (Math.abs(ratio - 16 / 9) <= 0.1) return '16:9';
    if (Math.abs(ratio - 4 / 3) <= 0.1) return '4:3';

    if (ratio > 16 / 9) return 'large';
    if (ratio < 4 / 3) return 'small';

    return 'unknown';
};

// تنفيذ الأمر /start
bot.start((ctx) => {
    ctx.reply("مرحباً! الرجاء إرسال لقطة للأنمي أو ملف GIF أو فيديو MP4 وأنا سأحاول التعرف على ألانمي.");
});

// إعداد أزرار التقييم
const ratingButtons = Markup.inlineKeyboard([
    Markup.button.callback('1 ⭐', 'rate_1'),
    Markup.button.callback('2 ⭐', 'rate_2'),
    Markup.button.callback('3 ⭐', 'rate_3'),
    Markup.button.callback('4 ⭐', 'rate_4'),
    Markup.button.callback('5 ⭐', 'rate_5')
]);

// معالجة الصور، GIF، وفيديوهات MP4
const handleMedia = async (ctx, file) => {
    try {
        usageCount++; // زيادة عداد الاستخدام
        saveData(); // حفظ البيانات بعد كل استخدام

        if (ctx.session.processing) {
            return ctx.reply("⚠️ جاري معالجة ملف بالفعل، الرجاء الانتظار قليلاً.");
        }

        const fileLink = await ctx.telegram.getFileLink(file.file_id);
        const fileSizeInMB = file.file_size / (1024 * 1024);
        if (fileSizeInMB > 20) {
            throw new Error("حجم الملف أكبر من 20 ميغابايت.");
        }

        ctx.session.processing = true;

        if (ctx.session.messageToDelete) {
            await ctx.deleteMessage(ctx.session.messageToDelete);
            ctx.session.messageToDelete = null;
        }

        const initialMessage = await ctx.reply("📸 جاري معالجة الملف...");

        const traceMoeResponse = await axios.get('https://api.trace.moe/search', {
            params: {
                url: fileLink.href
            }
        });

        const traceData = traceMoeResponse.data.result[0];

        if (!traceData.anilist) {
            throw new Error("لم يتم العثور على ID الخاص بـ AniList.\nتواصل مع : @liM7mod");
        }

        const anilistId = traceData.anilist;

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

        const titles = [animeData.title.romaji, animeData.title.english, animeData.title.native].filter(Boolean);
        const mainTitle = titles.shift();
        const otherTitles = titles.map(title => `\`${title}\``).join(' ، ');

        const status = translateStatus(animeData.status);
        const year = animeData.startDate.year;

        const isAnimeMovie = isMovie(animeData.format);
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

        await ctx.telegram.editMessageText(initialMessage.chat.id, initialMessage.message_id, undefined, message, { parse_mode: 'Markdown' });

        if (traceData.video) {
            const videoUrl = traceData.video;
            const tempFileName = `${uuidv4()}.mp4`;
            const videoStream = await axios({
                url: videoUrl,
                responseType: 'stream'
            });

            const videoPath = path.join(__dirname, tempFileName);
            videoStream.data.pipe(fs.createWriteStream(videoPath));

            await new Promise((resolve) => {
                videoStream.data.on('end', resolve);
            });

            await ctx.replyWithVideo({ source: videoPath });

            fs.unlinkSync(videoPath);
        }

    } catch (error) {
        console.error('حدث خطأ: \nتواصل مع : @liM7mod', error.message);
        await ctx.reply(`⚠️ حدث خطأ أثناء معالجة الملف: ${error.message}\nتواصل مع : @liM7mod`);
    } finally {
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

    if (ctx.session.messageToDelete) {
        await ctx.deleteMessage(ctx.session.messageToDelete);
        ctx.session.messageToDelete = null;
    }

    ctx.reply("🚫 تم إلغاء العملية.");
    ctx.session.processing = false;
    ctx.session.fileToProcess = null;
});

// التعامل مع الصور
bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
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

    if (document.mime_type === 'image/gif') {
        handleMedia(ctx, document);
    } else {
        ctx.reply("⚠️ الملف المرسل ليس صوره او فيديو.");
    }
});

// التعامل مع MP4
bot.on('video', async (ctx) => {
    const { video } = ctx.message;

    if (video.mime_type === 'video/mp4') {
        handleMedia(ctx, video);
    } else {
        ctx.reply("⚠️ الملف المرسل ليس صوره او فيديو.");
    }
});

// تنفيذ الأمر /usage
bot.command('info', (ctx) => {
    const infoMessage = `
📊 عدد مرات الاستخدام: ${usageCount}
⭐ التقييمات:
5 نجوم: ${ratings["5"]}
4 نجوم: ${ratings["4"]}
3 نجوم: ${ratings["3"]}
2 نجوم: ${ratings["2"]}
1 نجوم: ${ratings["1"]}\n\nالمطور : @LiM7mod\n\nقيمنا بـ :`;

    ctx.replyWithMarkdown(infoMessage, ratingButtons);
});

// تنفيذ التقييمات
bot.action(/rate_\d/, async (ctx) => {
    const userId = ctx.from.id;
    const newRating = ctx.match[0].split('_')[1];
    const currentRating = userRatings[userId];

    if (currentRating && currentRating !== newRating) {
        // إذا قيم المستخدم مسبقاً، قم بإزالة التقييم القديم
        ratings[currentRating]--;
        userRatings[userId] = newRating;
        ratings[newRating]++;
        await ctx.answerCbQuery(`تم تحديث تقييمك إلى ${newRating}⭐`);
    } else if (!currentRating) {
        // إذا لم يقيم المستخدم مسبقاً
        userRatings[userId] = newRating;
        ratings[newRating]++;
        await ctx.answerCbQuery(`شكراً لتقييمك بـ ${newRating}⭐`);
    } else {
        await ctx.answerCbQuery(`تقييمك بالفعل هو ${newRating}⭐`);
    }

    ctx.editMessageReplyMarkup();
    saveData(); // حفظ البيانات بعد كل تقييم
});

// بدء البوت
keepAlive();
bot.launch();
