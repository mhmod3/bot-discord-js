const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const axios = require('axios');
const FormData = require('form-data');
const express = require('express');

const BOT_TOKEN = process.env.BOT_TOKEN;
const DEFAULT_API_TOKEN = process.env.DEFAULT_API_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 3000;
const TOKENS_FILE = './tokens.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// تسجيل الأخطاء غير المعالجة على مستوى العملية
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// ──────── قراءة وكتابة التوكنات ────────
function readTokens() {
  try {
    if (!fs.existsSync(TOKENS_FILE)) return [];
    const data = fs.readFileSync(TOKENS_FILE, 'utf8').trim();
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ خطأ في قراءة ملف التوكنات:', err);
    return [];
  }
}

function saveTokens(tokens) {
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  } catch (err) {
    console.error('❌ خطأ في حفظ ملف التوكنات:', err);
  }
}

function addToken(token) {
  const tokens = readTokens();
  if (!tokens.includes(token)) {
    tokens.push(token);
    saveTokens(tokens);
    return true;
  }
  return false;
}

// ──────── الأوامر ────────
bot.start((ctx) => {
  ctx.session = {};
  ctx.reply(`👋 أهلاً بك في بوت إدارة الترجمات والفيديو.

🧾 الأوامر المتاحة:
- /sub : لإرسال معرفات الفيديو وملف الترجمة.
- /vid : لإرسال رابط مباشر للفيديو.
- /dvid : لحذف مهمة رفع فيديو عبر معرف المهمة.
- /tokenadd : لإضافة توكن جديد.
- /tokenc : لاختيار التوكن الذي تريد استخدامه.

❌ لإلغاء أي عملية جارية في أي وقت، فقط أرسل 0.`);
});

bot.command('tokenadd', (ctx) => {
  ctx.session = { step: 'waiting_token_add' };
  ctx.reply('🔐 أرسل الآن التوكن الذي ترغب في إضافته.\n\n❌ للإلغاء أرسل 0.');
});

bot.command('tokenc', (ctx) => {
  ctx.session = ctx.session || {};
  const tokens = readTokens();
  const buttons = [
    Markup.button.callback(`${ctx.session.currentToken === DEFAULT_API_TOKEN ? '✅ ' : ''}التوكن الافتراضي`, `select_token_0`),
    ...tokens.map((token, i) =>
      Markup.button.callback(
        `${ctx.session.currentToken === token ? '✅ ' : ''}توكن: ${token.slice(0, 8)}...`,
        `select_token_${i + 1}`
      )
    )
  ];
  ctx.reply('🎯 اختر التوكن المراد استخدامه:', Markup.inlineKeyboard(buttons, { columns: 1 }));
});

bot.action(/select_token_(\d+)/, async (ctx) => {
  const index = parseInt(ctx.match[1]);
  const tokens = readTokens();
  const chosenToken = index === 0 ? DEFAULT_API_TOKEN : tokens[index - 1];
  ctx.session = ctx.session || {};
  ctx.session.currentToken = chosenToken;
  try {
    await ctx.editMessageText('✅ تم اختيار التوكن بنجاح.');
  } catch (err) {
    console.error('❌ خطأ في تعديل رسالة اختيار التوكن:', err);
  }
});

bot.command('sub', (ctx) => {
  ctx.session = { step: 'waiting_ids', ids: [] };
  ctx.reply('📥 أرسل الآن معرفات الفيديو (ID) واحداً تلو الآخر أو دفعة واحدة، ثم أرسل كلمة "تم" عند الانتهاء.\n\n❌ للإلغاء أرسل 0.');
});

bot.command('vid', (ctx) => {
  ctx.session = { step: 'waiting_video_url' };
  ctx.reply('الخطوات :\n1. اذهب الى موقع nyaa او الموقع الذي ترغب فيه.\n2. قم بضغط على "Download Torrent" لتحميل ملف التورنت\n3. خذ ملف الترونيت هذه وارسلخ الى هذه البوت "@filetolink4gbHG1bot"\n4. سوف يعطيك هذه البوت رابط خذ هذه الرابط وارسله لي هنا.\n\nللالغاء ارسل 0');
});

