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

// ================= REGISTER COMMANDS =================
client.once(Events.ClientReady, async () => {

    console.log(`🤖 Bot pornit ca ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('cv')
            .setDescription('Completeaza CV-ul'),

        new SlashCommandBuilder()
            .setName('task')
            .setDescription('Creaza task cu data')
            .addUserOption(o =>
                o.setName('membru')
                    .setDescription('Membru')
                    .setRequired(true)
            )
            .addStringOption(o =>
                o.setName('cerinta')
                    .setDescription('Ex: 500k murdar')
                    .setRequired(true)
            )
            .addStringOption(o =>
                o.setName('data')
                    .setDescription('YYYY-MM-DD')
                    .setRequired(true)
            )
            .addStringOption(o =>
                o.setName('ora')
                    .setDescription('HH:mm')
                    .setRequired(true)
            )
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log('✅ Comenzi înregistrate');
    } catch (err) {
        console.error(err);
    }
});

// ================= MAIN HANDLER =================
client.on(Events.InteractionCreate, async interaction => {

    try {

        // ================= /CV =================
        if (interaction.isChatInputCommand() && interaction.commandName === 'cv') {

            if (applications.has(interaction.user.id)) {
                return interaction.reply({
                    content: '❌ Ai deja un CV activ.',
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
                .setFooter({ text: `TASK:${taskId} | USER:${user.id}` })
                .setTimestamp();

            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`task_done_${taskId}`)
                    .setLabel('Task Finalizat')
                    .setStyle(ButtonStyle.Success)
            );

            tasks.set(taskId, { userId: user.id });

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

        // ================= TASK DONE =================
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

            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('Green')
                .spliceFields(3, 1, {
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
                embeds: [updatedEmbed],
                components: [disabled]
            });

            tasks.delete(taskId);

            return interaction.followUp({
                content: '✅ Task trimis la conducere.',
                flags: MessageFlags.Ephemeral
            });
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

        // ================= BUTTON CV =================
        if (interaction.isButton()) {

            const embed = interaction.message.embeds[0];
            const userId = embed.footer?.text?.replace('USER ID: ', '');

            if (!userId) return;

            const member = await interaction.guild.members.fetch(userId);

            // ACCEPT
            if (interaction.customId === 'accept_cv') {

                await member.roles.add(acceptedRoleIds);

                const logChannel = await client.channels.fetch(logChannelId);

                await logChannel.send(`📢 CV ACCEPTAT de ${interaction.user.tag} pentru <@${userId}>`);

                return interaction.reply({
                    content: '✅ CV acceptat',
                    flags: MessageFlags.Ephemeral
                });
            }

            // DECLINE
            if (interaction.customId === 'decline_cv') {

                const logChannel = await client.channels.fetch(logChannelId);

                await logChannel.send(`📢 CV RESPINS de ${interaction.user.tag} pentru <@${userId}>`);

                return interaction.reply({
                    content: '❌ CV respins',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

    } catch (err) {
        console.error(err);
    }
});

// ================= CV MESSAGE (FIXED) =================
client.on(Events.MessageCreate, async message => {

    try {

        if (message.author.bot) return;
        if (!applications.has(message.author.id)) return;
        if (message.attachments.size === 0) return;

        const data = applications.get(message.author.id);
        applications.delete(message.author.id);

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

        await logChannel.send({
            embeds: [embed],
            files: [{
                attachment: attachment.url,
                name: 'buletin.png'
            }]
        });

        await message.delete().catch(() => {});
        await message.author.send('✅ CV trimis spre verificare').catch(() => {});

    } catch (err) {
        console.error(err);
    }
});

// ================= LOGIN =================
client.login(token);
