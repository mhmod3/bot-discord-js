const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const keepAlive = require('./keep_alive.js');


const MAL_API_KEY = process.env['MAL'];
const OWNER_ID = process.env['id'];
const bot = new Telegraf(process.env['token']);

let animeList = [];

if (fs.existsSync('animeList.json')) {
    animeList = JSON.parse(fs.readFileSync('animeList.json'));
}

let addingAnime = false;
let editingAnime = false;
let currentAnimeName = '';
let qualityFiles = [];
let currentEditIndex = null;
let waitingForName = false;
let waitingForLinks = false;
let qualityToEdit = '';



bot.command('edit', (ctx) => {
    try {
        if (ctx.message.from.id.toString() !== OWNER_ID) {
            return ctx.reply('عذراً، هذا الأمر مخصص لمالك البوت فقط.');
        }

        if (editingAnime) {
            return ctx.reply('أنت بالفعل في وضع تعديل. يرجى إكمال العملية الحالية أولاً.');
        }

        const animeName = ctx.message.text.split(' ').slice(1).join(' ');
        if (!animeName) {
            return ctx.reply('يرجى تحديد اسم الأنمي للتعديل.\nمثال: /edit Naruto');
        }

        const matchedAnimeIndex = animeList.findIndex(anime => anime.name.toLowerCase().includes(animeName.toLowerCase()));
        if (matchedAnimeIndex === -1) {
            return ctx.reply('الأنمي غير موجود في القائمة.');
        }

        currentEditIndex = matchedAnimeIndex;
        editingAnime = true;
        const anime = animeList[matchedAnimeIndex];

        ctx.reply('اختر ما تريد تعديله:',
            Markup.inlineKeyboard([
                [Markup.button.callback('تعديل اسم الأنمي', 'edit_name')],
                [Markup.button.callback('تعديل روابط الجودات', 'edit_quality')],
                [Markup.button.callback('إلغاء', 'cancel_edit')]
            ])
        );
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء تنفيذ الأمر.');
    }
});

bot.action('edit_name', (ctx) => {
    try {
        if (!editingAnime || currentEditIndex === null) return;

        waitingForName = true;
        ctx.reply('أرسل الاسم الجديد للأنمي:');
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء تعديل اسم الأنمي.');
    }
});

bot.on('text', (ctx) => {
    try {
        if (waitingForName) {
            if (ctx.message.from.id.toString() !== OWNER_ID) return;

            animeList[currentEditIndex].name = ctx.message.text;
            fs.writeFileSync('animeList.json', JSON.stringify(animeList));
            ctx.reply('تم تعديل اسم الأنمي بنجاح.');
            waitingForName = false;
            editingAnime = false;
            currentEditIndex = null;
        }

        if (waitingForLinks) {
            if (ctx.message.from.id.toString() !== OWNER_ID) return;

            const links = ctx.message.text.split('\n').filter(link => link.trim() !== '');
            const qualityData = animeList[currentEditIndex].qualities.find(q => q.quality === qualityToEdit);
            if (qualityData) {
                qualityData.links = links;
                fs.writeFileSync('animeList.json', JSON.stringify(animeList));
                ctx.reply('تم تعديل روابط الجوده بنجاح.');
            }
            waitingForLinks = false;
            editingAnime = false;
            currentEditIndex = null;
        }
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء التعامل مع النص.');
    }
});

bot.action('edit_quality', (ctx) => {
    try {
        if (!editingAnime || currentEditIndex === null) return;

        ctx.reply('اختر الجوده لتعديل روابطها:',
            Markup.inlineKeyboard(
                animeList[currentEditIndex].qualities.map(quality => 
                    [Markup.button.callback(quality.quality, `edit_links_${quality.quality}`)]
                ).concat([
                    [Markup.button.callback('إلغاء', 'cancel_edit')]
                ])
            )
        );
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء تعديل الروابط.');
    }
});

bot.action(/^edit_links_(.+)$/, (ctx) => {
    try {
        if (!editingAnime || currentEditIndex === null) return;

        qualityToEdit = ctx.match[1];
        waitingForLinks = true;
        ctx.reply('أرسل روابط الجوده الجديدة (سطر واحد لكل رابط). بعد الانتهاء، اضغط على زر "انهاء".',
            Markup.inlineKeyboard([Markup.button.callback('انهاء', 'finish_edit_links')])
        );
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء تعديل روابط الجوده.');
    }
});