bot.command('dvid', (ctx) => {
  ctx.session = { step: 'waiting_delete_id' };
  ctx.reply('🗑️ أرسل معرف المهمة (ID) التي تريد حذفها.\n\n❌ للإلغاء أرسل 0.');
});

// ──────── التعامل مع النصوص ────────
bot.on('text', async (ctx) => {
  ctx.session = ctx.session || {};
  const { step } = ctx.session;
  const text = ctx.message.text.trim();

  if (text === '0') {
    ctx.session = {};
    return ctx.reply('❌ تم إلغاء العملية الجارية.');
  }

  try {
    if (step === 'waiting_token_add') {
      if (addToken(text)) {
        ctx.reply('✅ تم إضافة التوكن.');
      } else {
        ctx.reply('⚠️ هذا التوكن موجود مسبقًا.');
      }
      ctx.session.step = null;

    } else if (step === 'waiting_ids') {
      if (text.toLowerCase() === 'تم') {
        if (!ctx.session.ids.length) {
          ctx.reply('❌ لم ترسل أي معرف بعد.');
        } else {
          ctx.session.step = 'waiting_zip';
          ctx.reply('📦 أرسل الآن ملف ZIP الذي يحتوي على الترجمات.');
        }
      } else {
        const ids = text.split('\n').map(id => id.trim()).filter(Boolean);
        ctx.session.ids.push(...ids);
        for (let id of ids) {
          await ctx.reply(`✅ تم استلام ID: ${id}`);
        }
      }

    } else if (step === 'waiting_video_url') {
      if (!/^https?:\/\//.test(text)) {
        return ctx.reply('❌ الرابط غير صالح.');
      }
      try {
        const token = ctx.session.currentToken || DEFAULT_API_TOKEN;
        const res = await axios.post(
          'https://upnshare.com/api/v1/video/advance-upload',
          {
            url: text,
            name: `Uploaded from bot`
          },
          {
            headers: {
              'api-token': token,
              'Content-Type': 'application/json'
            }
          }
        );
        ctx.reply(`✅ تم رفع الفيديو. معرف المهمة: ${res.data.id}`);
      } catch (err) {
        console.error('❌ خطأ في رفع الفيديو:', err.response?.data || err.message);
        ctx.reply('❌ فشل رفع الفيديو.');
      }
      ctx.session.step = null;

    } else if (step === 'waiting_delete_id') {
      const taskId = text;
      const token = ctx.session.currentToken || DEFAULT_API_TOKEN;

      try {
        const res = await axios.delete(`https://upnshare.com/api/v1/video/advance-upload/${encodeURIComponent(taskId)}`, {
          headers: {
            'api-token': token,
            'accept': '*/*'
          }
        });

        if (res.status === 204) {
          ctx.reply(`✅ تم حذف المهمة بنجاح: ${taskId}`);
        } else {
          ctx.reply(`❌ لم يتم حذف المهمة. الحالة: ${res.status}`);
        }
      } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        if (status === 400) {
          ctx.reply(`❌ طلب غير صالح: ${message}`);
        } else if (status === 401) {
          ctx.reply(`❌ بيانات اعتماد غير صحيحة.`);
        } else if (status === 404) {
          ctx.reply(`❌ المهمة غير موجودة.`);
        } else if (status === 409) {
          ctx.reply(`❌ تعارض في العملية: ${message}`);
        } else if (status === 500) {
          ctx.reply(`❌ خطأ داخلي في الخادم.`);
        } else {
          ctx.reply(`❌ حدث خطأ: ${message}`);
        }
        console.error('❌ خطأ في حذف المهمة:', error.response?.data || error.message);
      }
      ctx.session = {};
    }
  } catch (outerErr) {
    console.error('❌ خطأ عام في التعامل مع الرسائل النصية:', outerErr);
  }
});

