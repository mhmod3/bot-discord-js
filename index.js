const { Telegraf } = require('telegraf');
const axios = require('axios');
const express = require('express');
const fs = require('fs');
const keepAlive = require('./keep_alive.js');

const bot = new Telegraf('7524565250:AAGwInP2htEWwrXv9dxgIFwZb11xpiRQJE4');

// التحقق من صحة الرابط واستخراج ID الأنمي
function extractAnimeId(url) {
    if (!url.startsWith('https://hianime.to/')) return null;
    const match = url.match(/(?:watch\/)?([\w\d-]+-\d+)/);
    return match ? match[1] : null;
}

// استخراج الحلقات
async function fetchEpisodes(animeId) {
    const apiUrl = `https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/anime/${animeId}/episodes`;
    try {
        const response = await axios.get(apiUrl);
        return response.data.success ? response.data.data.episodes : [];
    } catch (error) {
        return [];
    }
}

// استخراج رابط الحلقة
async function fetchEpisodeSource(episodeId) {
    const servers = ['hd-2', 'hd-1', 'raw'];
    const categories = ['sub', 'raw'];
    for (let server of servers) {
        for (let category of categories) {
            try {
                const apiUrl = `https://aniwatch-api-chi-liard.vercel.app/api/v2/hianime/episode/sources?animeEpisodeId=${episodeId}&server=${server}&category=${category}`;
                const response = await axios.get(apiUrl);
                if (response.data.success && response.data.data.sources.length > 0) {
                    return response.data.data.sources[0].url;
                }
            } catch (error) {}
        }
    }
    return null;
}

bot.on('text', async (ctx) => {
    const url = ctx.message.text.trim();
    const animeId = extractAnimeId(url);
    if (!animeId) {
        return ctx.reply('❌ الرابط غير صالح أو ليس من hianime.to');
    }
    
    ctx.reply(`🔍 تم استخراج ID الأنمي: ${animeId}`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📥 جلب كل الحلقات', callback_data: `all_${animeId}` }],
                [{ text: '🔥 جلب آخر حلقة', callback_data: `last_${animeId}` }]
            ]
        }
    });
});

bot.action(/^all_(.+)$/, async (ctx) => {
    const animeId = ctx.match[1];
    await ctx.reply('🔄 جاري جلب جميع الحلقات...');
    const episodes = await fetchEpisodes(animeId);
    if (!episodes.length) {
        return ctx.reply('❌ لم يتم العثور على الحلقات.');
    }
    
    let links = [];
    for (let episode of episodes) {
        let source = await fetchEpisodeSource(episode.episodeId);
        if (source) {
            links.push(source);
        }
    }
    if (!links.length) return ctx.reply('❌ لم يتم العثور على روابط الحلقات.');
    
    const filePath = `episodes_${animeId}.txt`;
    fs.writeFileSync(filePath, links.join('\n'));
    
    ctx.reply(`✅ تم جلب جميع الحلقات! (أحدث حلقة: ${episodes.length})\n\nhttps://t.me/liM7mod`, {
        reply_markup: {
            inline_keyboard: [[{ text: '📂 إرسال ملف TXT', callback_data: `sendfile_${animeId}` }]]
        }
    });
});

bot.action(/^last_(.+)$/, async (ctx) => {
    const animeId = ctx.match[1];
    await ctx.reply('🔄 جاري جلب آخر حلقة...');
    const episodes = await fetchEpisodes(animeId);
    if (!episodes.length) {
        return ctx.reply('❌ لم يتم العثور على الحلقات.');
    }
    
    const lastEpisode = episodes[episodes.length - 1];
    let source = await fetchEpisodeSource(lastEpisode.episodeId);
    if (source) {
        ctx.reply(`🔥 آخر حلقة (${lastEpisode.number}):\n${source}\n\nBy: https://t.me/liM7mod`);
    } else {
        ctx.reply('❌ لم يتم العثور على رابط الحلقة.');
    }
});

bot.action(/^sendfile_(.+)$/, async (ctx) => {
    const animeId = ctx.match[1];
    const filePath = `episodes_${animeId}.txt`;
    try {
        await ctx.replyWithDocument({ source: filePath });
        fs.unlinkSync(filePath);
    } catch (error) {
        ctx.reply('❌ حدث خطأ أثناء إرسال الملف.');
    }
});
keepAlive();
bot.launch();