bot.action('finish_edit_links', (ctx) => {
    try {
        if (!editingAnime || currentEditIndex === null) return;

        ctx.reply('تم الانتهاء من تعديل الروابط.');
        waitingForLinks = false;
        editingAnime = false;
        currentEditIndex = null;
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء إنهاء تعديل الروابط.');
    }
});

bot.action('cancel_edit', (ctx) => {
    try {
        editingAnime = false;
        currentEditIndex = null;
        ctx.reply('تم إلغاء عملية التعديل.');
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء إلغاء التعديل.');
    }
});







bot.command('d', (ctx) => {
    try {
        if (ctx.message.from.id.toString() !== OWNER_ID) {
            return ctx.reply('عذراً، هذا الأمر مخصص لمالك البوت فقط.');
        }
        const animeName = ctx.message.text.split(' ').slice(1).join(' ');
        if (!animeName) {
            return ctx.reply('يرجى تحديد اسم الأنمي للحذف.');
        }

        const matchedAnimeIndex = animeList.findIndex(anime => anime.name.toLowerCase().includes(animeName.toLowerCase()));
        if (matchedAnimeIndex === -1) {
            return ctx.reply('الأنمي غير موجود في القائمة.');
        }

        animeList.splice(matchedAnimeIndex, 1);
        fs.writeFileSync('animeList.json', JSON.stringify(animeList));

        ctx.reply(`تم حذف الأنمي ${animeName} من القائمة بنجاح.`);
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء تنفيذ الأمر.');
    }
});

bot.command('add', async (ctx) => {
    try {
        if (ctx.message.from.id.toString() !== OWNER_ID) {
            return ctx.reply('عذراً، هذا الأمر مخصص لمالك البوت فقط.');
        }
        const animeName = ctx.message.text.split(' ').slice(1).join(' ');
        if (!animeName) {
            return ctx.reply('يرجى تحديد اسم الأنمي.');
        }

        addingAnime = true;
        currentAnimeName = animeName;
        qualityFiles = [];

        ctx.reply('يرجى إرسال ملفات الجودات (مثل 1080.txt, 720.txt, 480.txt). بعد الانتهاء، اضغط على زر "انهاء".',
            Markup.inlineKeyboard([Markup.button.callback('انهاء', 'finish_add')]));
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء تنفيذ الأمر.');
    }
});

bot.on('document', async (ctx) => {
    try {
        if (!addingAnime && !editingAnime) return;

        const fileId = ctx.message.document.file_id;
        const fileName = ctx.message.document.file_name.split('.')[0]; // جلب اسم الجوده بدون الامتداد
        const fileUrl = await ctx.telegram.getFileLink(fileId);

        axios.get(fileUrl.href)
            .then(response => {
                const episodeLinks = response.data.split('\n').filter(link => link.trim() !== '');
                qualityFiles.push({ quality: fileName, links: episodeLinks });
                ctx.reply(`تم إضافة الجوده ${fileName}. يمكنك إرسال ملف آخر أو الضغط على "انهاء".`);
            })
            .catch(() => {
                ctx.reply('حدث خطأ أثناء تحميل ملف الروابط.');
            });
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء تحميل ملف الروابط.');
    }
});

bot.action('finish_add', async (ctx) => {
    try {
        if (!addingAnime) return;

        const promises = qualityFiles.flatMap(file => file.links.map(link => axios.head(link).catch(() => null)));

        Promise.all(promises).then(results => {
            const validLinks = qualityFiles.map(file => ({
                quality: file.quality,
                links: file.links.filter((_, index) => results[index] !== null)
            }));

            if (validLinks.every(file => file.links.length === 0)) {
                return ctx.reply('جميع الروابط غير صالحة.');
            }

            const animeData = { name: currentAnimeName, qualities: validLinks };
            animeList.push(animeData);
            fs.writeFileSync('animeList.json', JSON.stringify(animeList));

            ctx.reply(`تم إضافة الأنمي ${currentAnimeName} بنجاح.`);
            
            addingAnime = false;
            currentAnimeName = '';
            qualityFiles = [];
        });
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء إنهاء إضافة الأنمي.');
    }
});

