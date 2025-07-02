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

// ──────── قراءة وكتابة التوكنات ────────
function readTokens() {
  try {
    if (!fs.existsSync(TOKENS_FILE)) return [];
    const data = fs.readFileSync(TOKENS_FILE, 'utf8').trim();
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
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
  ctx.session = ctx.session || {};
  ctx.reply(`👋 أهلاً بك في بوت إدارة الترجمات والفيديو.

🧾 الأوامر المتاحة:
- /sub : لإرسال معرفات الفيديو وملف الترجمة.
- /vid : لإرسال مهمة لرفع فيديو او عدة فيديوهات
- /dvid : لحذف مهمة رفع فيديو عبر معرف المهمة.
- /tokenadd : لإضافة توكن جديد.
- /tokenc : لاختيار التوكن الذي تريد استخدامه.

❌ لإلغاء أي عملية جارية في أي وقت، فقط أرسل 0.`);
});

bot.command('tokenadd', (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.step = 'waiting_token_add';
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
  ctx.session = ctx.session || {};
  const index = parseInt(ctx.match[1]);
  const tokens = readTokens();
  const chosenToken = index === 0 ? DEFAULT_API_TOKEN : tokens[index - 1];
  ctx.session.currentToken = chosenToken;
  await ctx.editMessageText('✅ تم اختيار التوكن بنجاح.');
});

bot.command('sub', (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.step = 'waiting_ids';
  ctx.session.ids = [];
  ctx.reply('📥 أرسل الآن معرفات الفيديو (ID) واحداً تلو الآخر، ثم أرسل "تم".\n\n❌ للإلغاء أرسل 0.');
});

bot.command('vid', (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.step = 'waiting_video_url';
  ctx.reply('الخطوات: 1. اذهب الى Nyaa او اي موقع اخر \n2. حمل ملف التورنيت وليس ان تجلب رابط Magnet\n3. قم بإرسال ملف التورنيت الى هذه البوت @filetolink4gbHG1bot\n4
 سيعطيك البوت رابطاً خذ هذه الرابط وارسله لي\n\n❌ للإلغاء أرسل 0.');
});

bot.command('dvid', (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.step = 'waiting_delete_id';
  ctx.reply('🗑️ أرسل معرف المهمة (ID) التي تريد حذفها.\n\n❌ للإلغاء أرسل 0.');
});

bot.on('text', async (ctx) => {
  ctx.session = ctx.session || {};
  const { step } = ctx.session;
  const text = ctx.message.text.trim();

  if (text === '0') {
    ctx.session.step = null;
    ctx.session.ids = [];
    return ctx.reply('❌ تم إلغاء العملية الجارية.');
  }

  try {
    if (step === 'waiting_token_add') {
      if (addToken(text)) ctx.reply('✅ تم إضافة التوكن.');
      else ctx.reply('⚠️ هذا التوكن موجود مسبقًا.');
      ctx.session.step = null;

    } else if (step === 'waiting_ids') {
      if (text.toLowerCase() === 'تم') {
        if (!ctx.session.ids.length) {
          ctx.reply('❌ لم ترسل أي معرف.');
        } else {
          ctx.session.step = 'waiting_zip';
          ctx.reply('📦 أرسل الآن ملف ZIP.');
        }
      } else {
        const ids = text.split('\n').map(x => x.trim()).filter(Boolean);
        ctx.session.ids.push(...ids);
        for (const id of ids) await ctx.reply(`✅ تم استلام ID: ${id}`);
      }

    } else if (step === 'waiting_video_url') {
      if (!/^https?:\/\//.test(text)) return ctx.reply('❌ الرابط غير صالح.');
      const token = ctx.session.currentToken || DEFAULT_API_TOKEN;
      try {
        const res = await axios.post(
          'https://upnshare.com/api/v1/video/advance-upload',
          { url: text, name: 'Uploaded from bot' },
          { headers: { 'api-token': token, 'Content-Type': 'application/json' } }
        );
        ctx.reply(`✅ تم رفع الفيديو. معرف المهمة: ${res.data.id}`);
      } catch (err) {
        console.error('❌ رفع الفيديو فشل:', err.response?.data || err.message);
        ctx.reply('❌ فشل رفع الفيديو.');
      }
      ctx.session.step = null;

    } else if (step === 'waiting_delete_id') {
      const token = ctx.session.currentToken || DEFAULT_API_TOKEN;
      try {
        const res = await axios.delete(
          `https://upnshare.com/api/v1/video/advance-upload/${encodeURIComponent(text)}`,
          { headers: { 'api-token': token, 'accept': '*/*' } }
        );
        if (res.status === 204) ctx.reply(`✅ تم حذف المهمة: ${text}`);
        else ctx.reply(`❌ لم يتم الحذف. الحالة: ${res.status}`);
      } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message;
        ctx.reply(`❌ خطأ (${status || 'غير معروف'}): ${msg}`);
        console.error('❌ حذف المهمة فشل:', err.response?.data || err.message);
      }
      ctx.session.step = null;
    }
  } catch (err) {
    console.error('❌ خطأ غير متوقع:', err.message);
    ctx.reply('❌ حدث خطأ غير متوقع.');
  }
});

bot.on('document', async (ctx) => {
  const { step, ids, currentToken } = ctx.session || {};
  const file = ctx.message.document;
  const ext = path.extname(file.file_name).toLowerCase();
  if (step !== 'waiting_zip' || ext !== '.zip') return;

  const token = currentToken || DEFAULT_API_TOKEN;
  const fileLink = await ctx.telegram.getFileLink(file.file_id);
  const userId = ctx.from.id;
  const zipPath = `./temp_${userId}.zip`;
  const extractPath = `./subs_${userId}`;

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
    console.error('❌ خطأ أثناء معالجة ZIP:', err.message);
    ctx.reply('❌ حدث خطأ أثناء رفع الترجمات.');
  } finally {
    cleanup(zipPath, extractPath);
    ctx.session.step = null;
    ctx.session.ids = [];
  }
});

// ──────── دوال مساعدة ────────
function getSubtitleFiles(dir) {
  const files = [];
  function walk(currentPath) {
    fs.readdirSync(currentPath).forEach(file => {
      const fullPath = path.join(currentPath, file);
      if (fs.lstatSync(fullPath).isDirectory()) walk(fullPath);
      else if (['.srt', '.vtt', '.ass'].includes(path.extname(file).toLowerCase())) files.push(fullPath);
    });
  }
  walk(dir);
  return files.sort();
}

function cleanup(...paths) {
  for (const p of paths) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
  }
}

async function uploadSubtitle(id, filePath, fileName, token) {
  const url = `https://upnshare.com/api/v1/video/manage/${id}/subtitle`;
  const form = new FormData();
  form.append('language', 'ar');
  form.append('name', fileName);
  form.append('file', fs.createReadStream(filePath));

  await axios.put(url, form, {
    headers: { ...form.getHeaders(), 'api-token': token }
  });
}

async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  const res = await axios.get(url, { responseType: 'stream' });
  return new Promise((resolve, reject) => {
    res.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// ──────── Webhook ────────
const app = express();
app.use(bot.webhookCallback('/webhook'));
bot.telegram.setWebhook(WEBHOOK_URL);

app.get('/', (req, res) => res.send('🤖 البوت يعمل باستخدام Webhook'));
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`));
