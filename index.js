const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const levenshtein = require('fast-levenshtein');
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

let addAnimeState = {
    addingAnime: false,
    currentAnimeName: '',
    qualityFiles: []
};

function resetAddAnimeState() {
    addAnimeState.addingAnime = false;
    addAnimeState.currentAnimeName = '';
    addAnimeState.qualityFiles = [];
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

bot.command('animelist', (ctx) => {
    if (ctx.message.from.id.toString() !== OWNER_ID) {
        return ctx.reply('عذراً، هذا الأمر مخصص لمالك البوت فقط.');
    }
    ctx.replyWithDocument({ source: animeListFilePath, filename: 'animeList.json' });
});

bot.on('text', (ctx) => {
    const userId = ctx.from.id.toString();
    const action = userState[userId].action;
    const inputText = ctx.message.text.trim();

    if (action === 'search') {
        const query = inputText.toLowerCase();
        const matchedAnime = animeList.find(anime => anime.name.toLowerCase() === query);

        if (matchedAnime) {
            ctx.reply('الحلقات ستكون في الملف الذي سوف ينرسل لك عندما تختار الجوده (فقط قم بألنقر عليه)\n\nتأكد من تحميل برنامج "VLC" على جهازك\n\n\nأختر الجوده:',
                Markup.inlineKeyboard(
                    matchedAnime.qualities.map(quality =>
                        [Markup.button.callback(quality.quality, `select_quality_${matchedAnime.name}_${quality.quality}`)]
                    )
                )
            );
        } else {
            const similarAnimes = animeList
                .map(anime => ({
                    name: anime.name,
                    distance: levenshtein.get(query, anime.name.toLowerCase())
                }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 5);

            if (similarAnimes.length > 0) {
                ctx.reply(`لم يتم العثور على الانمي ، ولكن هنالك أسماء مشابهة :\n\n` +
                    similarAnimes.map(anime => anime.name).join('\n'),
                    Markup.inlineKeyboard([
                        Markup.button.callback('إرسال طلب لإضافة الأنمي', `request_add_anime_${query}`)
                    ])
                );
            } else {
                ctx.reply(`الأنمي ${query} غير موجود في القائمة.`, Markup.inlineKeyboard([
                    Markup.button.callback('إرسال طلب لإضافة هذا الأنمي', `request_add_anime_${query}`)
                ]));
            }
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
                [Markup.button.callback(`الجودة ضعيفة (${animeName})`, `report_reason_${animeName}_quality`)],
                [Markup.button.callback(`مشكلة في الترجمة (${animeName})`, `report_reason_${animeName}_translation`)],
                [Markup.button.callback(`مشكلة في الصوت (${animeName})`, `report_reason_${animeName}_sound`)],
                [Markup.button.callback(`مشاكل اخرى (حلقات لا تعمل) (${animeName})`, `report_reason_${animeName}_other`)]
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

bot.action(/^select_quality_(.+)_(.+)$/, async (ctx) => {
    const animeName = ctx.match[1];
    const quality = ctx.match[2];
    const anime = animeList.find(anime => anime.name.toLowerCase() === animeName.toLowerCase());

    if (!anime) {
        return ctx.reply('الأنمي غير موجود في القائمة.');
    }

    const qualityData = anime.qualities.find(q => q.quality === quality);

    if (qualityData) {
        // إنشاء ملف HTML وتحديد مساره
        const htmlFilePath = createHtmlFile(animeName, quality, qualityData.links);

        // إرسال الملف مع تعليق
        await ctx.replyWithDocument({
            source: htmlFilePath,
            caption: 'يرجى تحميل برنامج VLC لمشاهدة الحلقات.'
        });

        // حذف الملف بعد الإرسال
        fs.unlinkSync(htmlFilePath);
    } else {
        ctx.reply('حدث خطأ في اختيار الجودة.');
    }
});

bot.action(/^request_add_anime_(.+)$/, (ctx) => {
    const requestedAnime = ctx.match[1];
    ctx.telegram.sendMessage(OWNER_ID, `طلب إضافة أنمي جديد: ${requestedAnime}`);
    ctx.reply('تم إرسال طلبك لإضافة الأنمي.');
});

bot.action(/^report_reason_(.+)_(.+)$/, (ctx) => {
    const animeName = ctx.match[1];
    const reason = ctx.match[2];

    const reportMessage = `إبلاغ جديد:
    الأنمي: ${animeName}
    السبب: ${reason}`;

    ctx.telegram.sendMessage(OWNER_ID, reportMessage);
    ctx.reply('تم إرسال الإبلاغ. شكرًا لك.');
});

function createHtmlFile(animeName, quality, links) {
    const randomName = crypto.randomBytes(5).toString('hex');
    const htmlFilePath = `${randomName}.html`;

    const htmlContent = `<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${animeName} - ${quality}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #000;
            color: #fff;
            text-align: center;
            margin: 0;
            padding: 0;
        }
        .top-button {
            display: block;
            width: 80%;
            margin: 10px auto;
            padding: 10px;
            color: #fff;
            background-color: #20b2aa;
            border: none;
            border-radius: 5px;
            text-decoration: none;
            font-size: 18px;
            transition: background-color 0.3s;
        }
        .top-button:hover {
            background-color: #2e8b57;
        }
        .container {
            padding: 20px;
        }
        h1 {
            color: #1e90ff;
        }
        .button {
            display: block;
            width: 80%;
            margin: 10px auto;
            padding: 10px;
            color: #fff;
            background-color: #1e90ff;
            border: none;
            border-radius: 5px;
            text-decoration: none;
            font-size: 18px;
            transition: background-color 0.3s;
            position: relative;
        }
        .button:hover {
            background-color: #4682b4;
        }
        .button.watched {
            background-color: #32cd32;
            color: #fff;
        }
        .checkmark {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 18px;
            display: none;
        }
        .button.watched .checkmark {
            display: inline;
        }
    </style>
    <script>
        function markAsWatched(button) {
            button.classList.toggle('watched');
        }
    </script>
</head>
<body>
    <a href="https://t.me/LiAnimeBot" class="top-button" target="_blank">By : LiAnimebot</a>
    <div class="container">
        <h1>${animeName} - ${quality}</h1>
        ${links.map((link, index) => `<a href="vlc://${link}" class="button" target="_blank" onclick="markAsWatched(this)">الحلقة ${index + 1}<span class="checkmark">✅</span></a>`).join('\n')}
        <a href="https://telegra.ph/تنبيه-حقوق-الطبع-والنشر-08-05" class="button" target="_blank">DMCA</a>
    </div>
</body>
</html>`;

    fs.writeFileSync(htmlFilePath, htmlContent);
    return htmlFilePath;
}
keepAlive();
bot.launch();
console.log('Bot is running...');
