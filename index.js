import { Telegraf } from "telegraf";
import { getAnimeEpisodeSources } from "aniwatch";

const bot = new Telegraf("7524565250:AAEE0v-IRhkTotEPtoMrktQCqrRWUhlZe0g");

bot.start((ctx) => {
  ctx.reply("🔹 أرسل لي رابط الحلقة وسأجلب لك المعلومات.");
});

bot.on("text", async (ctx) => {
  try {
    const message = ctx.message.text;
    
    // استخراج ID الحلقة بشكل دقيق
    const match = message.match(/watch\/([^?]+)\?ep=(\d+)/);
    if (!match) return ctx.reply("❌ يرجى إرسال رابط صحيح!");

    const episodeID = `${match[1]}?ep=${match[2]}`;
    ctx.reply(`📺 جاري جلب البيانات للحلقة: ${episodeID}...`);

    // جلب المصادر
    let sources = await getAnimeEpisodeSources(episodeID);
    
    // التأكد أن `sources` ليست فارغة
    if (!sources || !sources.sources || sources.sources.length === 0) {
      ctx.reply("⚠️ لم يتم العثور على أي مصادر لهذه الحلقة. قد يكون هناك مشكلة في API أو الحلقة غير متوفرة.");
      return;
    }

    console.log(sources); // طباعة البيانات في الكونسول

    // إرسال النتيجة كما هي
    ctx.reply(`📢 مصادر الحلقة:\n\`\`\`\n${JSON.stringify(sources, null, 2)}\n\`\`\``, { parse_mode: "Markdown" });

  } catch (error) {
    console.error("❌ خطأ:", error);
    ctx.reply("❌ حدث خطأ أثناء جلب المعلومات.");
  }
});

// إيقاف أي تشغيل سابق
bot.stop();

// تشغيل البوت
bot.launch().then(() => console.log("✅ البوت يعمل بنجاح!"));
