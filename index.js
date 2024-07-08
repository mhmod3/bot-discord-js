const axios = require('axios');
const express = require('express');
const cheerio = require('cheerio');
const fs = require('fs');
const { Telegraf, Markup } = require('telegraf');
const { v4: uuidv4 } = require('uuid');
const app = express();
const TOKEN = process.env['TOKEN'];
const bot = new Telegraf(TOKEN);
const keepAlive = require('./keep_alive');

// Handle /start command
bot.command('start', ctx => {
    ctx.reply('مرحبا! الرجاء إرسال اسم الأنمي ورقم الحلقة، مثال: "Shingeki no Kyojin 1".');
});

// Handle /report command
bot.command('report', async ctx => {
    ctx.reply('ماذا ترغب في الإبلاغ عنه؟');
    bot.on('text', async ctx => {
        const reportText = ctx.message.text;
        const chatId = '-1002238659983'; // Replace with your specific group chat ID

        // Send report to specific group
        try {
            await bot.telegram.sendMessage(chatId, `الاسم: ${ctx.from.first_name}\nالبلاغ: ${reportText}`);
            ctx.reply('تم إرسال البلاغ بنجاح.');
        } catch (error) {
            console.error('Error sending report:', error);
            ctx.reply('حدث خطأ أثناء إرسال البلاغ.');
        }
    });
});

// Handle text input for anime name and episode number
bot.on('text', async ctx => {
    const input = ctx.message.text.trim().split(' ');
    if (input.length < 2) {
        ctx.reply('لقد أدخلت أسم الانمي أو رقم الحلقة بشكل خاطئ! يرجى المحاولة مرة أخرى.');
        return;
    }

    let animeName = input.slice(0, -1).join('-');
    const episodeNumber = input[input.length - 1];

    // Remove any colons (:) from anime name
    animeName = animeName.replace(/:/g, '');

    // Build URL based on anime name and episode number
    const formattedEpisode = `الحلقة-${episodeNumber}`;
    const url = `https://witanime.cyou/episode/${animeName}-${formattedEpisode}/`;

    try {
        const response = await axios.get(url);
        if (response.status === 200) {
            const $ = cheerio.load(response.data);

            // Modify the page as required
            $('title').text('Anime'); // Change page title to "Anime"
            $('link[rel="icon"]').remove(); // Remove page favicon

            $('center').remove(); 
            $('h3:contains("وصف الحلقة")').remove();
            $('center a[href*="anitaku"]').closest('center').remove();
            $('a[data-url]').filter((i, el) => $(el).text().toLowerCase().includes('yonaplay')).remove();
            $('.footer').remove();
            $('.logo').remove();
            $('.header-navbar').remove();
            $('strong:contains("بإمكانك مشاهدة الحلقة وتحميلها من خلال")').remove();
            $('div[dir="ltr"]').filter((i, el) => $(el).text().toLowerCase().includes('disqus seems to be taking longer than usual')).remove();
            $('.col-md-3.col-md-pull-9.col-sm-12.col-no-padding-left').remove();
            $('a[rel="prev"]').filter((i, el) => $(el).text().toLowerCase().includes('الحلقة السابقة')).remove();
            $('a[rel="next"]').filter((i, el) => $(el).text().toLowerCase().includes('الحلقة التالية')).remove();
            $('a').filter((i, el) => $(el).attr('href') && $(el).attr('href').includes('/anime/')).remove();
            $('.user-post-info-content').remove();
            $('#disqus_thread').remove();

            // Add CSS to set background color to gray
            $('body').css('background-color', '#0f0f0f');

            // Add a note at the end of the page
            $('body').append('<div style="text-align: center; padding: 40px;">ملاحظة : قد تتواجد سيرفرات لا تعمل!</div>');

            // Create a random file name
            const randomFileName = uuidv4().slice(0, 10) + '.html';

            // Save modified page as HTML file
            const modifiedHtml = $.html();
            fs.writeFileSync(randomFileName, modifiedHtml);

            // Send the file as a response to the user
            await ctx.replyWithDocument({ source: randomFileName });

            // Delete the file after sending
            fs.unlinkSync(randomFileName);

        } else {
            ctx.reply('حدث خطأ معين!');
        }
    } catch (error) {
        console.error('Error:', error);
        ctx.reply('حدث خطأ ما!');
    }
});

keepAlive();
bot.launch();
