const { Telegraf } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const express = require('express');

// استخدم الاستيراد الديناميكي
let nanoid;
(async () => {
  const nanoidModule = await import('nanoid');
  nanoid = nanoidModule.nanoid;
})();

const TOKEN = process.env['TOKEN'];
if (!TOKEN) {
  throw new Error('TOKEN is not defined in the environment variables');
}

const bot = new Telegraf(TOKEN);

bot.start((ctx) => {
  ctx.reply('Welcome! Please enter the name of the anime series:');
  bot.on('text', async (ctx) => {
    const animeName = ctx.message.text;
    ctx.reply('Please enter the episode number:');
    bot.on('text', async (ctx) => {
      const episodeNumber = ctx.message.text;
      const formattedAnimeName = animeName.replace(/\s+/g, '-');
      const url = `https://example.com/${formattedAnimeName}/episode-${episodeNumber}`;
      try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        $('title').text('Anime');
        const randomFileName = nanoid(10) + '.html';
        const filePath = path.join(__dirname, randomFileName);
        fs.writeFileSync(filePath, $.html());
        await ctx.replyWithDocument({ source: filePath, caption: 'Here is your anime episode' });
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error(error);
        ctx.reply('Failed to fetch the episode.');
      }
    });
  });
});

const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(3000, () => console.log('Server is running on port 3000'));

bot.launch();
