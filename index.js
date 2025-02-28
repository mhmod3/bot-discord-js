const { Telegraf } = require("telegraf");
const fetch = require("node-fetch");

const bot = new Telegraf("7524565250:AAEE0v-IRhkTotEPtoMrktQCqrRWUhlZe0g");

bot.on("text", async (ctx) => {
    const message = ctx.message.text;
    const match = message.match(/watch\/([^?]+)\?ep=(\d+)/);

    if (!match) {
        return ctx.reply("❌ رابط غير صالح. يرجى إرسال رابط حلقة من hianime.to.");
    }

    const episodeId = `${match[1]}?ep=${match[2]}`;

    try {
        const aniwatch = await import("aniwatch");
        const { getAnimeEpisodeSources } = aniwatch;
        const data = await getAnimeEpisodeSources(episodeId, "hd-1", "sub");

        ctx.reply(`✅ تم استخراج البيانات:\n\n🔹 **المصدر:** ${data.source}\n🔹 **الجودة:** HD`);
    } catch (error) {
        console.error(error);
        ctx.reply("❌ حدث خطأ أثناء جلب المعلومات.");
    }
});

bot.launch();
console.log("✅ البوت يعمل...");
