import { getAnimeEpisodeSources } from 'aniwatch';
import { Telegraf } from 'telegraf';

// استبدل هذا بـ Token البوت الخاص بك من BotFather
const bot = new Telegraf("7524565250:AAEE0v-IRhkTotEPtoMrktQCqrRWUhlZe0g");

// استماع للرسائل الواردة
bot.on("text", (ctx) => {
  const messageText = ctx.message.text;

  // تحقق إذا كانت الرسالة تحتوي على رابط الحلقة
  const regex = /https:\/\/hianime\.to\/watch\/([a-zA-Z0-9\-]+)\?ep=\d+/;
  const match = messageText.match(regex);

  if (match) {
    const episodeId = match[1];  // استخراج الـ id

    // جلب مصادر الحلقة باستخدام الـ id
    getAnimeEpisodeSources(episodeId, "hd-1", "sub")
      .then((data) => {
        // إرسال المعلومات عبر تليجرام
        const response = `مصادر الحلقة:\n${JSON.stringify(data, null, 2)}`;
        ctx.reply(response);
      })
      .catch((err) => {
        ctx.reply(`حدث خطأ أثناء جلب البيانات: ${err.message}`);
      });
  } else {
    ctx.reply("من فضلك أرسل رابط حلقة بشكل صحيح (مثال: https://hianime.to/watch/dr-stone-science-future-19430?ep=131687).");
  }
});

// بدء البوت
bot.launch().catch(err => console.error("Error launching bot:", err));
