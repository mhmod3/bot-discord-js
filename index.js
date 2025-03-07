const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
app.use(express.json());

const bot = new Telegraf('YOUR_BOT_TOKEN');
const WEBHOOK_URL = 'https://bot-discord-js-4xqg.onrender.com/webhook';

bot.telegram.setWebhook(WEBHOOK_URL);
app.post('/webhook', (req, res) => {
    bot.handleUpdate(req.body);
    res.send('ok');
});

bot.start((ctx) => ctx.reply('هااا ؟'));
let ongoingSearches = new Map();
let awaitingEpisodes = new Map();

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (awaitingEpisodes.has(ctx.chat.id)) {
        const animeId = awaitingEpisodes.get(ctx.chat.id);
        awaitingEpisodes.delete(ctx.chat.id);
        return fetchSelectedEpisodes(ctx, animeId, text);
    }
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
        const caption = `اسم الانمي : ${info.name}\n\n"${info.description}"\n\nعدد الحلقات: ${info.stats.episodes.sub}`;
        ctx.replyWithPhoto(info.poster, {
            caption,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('جيب جميع الحلقات', `all_${animeId}`)],
                [Markup.button.callback('جيب اخر حلقة نزلت', `last_${animeId}`)],
                [Markup.button.callback('جيب حلقات محددة', `select_${animeId}`)]
            ])
        });
    } catch (error) {
        ctx.reply('مشكله...');
    }
}

bot.action(/^select_(.+)/, (ctx) => {
    const animeId = ctx.match[1];
    awaitingEpisodes.set(ctx.chat.id, animeId);
    ctx.reply('اكتب رقم الحلقة أو نطاق الحلقات مثل 5-10');
});

async function fetchSelectedEpisodes(ctx, animeId, range) {
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/anime/${animeId}/episodes`);
        if (!res.data.success) return ctx.reply('مشكله...');
        const episodes = res.data.data.episodes;
        const [start, end] = range.split('-').map(num => parseInt(num.trim()));
        if (isNaN(start) || (end && isNaN(end))) return ctx.reply('صيغة غير صحيحة. استخدم 5-10 أو رقم واحد فقط.');
        const filteredEpisodes = episodes.filter(ep => ep.number >= start && (!end || ep.number <= end));
        if (filteredEpisodes.length === 0) return ctx.reply('ماكو حلقات بهالنطاق.');
        let links = [];
        for (let ep of filteredEpisodes) {
            const link = await fetchEpisodeLink(ep.episodeId);
            if (link) links.push(`الحلقة ${ep.number}: ${link}`);
        }
        const filename = path.join(__dirname, `${Date.now()}.txt`);
        fs.writeFileSync(filename, links.join('\n'));
        await ctx.replyWithDocument({ source: filename });
        fs.unlinkSync(filename);
    } catch (error) {
        ctx.reply('مشكلة');
    }
}

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