// ──────── استقبال ملفات ZIP ────────
bot.on('document', async (ctx) => {
  const { step, ids, currentToken } = ctx.session || {};
  const file = ctx.message.document;
  const ext = path.extname(file.file_name).toLowerCase();
  if (step !== 'waiting_zip' || ext !== '.zip') return;

  const fileLink = await ctx.telegram.getFileLink(file.file_id);
  const userId = ctx.from.id;
  const zipPath = `./temp_${userId}.zip`;
  const extractPath = `./subs_${userId}`;
  const token = currentToken || DEFAULT_API_TOKEN;

  try {
    await downloadFile(fileLink.href, zipPath);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    const subs = getSubtitleFiles(extractPath);
    if (subs.length !== ids.length) {
      ctx.reply(`❌ عدد الترجمات (${subs.length}) لا يساوي عدد المعرفات (${ids.length}).`);
      cleanup(zipPath, extractPath);
      return;
    }

    for (let i = 0; i < subs.length; i++) {
      const ext = path.extname(subs[i]);
      const newName = `${String(i + 1).padStart(2, '0')}${ext}`;
      const newPath = path.join(path.dirname(subs[i]), newName);
      fs.renameSync(subs[i], newPath);
      await uploadSubtitle(ids[i], newPath, newName, token);
    }

    ctx.reply('✅ تم رفع الترجمات بنجاح.');
  } catch (err) {
    console.error('❌ خطأ في استقبال أو رفع ملفات ZIP:', err);
    ctx.reply('❌ حدث خطأ أثناء رفع الترجمات.');
  } finally {
    cleanup(zipPath, extractPath);
    ctx.session = {};
  }
});

// ──────── دوال مساعدة ────────
function getSubtitleFiles(dir) {
  const files = [];
  function walk(currentPath) {
    fs.readdirSync(currentPath).forEach(file => {
      const fullPath = path.join(currentPath, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (['.srt', '.vtt', '.ass'].includes(path.extname(file).toLowerCase())) {
        files.push(fullPath);
      }
    });
  }
  walk(dir);
  return files.sort();
}

function cleanup(...paths) {
  for (const p of paths) {
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch (err) {
      console.error('❌ خطأ في حذف الملفات المؤقتة:', err);
    }
  }
}

async function uploadSubtitle(id, filePath, fileName, token) {
  const url = `https://upnshare.com/api/v1/video/manage/${id}/subtitle`;
  const form = new FormData();
  form.append('language', 'ar');
  form.append('name', fileName);
  form.append('file', fs.createReadStream(filePath));

  try {
    await axios.put(url, form, {
      headers: {
        ...form.getHeaders(),
        'api-token': token
      }
    });
  } catch (err) {
    console.error('❌ خطأ في رفع الترجمة:', err.response?.data || err.message);
    throw err; // ليتوقف التنفيذ عند الخطأ
  }
}

async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  try {
    const res = await axios.get(url, { responseType: 'stream' });
    return new Promise((resolve, reject) => {
      res.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (err) {
    console.error('❌ خطأ في تحميل الملف:', err);
    throw err;
  }
}

// ──────── Webhook إعدادات Express ────────
const app = express();

app.use(express.json()); // مهم لاستقبال JSON

// تسجيل Middleware للأخطاء في Express
app.use((err, req, res, next) => {
  console.error('❌ خطأ في Express:', err);
  res.status(500).send('Internal Server Error');
});

// ربط Webhook مع البوت
app.use(bot.webhookCallback('/webhook'));

// نقطة فحص حالة البوت
app.get('/', (req, res) => res.send('🤖 البوت يعمل باستخدام Webhook'));

// بدء السيرفر
app.listen(PORT, async () => {
  try {
    await bot.telegram.setWebhook(WEBHOOK_URL);
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
    console.log(`🔗 تم ضبط Webhook على ${WEBHOOK_URL}`);
  } catch (error) {
    console.error('❌ خطأ في ضبط Webhook:', error);
  }
});
