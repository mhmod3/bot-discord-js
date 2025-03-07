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
    const update = req.body;
    bot.handleUpdate(update);
    res.send('ok');
});

bot.start((ctx) => ctx.reply('هااا ؟'));

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
        const truncatedDescription = truncateText(info.description, 400);
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

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

bot.action(/^select_(.+)/, async (ctx) => {
    ctx.reply('اكتب الحلقات التي تريدها بهذا الشكل: 5-10 أو 3,7,9');
    ongoingSearches.set(ctx.chat.id, { animeId: ctx.match[1], mode: 'select' });
});

bot.on('text', async (ctx) => {
    if (!ongoingSearches.has(ctx.chat.id)) return;
    const searchData = ongoingSearches.get(ctx.chat.id);
    if (searchData.mode !== 'select') return;
    
    const animeId = searchData.animeId;
    const episodes = ctx.message.text.match(/\d+/g)?.map(Number) || [];
    if (episodes.length === 0) return ctx.reply('الصيغة غير صحيحة، تأكد من كتابتها بالشكل الصحيح.');
    
    ongoingSearches.delete(ctx.chat.id);
    
    try {
        const res = await axios.get(`https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/anime/${animeId}/episodes`);
        if (!res.data.success) return ctx.reply('مشكله...');
        
        const availableEpisodes = res.data.data.episodes.filter(ep => episodes.includes(ep.number));
        if (availableEpisodes.length === 0) return ctx.reply('ما لقيت الحلقات المطلوبة.');
        
        let links = [];
        for (let ep of availableEpisodes) {
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
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server is running on https://bot-discord-js-4xqg.onrender.com (Port: ${port})`);
});
