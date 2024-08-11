const { Telegraf, Markup, session } = require('telegraf');
const crypto = require('crypto');
const keepAlive = require('./keep_alive.js');
// Create a random identifier (instead of filename)
function generateRandomIdentifier() {
    return crypto.randomBytes(16).toString('hex');
}

// Validate that the file contains only URLs
function validateFileContent(content) {
    const lines = content.split('\n').map(line => line.trim());
    return lines.every(line => /^https?:\/\/\S+$/.test(line));
}

// Generate buttons based on URLs and marked episodes
function generateButtons(urls, watchedEpisodes) {
    let buttons = [];
    urls.forEach((url, index) => {
        const episodeNumber = index + 1;
        const isWatched = watchedEpisodes.includes(episodeNumber);
        const button = { 
            text: `الحلقة ${episodeNumber} ${isWatched ? '✅' : ''}`, 
            url: `https://mhmod3.github.io/G/?vid=${url}`
        };
        buttons.push(button);
    });

    // Chunk buttons into groups of 5
    const buttonGroups = [];
    for (let i = 0; i < buttons.length; i += 5) {
        buttonGroups.push(buttons.slice(i, i + 5));
    }

    return buttonGroups;
}

// Create the bot
const BOT_TOKEN = process.env['token'];
const bot = new Telegraf(BOT_TOKEN);

// Add session middleware
bot.use(session({
    defaultSession: () => ({
        currentPage: 0,
        watchedEpisodes: []
    }) // Initialize session with default values
}));

// Handle file upload
bot.on('document', async (ctx) => {
    const file = ctx.message.document;

    // Check if the uploaded file is a txt file
    if (file.mime_type === 'text/plain') {
        const randomIdentifier = generateRandomIdentifier();

        // Download the file
        const link = await ctx.telegram.getFileLink(file.file_id);
        const text = await (await fetch(link)).text();

        // Ask the user if they want to proceed
        await ctx.reply('أكلك تريد حلقات هذه الملف بالفعل ؟', Markup.inlineKeyboard([
            Markup.button.callback('أي', `process_${randomIdentifier}`),
            Markup.button.callback('لا', `cancel_${randomIdentifier}`)
        ]).resize());

        // Handle user response
        bot.action(`process_${randomIdentifier}`, async (ctx) => {
            if (validateFileContent(text)) {
                const urls = text.split('\n').map(line => line.trim()).filter(line => line);
                const buttonGroups = generateButtons(urls, ctx.session.watchedEpisodes);

                if (buttonGroups.length === 0) {
                    await ctx.reply('الروابط الي بالملف مو صالحة');
                    return;
                }

                // Initialize the current page number in the session
                ctx.session.currentPage = 0;

                async function showPage(ctx, page) {
                    const currentGroup = buttonGroups[page].map(button => [button]);
                    const navigationButtons = [];

                    if (page > 0) {
                        navigationButtons.push(Markup.button.callback('السابق', `prev_${randomIdentifier}`));
                    }
                    if (page < buttonGroups.length - 1) {
                        navigationButtons.push(Markup.button.callback('التالي', `next_${randomIdentifier}`));
                    }

                    const inlineKeyboard = [...currentGroup, navigationButtons.length > 0 ? navigationButtons : []];

                    if (ctx.updateType === 'callback_query') {
                        await ctx.editMessageText(
                            ' (افتح الرابط بمتصفح خارجي واذا ما شتغل بالمتصفح الخارجي جرب واحد ثاني)\nحدد الحلقة :',
                            Markup.inlineKeyboard(inlineKeyboard).resize()
                        ).catch(async (error) => {
                            if (error.response.error_code === 400 && error.response.description.includes("message is not modified")) {
                                await ctx.answerCbQuery('لم يعد هنالك حلقات').catch(() => {});
                            }
                        });
                    } else {
                        await ctx.reply(
                            ' (افتح الرابط بمتصفح خارجي واذا ما شتغل بالمتصفح الخارجي جرب واحد ثاني)\nحدد الحلقة :',
                            Markup.inlineKeyboard(inlineKeyboard).resize()
                        );
                    }
                }

                await showPage(ctx, ctx.session.currentPage);

                bot.action(`next_${randomIdentifier}`, async (ctx) => {
                    if (ctx.session.currentPage < buttonGroups.length - 1) {
                        ctx.session.currentPage++;
                        await showPage(ctx, ctx.session.currentPage);
                    } else {
                        await ctx.answerCbQuery('لم يعد هنالك حلقات').catch(() => {});
                    }
                });

                bot.action(`prev_${randomIdentifier}`, async (ctx) => {
                    if (ctx.session.currentPage > 0) {
                        ctx.session.currentPage--;
                        await showPage(ctx, ctx.session.currentPage);
                    } else {
                        await ctx.answerCbQuery('لم يعد هنالك حلقات').catch(() => {});
                    }
                });

                // Handle episode watched button press
                bot.action(/^watch_\d+$/, async (ctx) => {
                    const episodeNumber = parseInt(ctx.match[0].split('_')[1]);
                    if (!ctx.session.watchedEpisodes.includes(episodeNumber)) {
                        ctx.session.watchedEpisodes.push(episodeNumber);
                    }
                    // Refresh the current page
                    const updatedButtonGroups = generateButtons(urls, ctx.session.watchedEpisodes);
                    await showPage(ctx, ctx.session.currentPage);
                });
            } else {
                await ctx.reply('لازم تخلي بس روابط بالملف');
            }
        });

        bot.action(`cancel_${randomIdentifier}`, async (ctx) => {
            await ctx.reply('أنلغت العملية');
        });

    } else {
        await ctx.reply('لازم ملف (.txt) ترى');
    }
});
keepAlive();
bot.launch();
