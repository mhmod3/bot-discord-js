const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const keepAlive = require('./keep_alive.js');


const BOT_TOKEN = process.env['token'];
const OWNER_ID = process.env['id'];
const animeListFilePath = 'animeList.json';

const bot = new Telegraf(BOT_TOKEN);

let animeList = [];
if (!fs.existsSync(animeListFilePath)) {
    fs.writeFileSync(animeListFilePath, JSON.stringify([]));
    console.log(`File ${animeListFilePath} created.`);
} else {
    animeList = JSON.parse(fs.readFileSync(animeListFilePath));
    console.log(`File ${animeListFilePath} loaded.`);
}

let userState = {};

function resetUserState(userId) {
    userState[userId] = {
        action: null,
        data: {}
    };
}

bot.use((ctx, next) => {
    const userId = ctx.from.id.toString();
    if (!userState[userId]) {
        resetUserState(userId);
    }
    return next();
});

bot.command('search', (ctx) => {
    const userId = ctx.from.id.toString();
    userState[userId].action = 'search';
    ctx.reply('يرجى كتابة اسم الأنمي للبحث.');
});

bot.command('delete', (ctx) => {
    if (ctx.message.from.id.toString() !== OWNER_ID) {
        return ctx.reply('عذراً، هذا الأمر مخصص لمالك البوت فقط.');
    }
    const userId = ctx.from.id.toString();
    userState[userId].action = 'delete';
    ctx.reply('يرجى كتابة اسم الأنمي للحذف.');
});

bot.command('add', (ctx) => {
    if (ctx.message.from.id.toString() !== OWNER_ID) {
        return ctx.reply('عذراً، هذا الأمر مخصص لمالك البوت فقط.');
    }
    const userId = ctx.from.id.toString();
    userState[userId].action = 'add';
    ctx.reply('يرجى كتابة اسم الأنمي للإضافة.');
});

bot.command('report', (ctx) => {
    const userId = ctx.from.id.toString();
    userState[userId].action = 'report';
    ctx.reply('يرجى كتابة اسم الأنمي للإبلاغ.');
});

bot.on('text', (ctx) => {
    const userId = ctx.from.id.toString();
    const action = userState[userId].action;
    const inputText = ctx.message.text.trim();

    if (action === 'search') {
        const query = inputText;
        const matchedAnime = animeList.find(anime => anime.name.toLowerCase() === query.toLowerCase());
        if (matchedAnime) {
            ctx.reply('اختر الجودة:\n\nDMAC: https://telegra.ph/تنبيه-حقوق-الطبع-والنشر-08-05',
                Markup.inlineKeyboard(
                    matchedAnime.qualities.map(quality =>
                        [Markup.button.callback(quality.quality, `select_quality_${matchedAnime.name}_${quality.quality}`)]
                    )
                )
            );
        } else {
            ctx.reply(`الأنمي ${query} غير موجود في القائمة.`, Markup.inlineKeyboard([
                Markup.button.callback('إرسال طلب لإضافة هذا الأنمي', `request_add_anime_${query}`)
            ]));
        }
        resetUserState(userId);
    } else if (action === 'delete') {
        const animeName = inputText;
        const matchedAnimeIndex = animeList.findIndex(anime => anime.name.toLowerCase() === animeName.toLowerCase());
        if (matchedAnimeIndex === -1) {
            return ctx.reply('الأنمي غير موجود في القائمة.');
        }
        animeList.splice(matchedAnimeIndex, 1);
        fs.writeFileSync(animeListFilePath, JSON.stringify(animeList));
        ctx.reply(`تم حذف الأنمي ${animeName} من القائمة بنجاح.`);
        resetUserState(userId);
    } else if (action === 'add') {
        resetAddAnimeState();
        addAnimeState.addingAnime = true;
        addAnimeState.currentAnimeName = inputText;
        ctx.reply('يرجى إرسال ملفات الجودات (مثل 1080.txt, 720.txt, 480.txt). بعد الانتهاء، اضغط على زر "انهاء".',
            Markup.inlineKeyboard([Markup.button.callback('انهاء', 'finish_add')]));
        resetUserState(userId);
    } else if (action === 'report') {
        const animeName = inputText;
        ctx.reply('اختر سبب الإبلاغ:',
            Markup.inlineKeyboard([
                [Markup.button.callback('الجودة ضعيفة', `report_reason_${animeName}_quality`)],
                [Markup.button.callback('مشكلة في الترجمة', `report_reason_${animeName}_translation`)],
                [Markup.button.callback('مشكلة في الصوت', `report_reason_${animeName}_sound`)],
                [Markup.button.callback('مشاكل اخرى (حلقات لا يعملن)', `report_reason_${animeName}_other`)]
            ])
        );
        resetUserState(userId);
    }
});

