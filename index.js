import { Telegraf } from "telegraf";
import { getAnimeEpisodeSources } from "aniwatch";

const BOT_TOKEN = "7524565250:AAEE0v-IRhkTotEPtoMrktQCqrRWUhlZe0g";
const bot = new Telegraf(BOT_TOKEN);

// دالة لاستخراج ID الحلقة من الرابط
function extractEpisodeId(url) {
  const match = url.match(/watch\/(.*?)$/);
  return match ? match[1] : null;
}

bot.start((ctx) => {
  ctx.reply("أرسل رابط الحلقة للحصول على المصادر.");
});

bot.on("text", async (ctx) => {
  const episodeUrl = ctx.message.text;
  const episodeId = extractEpisodeId(episodeUrl);

  if (!episodeId) {
    return ctx.reply("❌ الرابط غير صحيح. تأكد من إرساله بشكل كامل.");
  }

  ctx.reply("⏳ جاري جلب المصادر...");

  try {
    const sources = await getAnimeEpisodeSources(episodeId, "hd-1", "sub");
    console.log("مصادر الحلقة:", sources);
    ctx.reply(`\`\`\`json\n${JSON.stringify(sources, null, 2)}\n\`\`\``);
  } catch (error) {
    console.error("خطأ أثناء جلب المصادر:", error);
    ctx.reply("❌ حدث خطأ أثناء جلب المصادر.");
  }
});

bot.launch().then(() => console.log("✅ البوت يعمل!"));
