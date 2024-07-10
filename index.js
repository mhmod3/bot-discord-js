const axios = require('axios');
const express = require('express');
const cheerio = require('cheerio');
const fs = require('fs');
const { Telegraf } = require('telegraf');
const { v4: uuidv4 } = require('uuid');
const app = express();
const TOKEN = process.env['TOKEN'];
const bot = new Telegraf(TOKEN);
const keepAlive = require('./keep_alive');

// Handle /start command
bot.command('start', ctx => {
    ctx.reply('مرحبا! الرجاء إرسال اسم الأنمي ورقم الحلقة، مثال: "Shingeki no Kyojin 1".');
});


// Handle text input for anime name and episode number
bot.on('text', async ctx => {
    const input = ctx.message.text.trim().split(' ');
    if (input.length < 2) {
        ctx.reply('لقد أدخلت أسم الأنمي أو رقم الحلقة بشكل خاطئ! يرجى المحاولة مرة أخرى.');
        return;
    }

    let animeName = input.slice(0, -1).join('-');
    const episodeNumber = input[input.length - 1];

    // Check if episode number is a valid number
    if (isNaN(episodeNumber)) {
        ctx.reply('الرجاء إدخال رقم الحلقة.');
        return;
    }

    // Remove any colons (:) from anime name
    animeName = animeName.replace(/:/g, '');

    // Encode the anime name and episode number to ensure the URL is valid
    const encodedAnimeName = encodeURIComponent(animeName);
    const encodedEpisodeNumber = encodeURIComponent(`الحلقة-${episodeNumber}`);
    const url = `https://witanime.cyou/episode/${encodedAnimeName}-${encodedEpisodeNumber}/`;

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
            }
        });
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

            // Additional elements to be removed
            $('.second-section').remove();
            $('.container .user-post-info-content').remove();
            $('.container[style*="overflow: hidden; text-align: center;"]').remove();
            $('.container.episode-watch-conteiner').remove();

            // Change link color to gray
            $('h3:contains("روابط تحميل الحلقة")').remove();

            // Change text for quality
            $('li:contains("الجودة المتوسطة SD")').text('480p');
            $('li:contains("الجودة العالية HD")').text('720p');
            $('li:contains("الجودة الخارقة FHD")').text('1080p');

            // Add CSS to set background image
            $('body').css({
                'background-image': 'url("https://github.com/mhmod3/Mahmood/blob/main/3840x2160-black-solid-color-background.jpg?raw=true")',
                'background-size': 'cover',
                'background-position': 'center',
                'background-repeat': 'no-repeat'
            });

            // Add a note at the end of the page
            $('body').prepend('<div style="text-align: center; padding: 10px; font-size: 24px;">by : LiAnimebot</div>');
            $('body').append('<div style="text-align: center; padding: 10px; font-size: 24px;">ملاحظة : قد تتواجد سيرفرات لا تعمل!. وايضا قد تتواجد في سيرفرات التحميل أعلانات يفضل تشغيل مانع للأعلانات</div>');

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