bot.command('s', async (ctx) => {
    try {
        const animeName = ctx.message.text.split(' ').slice(1).join(' ');
        if (!animeName) {
            return ctx.reply('يرجى تحديد اسم الأنمي للبحث\nمثال "/s Shingeki no Kyojin"');
        }

        const matchedAnime = animeList.find(anime => anime.name.toLowerCase().includes(animeName.toLowerCase()));
        if (!matchedAnime) {
            return ctx.reply('الأنمي غير موجود في القائمة.', 
                Markup.inlineKeyboard([
                    [Markup.button.callback('طلب الأنمي', `request_anime_${animeName}`)]
                ])
            );
        }

        axios.get(`https://api.myanimelist.net/v2/anime?q=${matchedAnime.name}&limit=1`, {
            headers: {
                'X-MAL-CLIENT-ID': MAL_API_KEY
            }
        })
        .then(response => {
            if (response.data.data.length === 0) {
                return ctx.reply('لم يتم العثور على معلومات الأنمي.');
            }
            const animeInfo = response.data.data[0].node;
            const animeDetails = `
الاسم: ${animeInfo.title || 'غير متوفر'}
مستمر: ${animeInfo.status === 'currently_airing' ? 'مستمر' : 'غير مستمر'}
رابط: [اضغط هنا](https://myanimelist.net/anime/${animeInfo.id})\n
DMCA: https://telegra.ph/تنبيه-حقوق-الطبع-والنشر-08-05
            `;

            ctx.replyWithPhoto({ url: animeInfo.main_picture.medium }, { caption: animeDetails, parse_mode: 'Markdown' })
                .then(() => {
                    const qualityButtons = matchedAnime.qualities.map(quality => Markup.button.callback(quality.quality, `quality_${quality.quality}_${matchedAnime.name}`));

                    const markup = Markup.inlineKeyboard([
                        ...qualityButtons.map(button => [button]),
                        [Markup.button.callback('إبلاغ عن مشكلة', `report_${matchedAnime.name}`)]
                    ]);

                    ctx.reply('اختر الجوده:', markup);
                });
        })
        .catch(error => {
            console.error(error);
            ctx.reply('حدث خطأ أثناء جلب معلومات الأنمي.');
        });
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء البحث عن الأنمي.');
    }
});

bot.action(/^report_(.+)$/, (ctx) => {
    try {
        const animeName = ctx.match[1];
        ctx.telegram.sendMessage(OWNER_ID, `تقرير جديد: الأنمي ${animeName}\nالمستخدم: @${ctx.from.username || ctx.from.id}`);
        ctx.reply('تم إرسال أبلاغك إلى المالك. شكراً لك.');
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء إرسال التقرير.');
    }
});

bot.action(/^quality_(.+)_(.+)$/, (ctx) => {
    try {
        const quality = ctx.match[1];
        const animeName = ctx.match[2];
        const matchedAnime = animeList.find(anime => anime.name === animeName);
        if (!matchedAnime) return;

        const selectedQuality = matchedAnime.qualities.find(q => q.quality === quality);
        if (!selectedQuality) return;

        const episodeButtons = selectedQuality.links.map((link, index) => Markup.button.url(`حلقة ${index + 1}`, link));

        const markup = Markup.inlineKeyboard(episodeButtons.map(button => [button]));

        ctx.reply('اختر الحلقه:\n\nيمكنك نسخ رابط الحلقة ووضعه في أي مشغل فيديو وسوف تعمل الحلقة\n\n(لا تعمل هذه الطريقة دائما)', markup);
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء عرض الحلقات.');
    }
});

bot.action(/^request_anime_(.+)$/, (ctx) => {
    try {
        const animeName = ctx.match[1];
        ctx.telegram.sendMessage(OWNER_ID, `طلب أنمي جديد: ${animeName}\nالمستخدم: @${ctx.from.username || ctx.from.id}`);
        ctx.reply('تم إرسال طلبك إلى المالك. شكراً لك.');
    } catch (error) {
        console.error(error);
        ctx.reply('حدث خطأ أثناء إرسال الطلب.');
    }
});
keepAlive();
bot.launch().then(() => console.log('Bot is running...'));
