const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const keepAlive = require('./keep_alive.js');

// متغيرات البيئة
const TOKEN = process.env['token'];
const GUILD_ID = 1006276395921575996; // معرف السيرفر
const CHANNEL_ID = 1059820320745332746; // معرف القناة الصوتية

const client = new Client({ checkUpdate: false });

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    try {
        await joinVC();
        console.log(`Joined voice channel: ${CHANNEL_ID}`);
    } catch (error) {
        console.error('Error joining the voice channel:', error);
    }
});

async function joinVC() {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
        console.error('Guild not found!');
        return;
    }

    const voiceChannel = guild.channels.cache.get(CHANNEL_ID);
    if (!voiceChannel) {
        console.error('Voice channel not found!');
        return;
    }

    joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true
    });
}

keepAlive();
client.login(TOKEN);
