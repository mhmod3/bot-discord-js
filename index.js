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

// Handle text input for anime name and episode number
bot.on('text', async ctx => {
    const input = ctx.message.text.trim().split(' ');
    if (input.length < 2) {
        ctx.reply('لقد أدخلت أسم الأنمي أو رقم الحلقة بشكل خاطئ! يرجى المحاولة مرة أخرى.');
        return;
    }

    let animeName = input.slice(0, -1).join('-');
    const episodeNumber = input[input.length - 1];

    if (isNaN(episodeNumber)) {
        ctx.reply('الرجاء إدخال رقم الحلقة.');
        return;
    }

    animeName = animeName.replace(/:/g, '');

    await fetchAndModifyEpisodePage(ctx, animeName, episodeNumber);
});

async function fetchAndModifyEpisodePage(ctx, animeName, episodeNumber) {
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

            $('title').text('Anime');
            // إزالة العناصر المطلوبة
            $('link[rel="icon"]').remove();
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
            $('.second-section').remove();
            $('.container .user-post-info-content').remove();
            $('.container[style*="overflow: hidden; text-align: center;"]').remove();
            $('.container.episode-watch-conteiner').remove();
            $('h3:contains("روابط تحميل الحلقة")').remove();
            $('li:contains("الجودة المتوسطة SD")').text('480p');
            $('li:contains("الجودة العالية HD")').text('720p');
            $('li:contains("الجودة الخارقة FHD")').text('1080p');
            $('body').css({
                'background-image': 'url("https://github.com/mhmod3/Mahmood/blob/main/3840x2160-black-solid-color-background.jpg?raw=true")',
                'background-size': 'cover',
                'background-position': 'center',
                'background-repeat': 'no-repeat'
            });
            $('body').prepend('<div style="text-align: center; padding: 10px; font-size: 24px;">by : LiAnimebot</div>');
            $('body').append('<div style="text-align: center; padding: 10px; font-size: 24px;">ملاحظة : قد تتواجد سيرفرات لا تعمل!. وايضا قد تتواجد في سيرفرات التحميل أعلانات يفضل تشغيل مانع للأعلانات</div>');

            // البحث عن زر التحميل المباشر
            const downloadUrl = `https://anime4up.top/episode/${encodedAnimeName}-${encodedEpisodeNumber}`;
            const downloadResponse = await axios.get(downloadUrl);
            const downloadHtml = cheerio.load(downloadResponse.data);
            const directDownloadButton = downloadHtml('div.dw-online a[href*="download"]');
            let directDownloadLink = '';

            if (directDownloadButton.length > 0) {
                directDownloadLink = directDownloadButton.attr('href');
            }

            const inlineKeyboard = [
                [
                    Markup.button.callback('الحلقة التالية', `next_${animeName}_${parseInt(episodeNumber) + 1}`)
                ],
                [
                    Markup.button.callback('مشاهدة', `watch_${encodedAnimeName}`)
                ]
            ];

            if (directDownloadLink) {
                inlineKeyboard.push([
                    Markup.button.url('تحميل مباشر (أحتياطي قد تتواجد اعلانات مزعجة بشكل لا يصدق)', directDownloadLink)
                ]);
            }

            const modifiedHtml = $.html();
            const randomFileName = uuidv4().slice(0, 10) + '.html';
            fs.writeFileSync(randomFileName, modifiedHtml);

            await ctx.replyWithDocument(
                { source: randomFileName, filename: randomFileName },
                { caption: `اسم الأنمي: ${animeName.replace(/-/g, ' ')}\nرقم الحلقة: ${episodeNumber}`, ...Markup.inlineKeyboard(inlineKeyboard) }
            );

            fs.unlinkSync(randomFileName);
            
        } else {
            ctx.reply('حدث خطأ معين!');
        }
    } catch (error) {
        console.error('Error:', error);
        ctx.reply('حدث خطأ ما!');
    }
}

bot.action(/next_(.+)_(\d+)/, async ctx => {
    const animeName = ctx.match[1];
    const episodeNumber = parseInt(ctx.match[2]);

    await fetchAndModifyEpisodePage(ctx, animeName, episodeNumber);
});

bot.action(/watch_(.+)/, async ctx => {
    const animeName = ctx.match[1];

    await fetchAndModifyWatchPage(ctx, animeName);
});

async function fetchAndModifyWatchPage(ctx, animeName) {
    const encodedAnimeName = encodeURIComponent(animeName);
    const watchUrl = `https://www.animedar.xyz/anime/${encodedAnimeName}`;

    try {
        const response = await axios.get(watchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
            }
        });

        if (response.status === 200) {
            const $ = cheerio.load(response.data);

            $('.th').remove();
            $('.bigcontent.nobigcv').remove();
            $('img[src="https://www.animedar.xyz/wp-content/uploads/2023/11/join-us-whatsapp.png"]').remove();
            $('img[src="https://www.animedar.xyz/wp-content/uploads/2023/11/join-us-telegram.png"]').remove();
            $('img[src="https://www.animedar.xyz/wp-content/uploads/2023/11/join-us-ins.png"]').remove();
            $('.releases:contains("تحميل")').remove();
            $('.linkul').remove();
            $('.bixbox.synp').remove();
            $('.bixbox.charvoice').remove();
            $('.socialts').remove();
            $('.releases:contains("المسلسلات الموصى بها")').remove();
            $('.listupd').remove();
            $('.menu-footer-container').remove();
            $('.footercopyright').remove();
            $('.cmt.commentx').remove();
            $('.releases:contains("تعليق")').remove();
            $('.centernav').remove();
            
            // حذف التعليقات التي تحتوي على العناصر المطلوبة
            $('div.a-wrapper').remove();
            $('div.dar-grip-wrapper').remove();
            $('body').prepend('<div style="text-align: center; padding: 10px; font-size: 24px;">by : LiAnimebot</div>');
            $('body').append('<div style="text-align: center; padding: 10px; font-size: 24px;">ملاحظة : قد تتواجد سيرفرات لا تعمل!. وايضا قد تتواجد في سيرفرات التحميل أعلانات يفضل تشغيل مانع للأعلانات</div>');

                      

            const modifiedHtml = $.html();
            const randomFileName = uuidv4().slice(0, 10) + '.html';
            fs.writeFileSync(randomFileName, modifiedHtml);

            await ctx.replyWithDocument(
                { source: randomFileName, filename: randomFileName },
                { caption: `اسم الأنمي: ${animeName.replace(/-/g, ' ')}`, ...Markup.inlineKeyboard([
                ]) }
            );

            fs.unlinkSync(randomFileName);
            
        } else {
            ctx.reply('حدث خطأ معين أثناء مشاهدة الحلقة!');
        }
    } catch (error) {
        console.error('Error:', error);
        ctx.reply('حدث خطأ ما أثناء مشاهدة الحلقة!');
    }
}
keepAlive();
bot.launch();
