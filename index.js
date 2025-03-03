const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const express = require('express');

// إعداد express
const app = express();
app.use(express.json()); // معالجة JSON باستخدام express مباشرة

const bot = new Telegraf('7524565250:AAGwInP2htEWwrXv9dxgIFwZb11xpiRQJE4');

// إعداد Webhook هنا مع رابط render
const WEBHOOK_URL = 'https://bot-discord-js-4xqg.onrender.com/webhook';

// تسجيل Webhook للبوت
bot.telegram.setWebhook(WEBHOOK_URL);

// هذا الجزء لإدارة الرسائل الواردة من Webhook
app.post('/webhook', (req, res) => {
    const update = req.body;
    bot.handleUpdate(update);
    res.send('ok');
});

// الاستجابة لبدء المحادثة
bot.start((ctx) => ctx.reply('مرحبا! ارسل اسم الأنمي أو رابط من hianime.'));

// المتابعة كما هي في الكود الأساسي
let ongoingSearches = new Map();

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    
    if (ongoingSearches.has(ctx.chat.id)) {
        const searchResults = ongoingSearches.get(ctx.chat.id);
        const index = parseInt(text) - 1;
        
        if (!isNaN(index) && index >= 0 && index < searchResults.length) {
            ongoingSearches.delete(ctx.chat.id);
            return fetchAnimeDetails(ctx, searchResults[index].id);
        }
    }
    
    if (text.startsWith('https://hianime.to/')) {
        const match = text.match(/(?:watch\/)?([\w\-]+-\d+)\??/);
        if (!match) return ctx.reply('الرابط غير صالح.');
        fetchAnimeDetails(ctx, match[1]);
    } else {
        searchAnime(ctx, text);
    }
});

async function searchAnime(ctx, query) {
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/search?q=${query}&page=1`);
        if (!res.data.success || res.data.data.animes.length === 0) return ctx.reply('لم يتم العثور على نتائج.');
        
        let message = 'اختر رقم الأنمي:\n';
        res.data.data.animes.forEach((anime, index) => {
            message += `${index + 1}. ${anime.name}\n`;
        });
        
        ongoingSearches.set(ctx.chat.id, res.data.data.animes);
        ctx.reply(message);
    } catch (error) {
        ctx.reply('حدث خطأ أثناء البحث.');
    }
}

async function fetchAnimeDetails(ctx, animeId) {
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/anime/${animeId}`);
        if (!res.data.success) return ctx.reply('تعذر جلب تفاصيل الأنمي.');
        
        const info = res.data.data.anime.info;
        const truncatedDescription = truncateText(info.description, 950);
        const caption = `${info.name}\n\n"${truncatedDescription}"\n\nعدد الحلقات: ${info.stats.episodes.sub}`;
        
        ctx.replyWithPhoto(info.poster, {
            caption,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('جلب جميع الحلقات', `all_${animeId}`)],
                [Markup.button.callback('جلب أخر حلقة', `last_${animeId}`)]
            ])
        });
    } catch (error) {
        ctx.reply('حدث خطأ أثناء جلب تفاصيل الأنمي.');
    }
}

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

bot.action(/^all_(.+)/, async (ctx) => {
    const animeId = ctx.match[1];
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/anime/${animeId}/episodes`);
        if (!res.data.success) return ctx.reply('تعذر جلب الحلقات.');
        
        const episodeIds = res.data.data.episodes.map(ep => ep.episodeId);
        let links = [];
        
        for (let epId of episodeIds) {
            const link = await fetchEpisodeLink(epId);
            if (link) links.push(link);
        }
        
        const filename = path.join(__dirname, `${Date.now()}.txt`);
        fs.writeFileSync(filename, links.join('\n'));
        await ctx.replyWithDocument({ source: filename });
        fs.unlinkSync(filename);
    } catch (error) {
        ctx.reply('حدث خطأ أثناء جلب جميع الحلقات.');
    }
});

bot.action(/^last_(.+)/, async (ctx) => {
    const animeId = ctx.match[1];
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/anime/${animeId}/episodes`);
        if (!res.data.success) return ctx.reply('تعذر جلب الحلقات.');
        
        const lastEp = res.data.data.episodes[res.data.data.episodes.length - 1];
        const link = await fetchEpisodeLink(lastEp.episodeId);
        if (link) ctx.reply(`رابط الحلقة (${lastEp.number}): ${link}`);
    } catch (error) {
        ctx.reply('حدث خطأ أثناء جلب أخر حلقة.');
    }
});

async function fetchEpisodeLink(episodeId) {
    const servers = ['hd-2', 'hd-1'];
    for (let server of servers) {
        try {
            const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/episode/sources?animeEpisodeId=${episodeId}&server=${server}&category=sub`);
            if (res.data.success && res.data.data.sources.length > 0) {
                return res.data.data.sources[0].url;
            }
        } catch (error) {}
    }
    return null;
}

// استخدام البورت من البيئة أو 4000 بشكل افتراضي
const port = process.env.PORT || 4000;

// بدء تشغيل السيرفر على البورت المحدد
app.listen(port, () => {
    console.log(`Server is running on https://bot-discord-js-4xqg.onrender.com (Port: ${port})`);
});
