const { Client, Intents } = require('selfbot.js-v13');
const axios = require('axios');
const keepAlive = require('./keep_alive.js');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
    ]
});

// معلومات قناة التليجرام
const telegramBotToken = process.env['tokentelegram'];
const telegramChatId = '-1002494322661';

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    const guildId = '1197709956737142865';
    const channelId = '1216862003453366332';

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.error('Server not found!');
        return;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== 'GUILD_NEWS') {
        console.error('Channel not found or is not an announcements channel!');
        return;
    }

    console.log('Listening for new messages...');

    // متابعة الرسائل الجديدة في القناة
    channel.messages.fetch({ limit: 1 }).then(() => {
        channel.on('messageCreate', async (message) => {
            // تحقق إذا كانت الرسالة ليست من البوت نفسه
            if (message.author.bot) return;

            const modifiedMessage = parseMessage(message.content);
            const attachment = message.attachments.first();

            if (attachment && attachment.contentType?.startsWith('image/')) {
                await sendPhotoToTelegram(attachment.url, modifiedMessage);
            } else {
                await sendMessageToTelegram(modifiedMessage);
            }
        });
    });
});

function parseMessage(message) {
    // حذف الجزء الخاص بـ "Previous Episodes" بكل الحالات الممكنة
    const previousEpisodesRegex = /┏.*?Previous Episodes[\s\S]*?<@&\d+>/g;
    message = message.replace(previousEpisodesRegex, '').trim();

    // استبدال الرموز بالنصوص
    message = message.replace(/<:drive:\d+>/g, 'Google Drive :');
    message = message.replace(/<:mega:\d+>/g, 'Mega :');
    message = message.replace(/\*\*>\*\*/g, '>'); // إزالة التنسيقات العريضة إذا وجدت

    // إعادة النص المعدل
    return message;
}

async function sendMessageToTelegram(message) {
    const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

    try {
        const response = await axios.post(telegramApiUrl, {
            chat_id: telegramChatId,
            text: message
        });
        console.log('Message sent to Telegram successfully:', response.data);
    } catch (error) {
        console.error('Error sending message to Telegram:', error.response ? error.response.data : error.message);
    }
}

async function sendPhotoToTelegram(photoUrl, caption) {
    const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendPhoto`;

    try {
        const response = await axios.post(telegramApiUrl, {
            chat_id: telegramChatId,
            photo: photoUrl,
            caption: caption || ''
        });
        console.log('Photo sent to Telegram successfully:', response.data);
    } catch (error) {
        console.error('Error sending photo to Telegram:', error.response ? error.response.data : error.message);
    }
}
keepAlive();
client.login(process.env['token']);
