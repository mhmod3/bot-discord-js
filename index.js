const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
app.use(express.json());

const bot = new Telegraf('7524565250:AAGwInP2htEWwrXv9dxgIFwZb11xpiRQJE4');

// إعداد Webhook
const WEBHOOK_URL = 'https://bot-discord-js-4xqg.onrender.com/webhook';
bot.telegram.setWebhook(WEBHOOK_URL);

app.post('/webhook', (req, res) => {
    bot.handleUpdate(req.body);
    res.send('ok');
});

bot.start((ctx) => ctx.reply('هااا ؟'));

let ongoingSearches = new Map();
let episodeLinksMap = new Map();

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
        if (!match) return ctx.reply('الرابط هذه ما يشتغل');
        fetchAnimeDetails(ctx, match[1]);
    } else {
        searchAnime(ctx, text);
    }
});

async function searchAnime(ctx, query) {
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/search?q=${query}&page=1`);
        if (!res.data.success || res.data.data.animes.length === 0) return ctx.reply('صالي ساعة ادور ماكو شيء.');

        let message = 'اختر رقم الانمي:\n';
        res.data.data.animes.forEach((anime, index) => {
            message += `${index + 1}. ${anime.name}\n`;
        });

        ongoingSearches.set(ctx.chat.id, res.data.data.animes);
        ctx.reply(message);
    } catch (error) {
        ctx.reply('مشكله...');
    }
}

async function fetchAnimeDetails(ctx, animeId) {
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/anime/${animeId}`);
        if (!res.data.success) return ctx.reply('ما كدرت اجيب تفاصيل الانمي جيبها لنفسك');

        const info = res.data.data.anime.info;
        let truncatedDescription = truncateText(info.description, 900);

        let caption = `اسم الانمي : ${info.name}\n\n"${truncatedDescription}"\n\nعدد الحلقات: ${info.stats.episodes.sub}`;

        if (caption.length > 1024) {
            caption = caption.substring(0, 1021) + '...';
        }

        ctx.replyWithPhoto(info.poster, {
            caption,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('جيب جميع الحلقات', `all_${animeId}`)],
                [Markup.button.callback('جيب اخر حلقة نزلت', `last_${animeId}`)]
            ])
        });
    } catch (error) {
        ctx.reply('مشكله...');
    }
}

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

bot.action(/^all_(.+)/, async (ctx) => {
    const animeId = ctx.match[1];
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/anime/${animeId}/episodes`);
        if (!res.data.success) return ctx.reply('مشكله...');

        const episodeIds = res.data.data.episodes.map(ep => ep.episodeId);
        let links = [];
        let messageId = await ctx.reply('جاري تحميل الحلقات 0/' + episodeIds.length);

        for (let i = 0; i < episodeIds.length; i++) {
            const link = await fetchEpisodeLink(episodeIds[i]);
            if (link) links.push(link);
            await ctx.telegram.editMessageText(ctx.chat.id, messageId.message_id, null, `جاري تحميل الحلقات ${i + 1}/${episodeIds.length}`);
        }

        const filename = path.join(__dirname, `${Date.now()}.txt`);
        fs.writeFileSync(filename, links.join('\n'));
        await ctx.replyWithDocument({ source: filename });

        episodeLinksMap.set(ctx.chat.id, links);
        fs.unlinkSync(filename);

        await ctx.reply('اختر الجودة:', Markup.inlineKeyboard([
            [Markup.button.callback('1080p', 'quality_1080p')],
            [Markup.button.callback('720p', 'quality_720p')],
            [Markup.button.callback('480p', 'quality_480p')]
        ]));
    } catch (error) {
        ctx.reply('مشكلة');
    }
});

bot.action(/^quality_(\d+p)$/, async (ctx) => {
    const quality = ctx.match[1];
    const chatId = ctx.chat.id;

    if (!episodeLinksMap.has(chatId)) {
        return ctx.reply('المعذرة، لا يوجد بيانات للروابط.');
    }

    let replacement = {
        '1080p': 'index-f1-v1-a1.m3u8',
        '720p': 'index-f2-v1-a1.m3u8',
        '480p': 'index-f3-v1-a1.m3u8'
    }[quality];

    const modifiedLinks = episodeLinksMap.get(chatId).map(link => link.replace('master.m3u8', replacement));

    const filename = path.join(__dirname, `${Date.now()}.txt`);
    fs.writeFileSync(filename, modifiedLinks.join('\n'));
    await ctx.replyWithDocument({ source: filename });

    fs.unlinkSync(filename);
    episodeLinksMap.delete(chatId);
});

bot.action(/^last_(.+)/, async (ctx) => {
    const animeId = ctx.match[1];
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/anime/${animeId}/episodes`);
        if (!res.data.success) return ctx.reply('مشكله...');

        const lastEp = res.data.data.episodes[res.data.data.episodes.length - 1];
        const link = await fetchEpisodeLink(lastEp.episodeId);
        if (link) ctx.reply(`رابط الحلقة (${lastEp.number}): ${link}`);
    } catch (error) {
        ctx.reply('مشكله...');
    }
});

async function fetchEpisodeLink(episodeId) {
    const servers = ['hd-2', 'hd-1'];
    const categories = ['sub', 'raw'];

    for (let category of categories) {
        for (let server of servers) {
            try {
                const link = await tryFetchingLink(episodeId, server, category);
                if (link) return link;
            } catch (error) {
                console.error(`Error fetching ${category} link for server ${server}:`, error);
            }
        }
    }
    return null;
}

async function tryFetchingLink(episodeId, server, category) {
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/episode/sources?animeEpisodeId=${episodeId}&server=${server}&category=${category}`);
        if (res.data.success && res.data.data.sources.length > 0) {
            return res.data.data.sources[0].url;
        }
    } catch (error) {
        console.error(`Error fetching ${category} link for server ${server}:`, error);
    }
    return null;
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server is running on ${WEBHOOK_URL} (Port: ${port})`);
});
