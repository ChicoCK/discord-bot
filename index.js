require('dotenv').config();
const token = process.env.DISCORD_TOKEN;
const {
    Client,
    GatewayIntentBits,
    Partials,
    SlashCommandBuilder,
    REST,
    Routes,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    Events,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');

const {
    clientId,
    guildId,
    logChannelId,
    acceptedRoleIds
} = require('./config.json');

const client = new Client({

    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],

    partials: [
        Partials.Channel
    ]
});

// ================= STORAGE =================

const applications = new Map();

// ================= READY =================

client.once(Events.ClientReady, async () => {

    console.log(`🤖 Bot pornit ca ${client.user.tag}`);

const commands = [

    new SlashCommandBuilder()

        .setName('cv')

        .setDescription('Completeaza CV-ul'),

    new SlashCommandBuilder()

        .setName('task')

        .setDescription('Adauga un task')

        .addUserOption(option =>

            option

                .setName('membru')

                .setDescription('Alege membrul')

                .setRequired(true)
        )

        .addStringOption(option =>

            option

                .setName('cerinta')

                .setDescription('Task-ul membrului')

                .setRequired(true)
        )

].map(cmd => cmd.toJSON());
    
// ================= ERRORS =================

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// ================= INTERACTIONS =================

client.on(Events.InteractionCreate, async interaction => {

    try {

        // ================= /CV =================

        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === 'cv') {

                if (applications.has(interaction.user.id)) {

                    return interaction.reply({

                        content: '❌ Ai deja un CV in curs.',

                        flags: MessageFlags.Ephemeral
                    });
                }

                const modal = new ModalBuilder()

                    .setCustomId('cv_modal')

                    .setTitle('Aplicatie CV');

                const nume = new TextInputBuilder()

                    .setCustomId('nume')

                    .setLabel('Nume Prenume')

                    .setStyle(TextInputStyle.Short)

                    .setRequired(true);

                const cnp = new TextInputBuilder()

                    .setCustomId('cnp')

                    .setLabel('CNP')

                    .setStyle(TextInputStyle.Short)

                    .setRequired(true);

                const luni = new TextInputBuilder()

                    .setCustomId('luni')

                    .setLabel('Cate luni ai pe oras?')

                    .setStyle(TextInputStyle.Short)

                    .setRequired(true);

                const angajator = new TextInputBuilder()

                    .setCustomId('angajator')

                    .setLabel('Cine te-a angajat?')

                    .setStyle(TextInputStyle.Short)

                    .setRequired(true);

                const telefon = new TextInputBuilder()

                    .setCustomId('telefon')

                    .setLabel('Numar de telefon')

                    .setStyle(TextInputStyle.Short)

                    .setRequired(true);

                modal.addComponents(

                    new ActionRowBuilder().addComponents(nume),

                    new ActionRowBuilder().addComponents(cnp),

                    new ActionRowBuilder().addComponents(luni),

                    new ActionRowBuilder().addComponents(angajator),

                    new ActionRowBuilder().addComponents(telefon)
                );

                return await interaction.showModal(modal);
            }
        }

// ================= /TASK =================

if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'task') {

        if (!interaction.member.permissions.has(
            PermissionFlagsBits.Administrator
        )) {

            return interaction.reply({

                content: '❌ Nu ai permisiune.',

                flags: MessageFlags.Ephemeral
            });
        }

        const membru =
            interaction.options.getUser('membru');

        const cerinta =
            interaction.options.getString('cerinta');

        // CANAL TASK

        const taskChannel =
            await client.channels.fetch(
                '1497367152397914302'
            );

        const embed = new EmbedBuilder()

            .setTitle('📋 TASK NOU')

            .setColor('Yellow')

            .addFields(

                {
                    name: '👤 Membru',
                    value: `<@${membru.id}>`
                },

                {
                    name: '📦 Cerinta',
                    value: cerinta
                },

                {
                    name: '📌 Status',
                    value: '🟡 In progres'
                }
            )

            .setFooter({

                text: `TASK USER ID: ${membru.id}`
            })

            .setTimestamp();

        const button =
            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId('task_done')

                        .setLabel('✅ Task Finalizat')

                        .setStyle(ButtonStyle.Success)
                );

        await taskChannel.send({

            content: `<@${membru.id}>`,

            embeds: [embed],

            components: [button]
        });

        return interaction.reply({

            content: '✅ Task trimis.',

            flags: MessageFlags.Ephemeral
        });
    }
}
        
        // ================= MODAL =================

        if (interaction.isModalSubmit()) {

            if (interaction.customId === 'cv_modal') {

                applications.set(interaction.user.id, {

                    nume: interaction.fields.getTextInputValue('nume'),

                    cnp: interaction.fields.getTextInputValue('cnp'),

                    luni: interaction.fields.getTextInputValue('luni'),

                    angajator: interaction.fields.getTextInputValue('angajator'),

                    telefon: interaction.fields.getTextInputValue('telefon')
                });

                return await interaction.reply({

                    content: '📸 Acum trimite poza buletinului.',

                    flags: MessageFlags.Ephemeral
                });
            }
        }

