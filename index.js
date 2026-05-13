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
                o.setName('membru').setRequired(true)
            )
            .addStringOption(o =>
                o.setName('cerinta').setRequired(true)
            )
            .addStringOption(o =>
                o.setName('data').setRequired(true)
            )
            .addStringOption(o =>
                o.setName('ora').setRequired(true)
            )
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(token);

    await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
    );

    console.log('✅ Commands ready');
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

    try {

        // ================= /TASK =================
        if (interaction.isChatInputCommand() && interaction.commandName === 'task') {

            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ Nu ai permisiune.',
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
                    { name: '📅 Data', value: `${data} ${ora}` },
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

        // ================= TASK DONE (PERMISSIONS CONTROL) =================
        if (interaction.isButton() && interaction.customId.startsWith('task_done_')) {

            const taskId = interaction.customId.split('_')[2];
            const task = tasks.get(taskId);

            if (!task) {
                return interaction.reply({
                    content: '❌ Task invalid',
                    flags: MessageFlags.Ephemeral
                });
            }

            const member = await interaction.guild.members.fetch(interaction.user.id);

            const isOwner = interaction.user.id === task.userId;

            const isStaff = member.roles.cache.some(role =>
                acceptedRoleIds.includes(role.id)
            );

            // ❌ NU ARE VOIE
            if (!isOwner && !isStaff) {
                return interaction.reply({
                    content: '❌ Doar persoana asignata sau conducerea poate finaliza task-ul.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const logChannel = await client.channels.fetch(logChannelId);

            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('Green')
                .spliceFields(3, 1, {
                    name: '📌 Status',
                    value: '🟡 PREGATIT PENTRU PREDARE'
                });

            const disabled = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(interaction.component).setDisabled(true)
            );

            await logChannel.send({
                content: `<@&1493768690133499926> <@${task.userId}> este pregatit pentru predarea task-ului.`,
                embeds: [embed]
            });

            await interaction.update({
                embeds: [embed],
                components: [disabled]
            });

            tasks.delete(taskId);

            return interaction.followUp({
                content: '✅ Notificat conducerea pentru predare.',
                flags: MessageFlags.Ephemeral
            });
        }

    } catch (err) {
        console.error(err);
    }
});

// ================= LOGIN =================
client.login(token);
