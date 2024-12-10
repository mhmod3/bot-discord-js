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

// معرفات الخادم والقنوات
const guildId = '1197709956737142865';
const mainChannelId = '1216862003453366332'; // القناة التي تحتوي على الرسائل الرئيسية
const storageChannelId = '1315975590041354272'; // القناة التي تخزن معرف الرسالة

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
        console.error('Server not found!');
        return;
    }

    const mainChannel = guild.channels.cache.get(mainChannelId);
    const storageChannel = guild.channels.cache.get(storageChannelId);

    if (!mainChannel || mainChannel.type !== 'GUILD_NEWS') {
        console.error('Main channel not found or is not an announcements channel!');
        return;
    }

    if (!storageChannel || storageChannel.type !== 'GUILD_TEXT') {
        console.error('Storage channel not found or is not a text channel!');
        return;
    }

    console.log('Listening for new messages...');
    setInterval(() => checkNewMessages(mainChannel, storageChannel), 40000); // التحقق كل 40 ثانية
});

async function checkNewMessages(mainChannel, storageChannel) {
    try {
        const lastStoredMessageId = await getLastStoredMessageId(storageChannel);
        const fetchedMessages = await mainChannel.messages.fetch({ limit: 1 });
        const latestMessage = fetchedMessages.first();

        if (!latestMessage || latestMessage.id === lastStoredMessageId) {
            return; // لا توجد رسالة جديدة
        }

        const modifiedMessage = parseMessage(latestMessage.content);
        const attachment = latestMessage.attachments.first();

        if (attachment && attachment.contentType?.startsWith('image/')) {
            await sendPhotoToTelegram(attachment.url, modifiedMessage);
        } else {
            await sendMessageToTelegram(modifiedMessage);
        }

        await updateLastStoredMessageId(storageChannel, latestMessage.id);
    } catch (err) {
        console.error('Error checking or sending new messages:', err);
    }
}

async function getLastStoredMessageId(storageChannel) {
    try {
        const fetchedMessages = await storageChannel.messages.fetch({ limit: 1 });
        const lastMessage = fetchedMessages.first();
        return lastMessage ? lastMessage.content.trim() : null;
    } catch (err) {
        console.error('Error fetching last stored message ID:', err);
        return null;
    }
}

async function updateLastStoredMessageId(storageChannel, messageId) {
    try {
        const fetchedMessages = await storageChannel.messages.fetch({ limit: 1 });
        const lastMessage = fetchedMessages.first();

        if (lastMessage) {
            await lastMessage.edit(messageId); // تحديث الرسالة الحالية
        } else {
            await storageChannel.send(messageId); // إنشاء رسالة جديدة إذا لم تكن موجودة
        }
    } catch (err) {
        console.error('Error updating last stored message ID:', err);
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