const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const javascriptObfuscator = require('javascript-obfuscator');
const keepAlive = require('./keep_alive.js');

const BOT_TOKEN = process.env['token'];
const bot = new Telegraf(BOT_TOKEN);

// تعريف دالة لتشفير النصوص
function encryptText(text) {
    return Buffer.from(text).toString('base64');
}

// تعريف دالة لتشفير الروابط
function encryptLink(link) {
    return Buffer.from(link).toString('base64');
}

bot.command('add', async (ctx) => {
    let animeName = '';
    let episodeNumber = '';
    let qualityLinks = {
        '1080p': '',
        '720p': '',
        '480p': ''
    };

    await ctx.reply('يرجى إدخال اسم الأنمي:');
    bot.on('text', async (ctx) => {
        if (!animeName) {
            animeName = ctx.message.text;
            await ctx.reply(`تم استقبال اسم الأنمي: ${animeName}\nيرجى إدخال رقم الحلقة:`);
        } else if (!episodeNumber) {
            episodeNumber = ctx.message.text;
            await ctx.reply(`تم استقبال رقم الحلقة: ${episodeNumber}\nيرجى إدخال الرابط المباشر لجودة 1080p أو اكتب "تخطي":`);
        } else if (!qualityLinks['1080p']) {
            const link = ctx.message.text;
            if (link.toLowerCase() !== 'تخطي') {
                qualityLinks['1080p'] = encryptLink(link);
            }
            await ctx.reply('يرجى إدخال الرابط المباشر لجودة 720p أو اكتب "تخطي":');
        } else if (!qualityLinks['720p']) {
            const link = ctx.message.text;
            if (link.toLowerCase() !== 'تخطي') {
                qualityLinks['720p'] = encryptLink(link);
            }
            await ctx.reply('يرجى إدخال الرابط المباشر لجودة 480p أو اكتب "تخطي":');
        } else if (!qualityLinks['480p']) {
            const link = ctx.message.text;
            if (link.toLowerCase() !== 'تخطي') {
                qualityLinks['480p'] = encryptLink(link);
            }

            if (Object.values(qualityLinks).every(value => !value)) {
                await ctx.reply('يجب توفير رابط واحد على الأقل لجودة. يرجى البدء من جديد.');
                animeName = '';
                episodeNumber = '';
                qualityLinks = { '1080p': '', '720p': '', '480p': '' };
                return;
            }

            const htmlContent = generateHtml(animeName, episodeNumber, qualityLinks);
            const fileName = `${animeName.replace(/ /g, '_')}_Episode_${episodeNumber}.html`;
            const filePath = path.join(__dirname, fileName);
            fs.writeFileSync(filePath, htmlContent);

            await ctx.replyWithDocument({ source: filePath });

            // حذف الملف بعد إرساله
            fs.unlinkSync(filePath);
        }
    });
});

function generateHtml(animeName, episodeNumber, qualityLinks) {
    let buttonsHtml = '';
    for (const [quality, link] of Object.entries(qualityLinks)) {
        if (link) {
            buttonsHtml += `<button onclick="play('${link}', this)" class="quality-button">${quality}</button>\n`;
        }
    }

    const watermarkText = encryptText('By : iAnime4day');

    return `
<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${animeName} - الحلقة ${episodeNumber}</title>
    <style>
        body {
            background-color: #121212;
            color: #fff;
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
            direction: rtl;
            position: relative;
        }
        h1 {
            margin-bottom: 20px;
            font-size: 24px;
            animation: fadeIn 1.5s ease-in-out;
        }
        .quality-button {
            background-color: #1DB954;
            border: none;
            padding: 15px 30px;
            margin: 10px;
            color: #fff;
            font-size: 16px;
            cursor: pointer;
            border-radius: 5px;
            transition: background-color 0.3s, transform 0.3s;
            animation: fadeInUp 1.5s ease-in-out;
        }
        .quality-button:hover {
            background-color: #1ed760;
            transform: translateY(-5px);
        }
        video {
            width: 100%;
            max-width: 800px;
            margin-top: 20px;
            animation: fadeIn 2s ease-in-out;
        }
        .dmca-button {
            position: absolute;
            bottom: 20px;
            background-color: #FF5252;
            border: none;
            padding: 10px 20px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            border-radius: 5px;
            transition: background-color 0.3s;
        }
        .dmca-button:hover {
            background-color: #ff6b6b;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        #loading-message {
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translate(-50%, -100%);
            font-size: 24px;
            color: #fff;
            display: none;
            animation: fadeIn 1.5s ease-in-out;
        }
        #offline-message {
            display: none;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            color: #fff;
            text-align: center;
        }
        #offline-message.active {
            display: block;
        }
        #watermark {
            position: absolute;
            bottom: 10px;
            right: 10px;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.5);
            pointer-events: none;
        }
    </style>
</head>
<body>
    <h1>${animeName} - الحلقة ${episodeNumber}</h1>
    <div id="offline-message">لا يتوفر اتصال بالإنترنت</div>
    ${buttonsHtml}
    <video id="player" controls></video>
    <div id="loading-message">الرجاء الانتظار...</div>
    <button class="dmca-button" onclick="window.open('https://telegra.ph/%D8%AA%D9%86%D8%A8%D9%8A%D9%87-%D8%AD%D9%82%D9%88%D9%82-%D8%A7%D9%84%D8%B7%D8%A8%D8%B9-%D9%88%D8%A7%D9%84%D9%86%D8%B4%D8%B1-08-05', '_blank')">DMCA</button>

    <script>
        ${obfuscateJavascript(`
        function decryptLink(link) {
            return atob(link);
        }

        function play(link, button) {
            const player = document.getElementById('player');
            const loadingMessage = document.getElementById('loading-message');

            // وقف الفيديو الحالي قبل تحميل الفيديو الجديد
            if (!player.paused) {
                player.pause();
            }

            player.onpause = function() {
                localStorage.setItem(link, player.currentTime);
            };

            player.src = decryptLink(link);
            loadingMessage.style.display = 'block';
            player.currentTime = localStorage.getItem(link) || 0;

            player.oncanplay = function() {
                loadingMessage.style.display = 'none';
                player.play();  // التأكد من أن الفيديو جاهز قبل بدء التشغيل
            };

            const buttons = document.querySelectorAll('.quality-button');
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        }

        function checkInternetConnection() {
            const offlineMessage = document.getElementById('offline-message');
            if (!navigator.onLine) {
                offlineMessage.classList.add('active');
            }
        }

        window.addEventListener('load', checkInternetConnection);
        window.addEventListener('offline', () => {
            document.getElementById('offline-message').classList.add('active');
        });

        document.addEventListener('DOMContentLoaded', function() {
            const watermarkDiv = document.createElement('div');
            watermarkDiv.id = 'watermark';
            watermarkDiv.innerText = decryptLink('${watermarkText}');
            document.body.appendChild(watermarkDiv);
        });
        `)}
    </script>
</body>
</html>
`;
}

// تعمية النص البرمجي باستخدام JavaScript Obfuscator
function obfuscateJavascript(code) {
    const obfuscatedCode = javascriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        debugProtection: true,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: true,
        stringArray: true,
        stringArrayEncoding: ['rc4'],
        stringArrayThreshold: 1,
        transformObjectKeys: true,
        unicodeEscapeSequence: false,
    });
    return obfuscatedCode.getObfuscatedCode();
}
keepAlive();
bot.launch();
