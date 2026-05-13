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
                o.setName('membru').setRequired(true).setDescription('User')
            )
            .addStringOption(o =>
                o.setName('cerinta').setRequired(true).setDescription('Ex: 500k murdar')
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

        // ================= /CV (UNCHANGED LOGIC) =================
        if (interaction.isChatInputCommand() && interaction.commandName === 'cv') {

            if (applications.has(interaction.user.id)) {
                return interaction.reply({
                    content: '❌ Ai deja un CV in curs.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const modal = new ModalBuilder()
                .setCustomId('cv_modal')
                .setTitle('Aplicatie CV');

            const fields = [
                ['nume', 'Nume Prenume'],
                ['cnp', 'CNP'],
                ['luni', 'Cate luni ai pe oras?'],
                ['angajator', 'Cine te-a angajat?'],
                ['telefon', 'Numar de telefon']
            ];

            const components = fields.map(([id, label]) =>
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(id)
                        .setLabel(label)
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            modal.addComponents(...components);

            return interaction.showModal(modal);
        }

        // ================= MODAL =================
        if (interaction.isModalSubmit() && interaction.customId === 'cv_modal') {

            applications.set(interaction.user.id, {
                nume: interaction.fields.getTextInputValue('nume'),
                cnp: interaction.fields.getTextInputValue('cnp'),
                luni: interaction.fields.getTextInputValue('luni'),
                angajator: interaction.fields.getTextInputValue('angajator'),
                telefon: interaction.fields.getTextInputValue('telefon'),
                step: 'waiting_attachment'
            });

            return interaction.reply({
                content: '📸 Acum trimite poza buletinului.',
                flags: MessageFlags.Ephemeral
            });
        }

        // ================= MESSAGE CREATE FIXED =================
        if (interaction.isButton() === false && interaction.isChatInputCommand() === false) {
            // ignore
        }

    } catch (err) {
        console.error(err);
    }
});

// ================= MESSAGE (FIX IMPORTANT) =================
client.on(Events.MessageCreate, async message => {

    try {

        if (message.author.bot) return;

        const data = applications.get(message.author.id);

        if (!data) return;

        if (message.attachments.size === 0) return;

        const attachment = message.attachments.first();

        const logChannel = await client.channels.fetch(logChannelId);

        const embed = new EmbedBuilder()
            .setTitle('📋 CV NOU')
            .setColor('Red')
            .addFields(
                { name: '👤 Nume', value: data.nume },
                { name: '🆔 CNP', value: data.cnp },
                { name: '📅 Luni', value: data.luni },
                { name: '👨‍💼 Angajator', value: data.angajator },
                { name: '📱 Telefon', value: data.telefon }
            )
            .setImage('attachment://buletin.png')
            .setFooter({ text: `USER ID: ${message.author.id}` });

        const buttons = new ActionRowBuilder().addComponents(
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
            files: [{
                attachment: attachment.url,
                name: 'buletin.png'
            }]
        });

        applications.delete(message.author.id);

        await message.delete().catch(() => {});

        await message.author.send('✅ CV trimis cu succes').catch(() => {});

    } catch (err) {
        console.error(err);
    }
});

// ================= BUTTONS =================
client.on(Events.InteractionCreate, async interaction => {

    try {

        if (!interaction.isButton()) return;

        // ================= CV ACCEPT =================
        if (interaction.customId === 'accept_cv') {

            const embed = interaction.message.embeds[0];
            const userId = embed.footer.text.replace('USER ID: ', '');

            const member = await interaction.guild.members.fetch(userId);

            await member.roles.add(acceptedRoleIds);

            const logChannel = await client.channels.fetch(logChannelId);

            await logChannel.send(`📢 Supervizorul ${interaction.user.tag} a ACCEPTAT CV-ul lui <@${userId}> !`);

            return interaction.reply({
                content: '✅ CV acceptat.',
                flags: MessageFlags.Ephemeral
            });
        }

        // ================= CV DECLINE =================
        if (interaction.customId === 'decline_cv') {

            const embed = interaction.message.embeds[0];
            const userId = embed.footer.text.replace('USER ID: ', '');

            const member = await interaction.guild.members.fetch(userId);

            await member.send('❌ CV respins.').catch(() => {});

            const logChannel = await client.channels.fetch(logChannelId);

            await logChannel.send(`📢 Supervizorul ${interaction.user.tag} a RESPINS CV-ul lui <@${userId}> !`);

            return interaction.reply({
                content: '❌ CV respins.',
                flags: MessageFlags.Ephemeral
            });
        }

        // ================= TASK =================
        if (interaction.customId.startsWith('task_done_')) {

            const taskId = interaction.customId.split('_')[2];
            const task = tasks.get(taskId);

            if (!task) {
                return interaction.reply({
                    content: '❌ Task invalid',
                    flags: MessageFlags.Ephemeral
                });
            }

            const isOwner = interaction.user.id === task.userId;

            const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

            if (!isOwner && !isStaff) {
                return interaction.reply({
                    content: '❌ Nu ai voie.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const logChannel = await client.channels.fetch(logChannelId);

            await logChannel.send(
                `📢 <@${task.userId}> este pregatit pentru predarea task-ului.`
            );

            const msg = interaction.message;

            const newEmbed = EmbedBuilder.from(msg.embeds[0])
                .setColor('Green');

            const disabledButton = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(msg.components[0].components[0]).setDisabled(true)
            );

            await interaction.update({
                embeds: [newEmbed],
                components: [disabledButton]
            });

            tasks.delete(taskId);
        }

        // ================= /TASK =================
        if (interaction.isChatInputCommand() && interaction.commandName === 'task') {

            const user = interaction.options.getUser('membru');
            const cerinta = interaction.options.getString('cerinta');

            const taskId = Date.now().toString();

            tasks.set(taskId, { userId: user.id });

            const embed = new EmbedBuilder()
                .setTitle('📋 TASK')
                .setColor('Yellow')
                .addFields(
                    { name: 'User', value: `<@${user.id}>` },
                    { name: 'Cerinta', value: cerinta },
                    { name: 'Status', value: 'In progres' }
                )
                .setFooter({ text: `TASK:${taskId}` });

            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`task_done_${taskId}`)
                    .setLabel('Task Finalizat')
                    .setStyle(ButtonStyle.Success)
            );

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
