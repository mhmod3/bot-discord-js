const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
app.use(express.json());

const bot = new Telegraf('7524565250:AAGwInP2htEWwrXv9dxgIFwZb11xpiRQJE4');
const WEBHOOK_URL = 'https://bot-discord-js-4xqg.onrender.com/webhook';

bot.telegram.setWebhook(WEBHOOK_URL);

app.post('/webhook', (req, res) => {
    bot.handleUpdate(req.body);
    res.send('ok');
});

let ongoingSearches = new Map();
let ongoingEpisodeSelection = new Map();

bot.start((ctx) => ctx.reply('هااا ؟'));

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    const chatId = ctx.chat.id;
    
    if (ongoingEpisodeSelection.has(chatId)) {
        const { animeId } = ongoingEpisodeSelection.get(chatId);
        ongoingEpisodeSelection.delete(chatId);
        return fetchSelectedEpisodes(ctx, animeId, text);
    }
    
    if (ongoingSearches.has(chatId)) {
        const searchResults = ongoingSearches.get(chatId);
        const index = parseInt(text) - 1;
        
        if (!isNaN(index) && index >= 0 && index < searchResults.length) {
            ongoingSearches.delete(chatId);
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
        const truncatedDescription = truncateText(info.description, 800);
        const caption = `اسم الانمي : ${info.name}\n\n"${truncatedDescription}"\n\nعدد الحلقات: ${info.stats.episodes.sub}`;
        
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
    ongoingEpisodeSelection.set(ctx.chat.id, { animeId });
    ctx.reply('اكتب الحلقات التي تريدها بهذا الشكل: 5-10 أو 3,7,9');
});

async function fetchSelectedEpisodes(ctx, animeId, episodeRange) {
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/anime/${animeId}/episodes`);
        if (!res.data.success) return ctx.reply('مشكله...');
        
        const episodes = res.data.data.episodes;
        const selectedEpisodes = parseEpisodeSelection(episodes, episodeRange);
        
        let links = [];
        for (let ep of selectedEpisodes) {
            const link = await fetchEpisodeLink(ep.episodeId);
            if (link) links.push(`حلقة ${ep.number}: ${link}`);
        }
        
        if (links.length === 0) return ctx.reply('ما لكيت حلقات بهذي الارقام.');
        ctx.reply(links.join('\n'));
    } catch (error) {
        ctx.reply('مشكله...');
    }
}

function parseEpisodeSelection(episodes, input) {
    let selectedEpisodes = [];
    const parts = input.split(',');
    
    for (let part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
                selectedEpisodes.push(...episodes.filter(ep => ep.number >= start && ep.number <= end));
            }
        } else {
            const num = Number(part);
            if (!isNaN(num)) {
                const ep = episodes.find(ep => ep.number === num);
                if (ep) selectedEpisodes.push(ep);
            }
        }
    }
    return selectedEpisodes;
}

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

async function fetchEpisodeLink(episodeId) {
    const servers = ['hd-2', 'hd-1'];
    const categories = ['sub', 'raw'];
    
    for (let category of categories) {
        for (let server of servers) {
            try {
                const link = await tryFetchingLink(episodeId, server, category);
                if (link) return link;
            } catch (error) {}
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
    } catch (error) {}
    return null;
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