// ================= BUTTONS =================

if (interaction.isButton()) {

    const embed = interaction.message.embeds[0];

    const userId = embed.footer.text.replace(
        'USER ID: ',
        ''
    );

    const member = await interaction.guild.members.fetch(userId);

    // ACCEPT

    if (interaction.customId === 'accept_cv') {

        await member.roles.add(acceptedRoleIds);

        await member.send(
            '✅ Aplicatia ta a fost ACCEPTATA.'
        ).catch(() => {});

        const logChannel = await client.channels.fetch(logChannelId);

        await logChannel.send(
            `📢 Supervizorul ${interaction.user.tag} a ACCEPTAT CV-ul lui <@${userId}> !`
        );

        return await interaction.reply({

            content: '✅ CV acceptat.',

            flags: MessageFlags.Ephemeral
        });
    }

// DECLINE
if (interaction.customId === 'decline_cv') {

    await member.send('❌ Aplicatia ta a fost RESPINSA.').catch(() => {});

    const logChannel = await client.channels.fetch(logChannelId);

    await logChannel.send(
        `📢 Supervizorul ${interaction.user.tag} a RESPINS CV-ul lui <@${userId}> !`
    );

    return await interaction.reply({
        content: '❌ CV respins.',
        flags: MessageFlags.Ephemeral
    });
}

// ================= TASK DONE =================
if (interaction.customId === 'task_done') {

    const embed = interaction.message.embeds[0];

    const userId = embed.footer.text.replace('TASK USER ID: ', '');

    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Acest task nu este al tau.',
            flags: MessageFlags.Ephemeral
        });
    }

    const logChannel = await client.channels.fetch('1503906070010269721');

    const updatedEmbed = EmbedBuilder.from(embed)
        .setColor('Green')
        .spliceFields(2, 1, {
            name: '📌 Status',
            value: '✅ FINALIZAT'
        });

    const disabledButton = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(
            interaction.message.components[0].components[0]
        ).setDisabled(true)
    );

    await logChannel.send({
        content: `<@&1493768690133499926> Task finalizat de <@${userId}>.`,
        embeds: [updatedEmbed]
    });

    await interaction.update({
        embeds: [updatedEmbed],
        components: [disabledButton]
    });

    return interaction.followUp({
        content: '✅ Task-ul tau a fost trimis catre conducere.',
        flags: MessageFlags.Ephemeral
    });
}

// ================= MESSAGE CREATE =================

client.on(Events.MessageCreate, async message => {

    try {

        if (message.author.bot) return;

        if (!applications.has(message.author.id)) return;

        if (message.attachments.size === 0) {

            return;
        }

        const data = applications.get(message.author.id);

        applications.delete(message.author.id);

        const attachment = message.attachments.first();

        const logChannel = await client.channels.fetch(
            logChannelId
        );

        const embed = new EmbedBuilder()

            .setTitle('📋 CV NOU')

            .setColor('Red')

            .addFields(

                { name: '👤 Nume', value: data.nume },

                { name: '🆔 CNP / ID', value: data.cnp },

                { name: '📅 Luni', value: data.luni },

                { name: '👨‍💼 Angajator', value: data.angajator },

                { name: '📱 Telefon', value: data.telefon }
            )

            .setImage('attachment://buletin.png')

            .setFooter({

                text: `USER ID: ${message.author.id}`
            });

        const buttons = new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()

                    .setCustomId('accept_cv')

                    .setLabel('ACCEPT')

                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()

                    .setCustomId('decline_cv')

                    .setLabel('DECLINE')

                    .setStyle(ButtonStyle.Danger)
            );

        await logChannel.send({

            embeds: [embed],

            components: [buttons],

            files: [

                {
                    attachment: attachment.url,

                    name: 'buletin.png'
                }
            ]
        });

        await message.delete().catch(() => {});

        await message.author.send(
            '✅ CV-ul tau a fost trimis spre verificare.'
        ).catch(() => {});

    } catch (err) {

        console.error(err);
    }
});

client.login(process.env.DISCORD_TOKEN);
