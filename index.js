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
const tasks = new Map(); // 🔥 TASK STORAGE

// ================= READY =================
client.once(Events.ClientReady, async () => {

    console.log(`🤖 Bot pornit ca ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('cv')
            .setDescription('Completeaza CV-ul'),

        new SlashCommandBuilder()
            .setName('task')
            .setDescription('Creaza un task')
            .addUserOption(option =>
                option.setName('membru')
                    .setDescription('Membrul')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('cerinta')
                    .setDescription('Ex: 500k murdar')
                    .setRequired(true)
            )
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log('✅ Slash commands înregistrate');
    } catch (err) {
        console.error(err);
    }
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

    try {

        // ================= /CV =================
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
                ['telefon', 'Telefon']
            ].map(([id, label]) =>
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(id)
                        .setLabel(label)
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            modal.addComponents(...fields);

            return interaction.showModal(modal);
        }

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

            const taskId = Date.now().toString();

            const embed = new EmbedBuilder()
                .setTitle('📋 TASK NOU')
                .setColor('Yellow')
                .addFields(
                    { name: '👤 Membru', value: `<@${user.id}>` },
                    { name: '📦 Cerinta', value: cerinta },
                    { name: '📌 Status', value: '🟡 In progres' }
                )
                .setFooter({ text: `TASK:${taskId} | USER:${user.id}` })
                .setTimestamp();

            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`task_done_${taskId}`)
                    .setLabel('Task Finalizat')
                    .setStyle(ButtonStyle.Success)
            );

            tasks.set(taskId, {
                userId: user.id,
                cerinta
            });

            const channel = await client.channels.fetch('1497367152397914302');

            await channel.send({
                content: `<@${user.id}>`,
                embeds: [embed],
                components: [button]
            });

            return interaction.reply({
                content: '✅ Task creat.',
                flags: MessageFlags.Ephemeral
            });
        }

        // ================= BUTTON TASK =================
        if (interaction.isButton() && interaction.customId.startsWith('task_done_')) {

            const taskId = interaction.customId.split('_')[2];
            const task = tasks.get(taskId);

            if (!task) {
                return interaction.reply({
                    content: '❌ Task invalid.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.user.id !== task.userId) {
                return interaction.reply({
                    content: '❌ Nu este task-ul tau.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const logChannel = await client.channels.fetch('1503906070010269721');

            const updated = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('Green')
                .spliceFields(2, 1, {
                    name: '📌 Status',
                    value: '✅ FINALIZAT'
                });

            const disabled = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(interaction.component).setDisabled(true)
            );

            await logChannel.send({
                content: `<@&1493768690133499926> Task finalizat de <@${task.userId}>`
            });

            await interaction.update({
                embeds: [updated],
                components: [disabled]
            });

            await interaction.followUp({
                content: '✅ Task trimis spre conducere.',
                flags: MessageFlags.Ephemeral
            });

            tasks.delete(taskId);
        }

        // ================= CV MODAL =================
        if (interaction.isModalSubmit() && interaction.customId === 'cv_modal') {

            applications.set(interaction.user.id, {
                nume: interaction.fields.getTextInputValue('nume'),
                cnp: interaction.fields.getTextInputValue('cnp'),
                luni: interaction.fields.getTextInputValue('luni'),
                angajator: interaction.fields.getTextInputValue('angajator'),
                telefon: interaction.fields.getTextInputValue('telefon')
            });

            return interaction.reply({
                content: '📸 Trimite poza buletinului.',
                flags: MessageFlags.Ephemeral
            });
        }

    } catch (err) {
        console.error(err);
    }
});

// ================= LOGIN =================
client.login(token);
