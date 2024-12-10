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
const telegramChatId = '-1002422630321';

// معرفات القنوات
const mainChannelId = '1216862003453366332'; // قناة الحلقات
const storageChannelId = '1315975590041354272'; // قناة التخزين

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // جلب القنوات باستخدام client.channels.cache
    const mainChannel = client.channels.cache.get(mainChannelId);
    const storageChannel = client.channels.cache.get(storageChannelId);

    // تحقق من القنوات
    if (!mainChannel) {
        console.error('Main channel not found!');
        return;
    }
    if (!storageChannel) {
        console.error('Storage channel not found!');
        return;
    }

    console.log('Starting to poll for new messages...');
    setInterval(async () => {
        try {
            // جلب آخر رسالة من قناة الحلقات
            const messages = await mainChannel.messages.fetch({ limit: 1 });
            const lastMessage = messages.first();

            if (!lastMessage) return; // إذا لم تكن هناك رسائل

            // التحقق من التخزين إذا كانت الرسالة مكررة
            const storageMessages = await storageChannel.messages.fetch({ limit: 1 });
            const lastStoredMessage = storageMessages.first();
            const lastStoredMessageId = lastStoredMessage ? lastStoredMessage.content : null;

            if (lastMessage.id === lastStoredMessageId) {
                console.log('No new messages.');
                return;
            }

            // معالجة الرسالة الجديدة
            const modifiedMessage = parseMessage(lastMessage.content);
            const attachment = lastMessage.attachments.first();

            if (attachment && attachment.contentType?.startsWith('image/')) {
                await sendPhotoToTelegram(attachment.url, modifiedMessage);
            } else {
                await sendMessageToTelegram(modifiedMessage);
            }

            // تخزين معرف الرسالة في قناة التخزين
            await storageChannel.send(lastMessage.id);
            console.log('New message sent to Telegram and stored.');
        } catch (error) {
            console.error('Error fetching or sending messages:', error);
        }
    }, 40000); // التحقق كل 40 ثانية
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