bot.on('document', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!addAnimeState.addingAnime) return;

    const fileId = ctx.message.document.file_id;
    const fileName = ctx.message.document.file_name.split('.')[0];
    const fileUrl = await ctx.telegram.getFileLink(fileId);

    try {
        const response = await axios.get(fileUrl.href);
        const episodeLinks = response.data.split('\n').filter(link => link.trim() !== '');
        addAnimeState.qualityFiles.push({ quality: fileName, links: episodeLinks });
        ctx.reply(`تم إضافة الجودة ${fileName}. يمكنك إرسال ملف آخر أو الضغط على "انهاء".`);
    } catch (error) {
        console.error('Error fetching file:', error);
        ctx.reply('حدث خطأ أثناء تحميل الملف.');
    }
});

bot.action('finish_add', (ctx) => {
    if (!addAnimeState.addingAnime) return;

    if (addAnimeState.currentAnimeName && addAnimeState.qualityFiles.length > 0) {
        animeList.push({ name: addAnimeState.currentAnimeName, qualities: addAnimeState.qualityFiles });
        fs.writeFileSync(animeListFilePath, JSON.stringify(animeList));
        ctx.reply(`تم إضافة الأنمي ${addAnimeState.currentAnimeName} بنجاح.`);
        resetAddAnimeState();
    } else {
        ctx.reply('يرجى إرسال اسم الأنمي وملفات الجودات قبل إنهاء.');
    }
});

bot.action(/^select_quality_(.+)_(.+)$/, (ctx) => {
    const animeName = ctx.match[1];
    const quality = ctx.match[2];
    const anime = animeList.find(anime => anime.name.toLowerCase() === animeName.toLowerCase());

    if (!anime) {
        return ctx.reply('الأنمي غير موجود في القائمة.');
    }

    const qualityData = anime.qualities.find(q => q.quality === quality);

    if (qualityData) {
        ctx.reply('اختر الحلقة:\n\nيرجى أخذ الرابط وتشغيله في احدى مشغلات الفيديو لتجربة افضل.',
            Markup.inlineKeyboard(
                qualityData.links.map((link, index) =>
                    [Markup.button.url(`الحلقة ${index + 1}`, link)]
                )
            )
        );
    } else {
        ctx.reply('حدث خطأ في اختيار الجودة.');
    }
});

bot.action(/^report_reason_(.+)_(.+)$/, (ctx) => {
    const animeName = ctx.match[1];
    const reason = ctx.match[2];
    const reasonText = {
        quality: 'الجودة ضعيفة',
        translation: 'مشكلة في الترجمة',
        sound: 'مشكلة في الصوت',
        other: 'مشاكل اخرى'
    }[reason];

    if (!reasonText) {
        return ctx.reply('سبب الإبلاغ غير صالح.');
    }

    ctx.telegram.sendMessage(OWNER_ID, `بلاغ عن مشكلة بخصوص الأنمي: ${animeName}\nالسبب: ${reasonText}`);
    ctx.reply('تم إرسال البلاغ بنجاح.');
});

bot.action(/^request_add_anime_(.+)$/, (ctx) => {
    const animeName = ctx.match[1];
    ctx.telegram.sendMessage(OWNER_ID, `طلب لإضافة الأنمي: ${animeName}`);
    ctx.reply('تم إرسال طلب لإضافة الأنمي بنجاح.');
});

function resetAddAnimeState() {
    addAnimeState = {
        addingAnime: false,
        currentAnimeName: '',
        qualityFiles: []
    };
}
keepAlive();
bot.launch().then(() => {
    console.log('Bot is running...');
});
