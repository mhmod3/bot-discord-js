const { exec } = require("child_process");
const fs = require("fs");
const keepAlive = require("./keep_alive");

const { Client, Intents, MessageEmbed } = require("discord.js");
const axios = require("axios");
const translate = require("google-translate-api-x");
require("dotenv").config();

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
  ],
});

const commandChannelId = "1252277316948725792";
const embedChannelId = "1252263507601260574";
const reportChannelId = "1253778377446395924";
const allowedUserId = "900269769536733205";

// أضف معرف الرتبة هنا
const roleId = "1252964117292253225"; // ضع هنا معرف الرتبة التي تريد الإشارة إليها

const apiKey = "98f7b234cab96ae1f7fd7c31ab3aa3eb";
const headers = { "X-MAL-CLIENT-ID": apiKey };

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const guild = client.guilds.cache.get("1252263218496405614");
  if (guild) {
    await guild.commands.set([
      {
        name: "anime",
        description: "احصل على معلومات حول الأنمي",
        options: [
          {
            name: "name",
            type: "STRING",
            description: "اسم الأنمي",
            required: true,
          },
          {
            name: "quality",
            type: "STRING",
            description: "الجودة",
            required: true,
            choices: [
              { name: "480p", value: "480p" },
              { name: "720p", value: "720p" },
              { name: "1080p", value: "1080p" },
            ],
          },
        ],
      },
      {
        name: "chk",
        description: "تحقق من الروابط في ملف نصي",
      },
      {
        name: "report",
        description: "إبلاغ عن رابط معين",
        options: [
          {
            name: "anime",
            type: "STRING",
            description: "اسم الأنمي",
            required: true,
          },
          {
            name: "url",
            type: "STRING",
            description: "الرابط",
            required: true,
          },
        ],
      },
    ]);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, user, channel, guild } = interaction;

  if (
    commandName === "anime" &&
    channel.id === commandChannelId &&
    user.id === allowedUserId
  ) {
    const animeName = interaction.options.getString("name");
    const quality = interaction.options.getString("quality") || "Unknown";

    try {
      await interaction.deferReply({ ephemeral: true });

      const response = await axios.get(
        `https://api.myanimelist.net/v2/anime?q=${animeName}&limit=1`,
        { headers }
      );
      const data = response.data;

      if (data.data && data.data.length > 0) {
        const animeInfo = data.data[0].node;

        const detailsResponse = await axios.get(
          `https://api.myanimelist.net/v2/anime/${animeInfo.id}?fields=id,title,main_picture,synopsis,num_episodes`,
          { headers }
        );
        const details = detailsResponse.data;

        const translatedSynopsis = await translate(details.synopsis, {
          from: "en",
          to: "ar",
        });

        const embed = new MessageEmbed()
          .setTitle(details.title)
          .setDescription(translatedSynopsis.text)
          .setColor(0x00ff00)
          .setImage(details.main_picture.large)
          .addFields(
            {
              name: "عدد الحلقات",
              value: details.num_episodes.toString(),
              inline: false,
            },
            {
              name: "الجودة",
              value: quality,
              inline: false,
            }
          );

        const embedChannel = await client.channels.fetch(embedChannelId);
        if (embedChannel) {
          const role = guild.roles.cache.get(roleId);
          if (role) {
            await embedChannel.send({ content: `${role}`, embeds: [embed] });
            await interaction.editReply("تم إرسال معلومات الأنمي بنجاح.");
          } else {
            await interaction.editReply("تعذر العثور على الرتبة المحددة.");
          }
        } else {
          await interaction.editReply(
            "تعذر العثور على القناة المحددة لإرسال الـ embed."
          );
        }

        await interaction.followUp("من فضلك أرسل الملف النصي المطلوب.");

        const fileFilter = (response) =>
          response.author.id === user.id &&
          response.channel.id === channel.id &&
          response.attachments.size > 0;

        const fileCollected = await channel.awaitMessages({
          filter: fileFilter,
          max: 1,
          time: 60000,
          errors: ["time"],
        });
        const attachment = fileCollected.first().attachments.first();

        if (attachment.name.endsWith(".txt")) {
          const filePath = `./${attachment.name}`;
          const response = await axios.get(attachment.url, {
            responseType: "stream",
          });
          response.data.pipe(fs.createWriteStream(filePath));
          response.data.on("end", async () => {
            await interaction.followUp("تم استلام الملف بنجاح.");

            if (embedChannel) {
              await embedChannel.send({ files: [filePath] });
              fs.unlinkSync(filePath);
            } else {
              await interaction.followUp(
                "تعذر العثور على القناة المحددة لإرسال الملف."
              );
            }
          });
        } else {
          await interaction.followUp("الملف المرسل ليس ملف نصي.");
        }
      } else {
        await interaction.editReply("لم يتم العثور على الأنمي.");
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply(`حدث خطأ غير متوقع: ${error.message}`);
    }
  }

  if (commandName === "chk") {
    await interaction.reply("من فضلك أرسل الملف النصي المطلوب.");

    const fileFilter = (response) =>
      response.author.id === user.id &&
      response.channel.id === channel.id &&
      response.attachments.size > 0;

    try {
      const fileCollected = await channel.awaitMessages({
        filter: fileFilter,
        max: 1,
        time: 60000,
        errors: ["time"],
      });
      const attachment = fileCollected.first().attachments.first();

      if (attachment.name.endsWith(".txt")) {
        const filePath = `./${attachment.name}`;
        const response = await axios.get(attachment.url, {
          responseType: "stream",
        });
        response.data.pipe(fs.createWriteStream(filePath));
        response.data.on("end", async () => {
          await interaction.followUp(
            "تم استلام الملف بنجاح جاري فحص الروابط الرجاء الانتظار (قد يستغرق الأمر وقتا)"
          );

          const checkUrl = async (url) => {
            try {
              const response = await axios.get(url, { timeout: 10000 });
              return response.status === 404
                ? `الرابط هذا لا يعمل: ${url}`
                : `الرابط هذا يعمل: ${url}`;
            } catch (error) {
              return `حدث خطأ أثناء محاولة الوصول إلى الرابط ${url}: ${error.message}`;
            }
          };

          const checkUrlsFromFile = async (filePath) => {
            const results = [];
            try {
              const data = fs.readFileSync(filePath, "utf-8");
              const urls = data.split("\n");
              for (const url of urls) {
                if (url.trim()) {
                  results.push(await checkUrl(url.trim()));
                }
              }
            } catch (error) {
              results.push(`حدث خطأ أثناء قراءة الملف: ${error.message}`);
            }
            return results;
          };

          const results = await checkUrlsFromFile(filePath);
          fs.unlinkSync(filePath);

          try {
            await user.send(results.join("\n"));
          } catch (error) {
            await interaction.followUp("الرجاء فتح الخاص لاستلام النتائج.");
          }
        });
      } else {
        await interaction.followUp("الملف المرسل ليس ملف نصي.");
      }
    } catch (error) {
      console.error(error);
      await interaction.followUp(`حدث خطأ غير متوقع: ${error.message}`);
    }
  }

  if (commandName === "report") {
    const animeName = interaction.options.getString("anime");
    const url = interaction.options.getString("url");

    try {
      await interaction.deferReply({ ephemeral: true });

      const embed = new MessageEmbed()
        .setTitle("إبلاغ عن رابط")
        .setColor(0xff0000)
        .addFields(
          { name: "اسم المستخدم", value: user.tag, inline: true },
          { name: "اسم الأنمي", value: animeName, inline: true },
          { name: "الرابط", value: url, inline: false },
          {
            name: "التاريخ",
            value: new Date().toLocaleString("ar-EG"),
            inline: false,
          }
        );

      const reportChannel = await client.channels.fetch(reportChannelId);
      if (reportChannel) {
        await reportChannel.send({ embeds: [embed] });
        await interaction.editReply("تم إرسال الإبلاغ بنجاح.");
      } else {
        await interaction.editReply("تعذر العثور على القناة المحددة للإبلاغ.");
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply(`حدث خطأ غير متوقع: ${error.message}`);
    }
  }
});

keepAlive();
client.login(process.env.TOKEN);
