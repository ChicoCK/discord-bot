require('dotenv').config();

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

const token = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// ================= STORAGE =================
const applications = new Map();
const tasks = new Map();

// ================= READY =================
client.once(Events.ClientReady, async () => {

    console.log(`🤖 Bot pornit ca ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('cv')
            .setDescription('Completeaza CV-ul'),

        new SlashCommandBuilder()
            .setName('task')
            .setDescription('Creaza task')
            .addUserOption(o =>
                o.setName('membru').setDescription('Membru').setRequired(true)
            )
            .addStringOption(o =>
                o.setName('cerinta').setDescription('Ex: 500k murdar').setRequired(true)
            )
            .addStringOption(o =>
                o.setName('data').setDescription('YYYY-MM-DD').setRequired(true)
            )
            .addStringOption(o =>
                o.setName('ora').setDescription('HH:mm').setRequired(true)
            )
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(token);

    await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
    );

    console.log('✅ Commands loaded');
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

    try {

        // ================= /CV (UNCHANGED EXACTLY) =================
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

        // ================= CV BUTTONS (UNCHANGED) =================
        if (interaction.isButton()) {

            const embed = interaction.message.embeds[0];

            const userId = embed.footer.text.replace('USER ID: ', '');

            const member = await interaction.guild.members.fetch(userId);

            if (interaction.customId === 'accept_cv') {

                await member.roles.add(acceptedRoleIds);

                await member.send('✅ Aplicatia ta a fost ACCEPTATA.').catch(() => {});

                const logChannel = await client.channels.fetch(logChannelId);

                await logChannel.send(
                    `📢 Supervizorul ${interaction.user.tag} a ACCEPTAT CV-ul lui <@${userId}> !`
                );

                return interaction.reply({
                    content: '✅ CV acceptat.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.customId === 'decline_cv') {

                await member.send('❌ Aplicatia ta a fost RESPINSA.').catch(() => {});

                const logChannel = await client.channels.fetch(logChannelId);

                await logChannel.send(
                    `📢 Supervizorul ${interaction.user.tag} a RESPINS CV-ul lui <@${userId}> !`
                );

                return interaction.reply({
                    content: '❌ CV respins.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        // ================= TASK DONE (NEW SAFE SYSTEM) =================
        if (interaction.isButton() && interaction.customId.startsWith('task_done_')) {

            const taskId = interaction.customId.replace('task_done_', '');
            const task = tasks.get(taskId);

            if (!task) {
                return interaction.reply({
                    content: '❌ Task invalid sau expirat',
                    flags: MessageFlags.Ephemeral
                });
            }

            const member = await interaction.guild.members.fetch(interaction.user.id);

            const isOwner = interaction.user.id === task.userId;

            const isStaff = member.roles.cache.some(r =>
                acceptedRoleIds.includes(r.id)
            );

            if (!isOwner && !isStaff) {
                return interaction.reply({
                    content: '❌ Doar userul sau conducerea poate finaliza task-ul.',
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.deferUpdate();

            const logChannel = await client.channels.fetch(logChannelId);

            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('Green')
                .addFields({
                    name: '📌 Status',
                    value: '🟡 PREGATIT PENTRU PREDARE'
                });

            await logChannel.send(
                `<@&1493768690133499926> <@${task.userId}> este pregatit pentru predarea task-ului.`
            );

            await interaction.message.edit({
                embeds: [updatedEmbed],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`task_done_${taskId}`)
                            .setLabel('Task Finalizat')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(true)
                    )
                ]
            });

            tasks.delete(taskId);
        }

        // ================= /TASK =================
        if (interaction.isChatInputCommand() && interaction.commandName === 'task') {

            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ Nu ai permisiune',
                    flags: MessageFlags.Ephemeral
                });
            }

            const user = interaction.options.getUser('membru');
            const cerinta = interaction.options.getString('cerinta');
            const data = interaction.options.getString('data');
            const ora = interaction.options.getString('ora');

            const taskId = Date.now().toString();

            const embed = new EmbedBuilder()
                .setTitle('📋 TASK NOU')
                .setColor('Yellow')
                .addFields(
                    { name: '👤 Membru', value: `<@${user.id}>` },
                    { name: '📦 Cerinta', value: cerinta },
                    { name: '📅 Deadline', value: `${data} ${ora}` },
                    { name: '📌 Status', value: '🟡 In progres' }
                )
                .setFooter({ text: `TASK:${taskId} | USER:${user.id}` });

            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`task_done_${taskId}`)
                    .setLabel('Task Finalizat')
                    .setStyle(ButtonStyle.Success)
            );

            tasks.set(taskId, {
                userId: user.id
            });

            const channel = await client.channels.fetch('1497367152397914302');

            await channel.send({
                content: `<@${user.id}>`,
                embeds: [embed],
                components: [button]
            });

            return interaction.reply({
                content: '✅ Task creat',
                flags: MessageFlags.Ephemeral
            });
        }

    } catch (err) {
        console.error(err);
    }
});

// ================= LOGIN =================
client.login(token);
