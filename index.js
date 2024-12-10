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
    if (mainChannel.type !== 'GUILD_TEXT' && mainChannel.type !== 'GUILD_NEWS') {
        console.error('Main channel is not a text or announcements channel!');
        return;
    }

    if (!storageChannel) {
        console.error('Storage channel not found!');
        return;
    }
    if (storageChannel.type !== 'GUILD_TEXT') {
        console.error('Storage channel is not a text channel!');
        return;
    }

    console.log('Listening for new messages...');
    setInterval(() => checkNewMessages(mainChannel, storageChannel), 40000); // التحقق كل 40 ثانية
});

async function checkNewMessages(mainChannel, storageChannel) {
    try {
        // قراءة آخر معرف رسالة من قناة التخزين
        const storageMessages = await storageChannel.messages.fetch({ limit: 1 });
        const lastMessage = storageMessages.first();
        const lastMessageId = lastMessage ? lastMessage.content : null;

        // جلب الرسائل الجديدة من قناة الحلقات
        const messages = await mainChannel.messages.fetch({ limit: 10, after: lastMessageId });

        if (messages.size === 0) {
            console.log('No new messages to process.');
            return;
        }

        for (const message of messages.values()) {
            const modifiedMessage = parseMessage(message.content);
            const attachment = message.attachments.first();

            if (attachment && attachment.contentType?.startsWith('image/')) {
                await sendPhotoToTelegram(attachment.url, modifiedMessage);
            } else {
                await sendMessageToTelegram(modifiedMessage);
            }

            // تحديث معرف آخر رسالة في قناة التخزين
            await storageChannel.send(message.id);
        }

        console.log('New messages processed and sent to Telegram.');
    } catch (err) {
        console.error('Error checking new messages:', err);
    }
}

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