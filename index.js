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
    MessageFlags
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

    partials: [
        Partials.Channel
    ]
});

// ================= STORAGE =================

const applications = new Map();
const tasks = new Map();

const warns = new Map();
const amenzi = new Map();

const invoices = new Map(); // invoice storage
const invoiceLogs = new Map(); // invoice history

// ================= CONFIG TASK =================

const taskChannelId = '1494860985066848357';
const taskLogsChannelId = '1503906070010269721';

const leadershipRoleIds = [
    '1493768690133499926'
];

// ================= READY =================

client.once(Events.ClientReady, async () => {

    console.log(`🤖 Bot pornit ca ${client.user.tag}`);

    const commands = [

        // ================= CV =================

        new SlashCommandBuilder()

            .setName('cv')

            .setDescription('Completeaza CV-ul'),

        // ================= TASK =================

        new SlashCommandBuilder()

            .setName('task')

            .setDescription('Creaza un task')

            .addUserOption(option =>

                option.setName('membru')

                    .setDescription('Membrul care primeste task')

                    .setRequired(true)
            )

            .addStringOption(option =>

                option.setName('cerinta')

                    .setDescription('Cerinta task-ului')

                    .setRequired(true)
            )

            .addStringOption(option =>

                option.setName('data')

                    .setDescription('Data deadline')

                    .setRequired(true)
            )

            .addStringOption(option =>

                option.setName('ora')

                    .setDescription('Ora deadline')

                    .setRequired(true)
            ),

        // ================= WARN =================

        new SlashCommandBuilder()

            .setName('warn')

            .setDescription('Acorda warn')

            .addUserOption(option =>

                option.setName('membru')

                    .setDescription('Membrul')

                    .setRequired(true)
            )

            .addStringOption(option =>

                option.setName('motiv')

                    .setDescription('Motivul')

                    .setRequired(true)
            ),

        new SlashCommandBuilder()

            .setName('warns')

            .setDescription('Vezi warn-urile')

            .addUserOption(option =>

                option.setName('membru')

                    .setDescription('Membrul')

                    .setRequired(true)
            ),

        new SlashCommandBuilder()

            .setName('clearwarns')

            .setDescription('Sterge warn-urile')

            .addUserOption(option =>

                option.setName('membru')

                    .setDescription('Membrul')

                    .setRequired(true)
            ),

        new SlashCommandBuilder()

    .setName('clearamenzi')

    .setDescription('Sterge toate amenzile unui membru')

    .addUserOption(option =>

        option.setName('membru')

            .setDescription('Membrul')

            .setRequired(true)
    ),
        // ================= AMENZI =================

        new SlashCommandBuilder()

            .setName('amenda')

            .setDescription('Acorda amenda')

            .addUserOption(option =>

                option.setName('membru')

                    .setDescription('Membrul')

                    .setRequired(true)
            )

            .addIntegerOption(option =>

                option.setName('suma')

                    .setDescription('Suma')

                    .setRequired(true)
            )

            .addStringOption(option =>

                option.setName('motiv')

                    .setDescription('Motiv')

                    .setRequired(true)
            ),

        new SlashCommandBuilder()

            .setName('amenzi')

            .setDescription('Vezi amenzile')

            .addUserOption(option =>

                option.setName('membru')

                    .setDescription('Membrul')

                    .setRequired(true)
            ),

        // ================= PROFIL =================

        new SlashCommandBuilder()

            .setName('profil')

            .setDescription('Vezi profilul')

            .addUserOption(option =>

                option.setName('membru')

                    .setDescription('Membrul')

                    .setRequired(true)
            ),

        // ================= INVOICE =================

        new SlashCommandBuilder()

            .setName('invoice')

            .setDescription('Sistem facturi')

            .addSubcommand(cmd =>
                cmd.setName('create')
                    .setDescription('Creaza o factura noua')
                    .addUserOption(opt =>
                        opt.setName('client')
                            .setDescription('Clientul')
                            .setRequired(true)
                    )
                    .addStringOption(opt =>
                        opt.setName('descriere')
                            .setDescription('Descrierea serviciului')
                            .setRequired(true)
                    )
                    .addIntegerOption(opt =>
                        opt.setName('suma')
                            .setDescription('Suma facturii')
                            .setRequired(true)
                    )
            )

            .addSubcommand(cmd =>
                cmd.setName('view')
                    .setDescription('Vezi facturile unui client')
                    .addUserOption(opt =>
                        opt.setName('client')
                            .setDescription('Clientul')
                            .setRequired(true)
                    )
            )

            .addSubcommand(cmd =>
                cmd.setName('pay')
                    .setDescription('Marcheaza o factura ca platita')
                    .addStringOption(opt =>
                        opt.setName('invoice_id')
                            .setDescription('ID-ul facturii')
                            .setRequired(true)
                    )
            )

            .addSubcommand(cmd =>
                cmd.setName('logs')
                    .setDescription('Vezi logurile facturilor')
            )

    ].map(cmd => cmd.toJSON());

    const rest = new REST({
        version: '10'
    }).setToken(token);

    try {

        await rest.put(

            Routes.applicationGuildCommands(
                clientId,
                guildId
            ),

            {
                body: commands
            }
        );

        console.log('✅ Slash commands înregistrate.');

    } catch (err) {

        console.error(err);
    }
});

// ================= ERRORS =================

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// ================= INTERACTIONS =================

client.on(Events.InteractionCreate, async interaction => {

    try {

        if (interaction.isChatInputCommand()) {
            
            // =====================================================
            // /CV
            // =====================================================

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

            // =====================================================
            // /TASK
            // =====================================================

            if (interaction.commandName === 'task') {

                const isLeadership = interaction.member.roles.cache.some(role =>
                    leadershipRoleIds.includes(role.id)
                );

                if (!isLeadership) {

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

                tasks.set(taskId, {

                    userId: user.id
                });

                const embed = new EmbedBuilder()

                    .setTitle('📋 TASK NOU')

                    .setColor('Yellow')

                    .addFields(

                        {
                            name: '👤 Membru',
                            value: `<@${user.id}>`
                        },

                        {
                            name: '📦 Cerinta',
                            value: cerinta
                        },

                        {
                            name: '📅 Deadline',
                            value: `${data} la ${ora}`
                        },

                        {
                            name: '📌 Status',
                            value: '🟡 In progres'
                        }
                    )

                    .setFooter({

                        text: `TASK ID: ${taskId}`
                    })

                    .setTimestamp();

                const buttons = new ActionRowBuilder()

                    .addComponents(

                        new ButtonBuilder()

                            .setCustomId(`task_done_${taskId}`)

                            .setLabel('Task Finalizat')

                            .setStyle(ButtonStyle.Success)
                    );

                const channel = await client.channels.fetch(taskChannelId);

                await channel.send({

                    content: `<@${user.id}>`,

                    embeds: [embed],

                    components: [buttons]
                });

                return interaction.reply({

                    content: '✅ Task creat.',

                    flags: MessageFlags.Ephemeral
                });
            }

            // =====================================================
            // /WARN
            // =====================================================

            if (interaction.commandName === 'warn') {

                const isLeadership = interaction.member.roles.cache.some(role =>
                    leadershipRoleIds.includes(role.id)
                );

                if (!isLeadership) {

                    return interaction.reply({

                        content: '❌ Nu ai permisiune.',

                        flags: MessageFlags.Ephemeral
                    });
                }

                const user = interaction.options.getUser('membru');
                const motiv = interaction.options.getString('motiv');

                if (!warns.has(user.id)) {

                    warns.set(user.id, []);
                }

                const userWarns = warns.get(user.id);

                userWarns.push({

                    moderator: interaction.user.tag,
                    motiv,
                    data: new Date().toLocaleDateString()
                });

                const embed = new EmbedBuilder()

                    .setTitle('⚠️ WARN NOU')

                    .setColor('Orange')

                    .addFields(

                        {
                            name: '👤 Membru',
                            value: `<@${user.id}>`
                        },

                        {
                            name: '📌 Motiv',
                            value: motiv
                        },

                        {
                            name: '🛡️ Acordat de',
                            value: interaction.user.tag
                        },

                        {
                            name: '🔢 Total Warn-uri',
                            value: `${userWarns.length}`
                        }
                    )

                    .setTimestamp();

                const logChannel = await client.channels.fetch(logChannelId);

                await logChannel.send({

                    embeds: [embed]
                });

                return interaction.reply({

                    content: `⚠️ ${user.tag} a primit warn.`,

                    flags: MessageFlags.Ephemeral
                });
            }

            // =====================================================
            // /WARNS
            // =====================================================

            if (interaction.commandName === 'warns') {

                const user = interaction.options.getUser('membru');

                const userWarns = warns.get(user.id) || [];

                if (userWarns.length === 0) {

                    return interaction.reply({

                        content: '✅ Acest membru nu are warn-uri.',

                        flags: MessageFlags.Ephemeral
                    });
                }

                const text = userWarns.map((warn, index) =>

                    `${index + 1}. ${warn.motiv} • ${warn.moderator}`
                ).join('\n');

                const embed = new EmbedBuilder()

                    .setTitle(`⚠️ Warn-uri ${user.tag}`)

                    .setColor('Orange')

                    .setDescription(text);

                return interaction.reply({

                    embeds: [embed],

                    flags: MessageFlags.Ephemeral
                });
            }

            // =====================================================
            // /CLEARWARNS
            // =====================================================

            if (interaction.commandName === 'clearwarns') {

                const isLeadership = interaction.member.roles.cache.some(role =>
                    leadershipRoleIds.includes(role.id)
                );

                if (!isLeadership) {

                    return interaction.reply({

                        content: '❌ Nu ai permisiune.',

                        flags: MessageFlags.Ephemeral
                    });
                }

                const user = interaction.options.getUser('membru');

                warns.delete(user.id);

                return interaction.reply({

                    content: `✅ Warn-urile lui ${user.tag} au fost sterse.`,

                    flags: MessageFlags.Ephemeral
                });
            }

            // =====================================================
            // /AMENDA
            // =====================================================

            if (interaction.commandName === 'amenda') {

                const isLeadership = interaction.member.roles.cache.some(role =>
                    leadershipRoleIds.includes(role.id)
                );

                if (!isLeadership) {

                    return interaction.reply({

                        content: '❌ Nu ai permisiune.',

                        flags: MessageFlags.Ephemeral
                    });
                }

                const user = interaction.options.getUser('membru');

                const suma = interaction.options.getInteger('suma');

                const motiv = interaction.options.getString('motiv');

                if (!amenzi.has(user.id)) {

                    amenzi.set(user.id, []);
                }

                const userAmenzi = amenzi.get(user.id);

                userAmenzi.push({

                    suma,
                    motiv,
                    moderator: interaction.user.tag,
                    data: new Date().toLocaleDateString()
                });

                const embed = new EmbedBuilder()

                    .setTitle('💸 AMENDA NOUA')

                    .setColor('Red')

                    .addFields(

                        {
                            name: '👤 Membru',
                            value: `<@${user.id}>`
                        },

                        {
                            name: '💰 Suma',
                            value: `${suma}$`
                        },

                        {
                            name: '📌 Motiv',
                            value: motiv
                        },

                        {
                            name: '🛡️ Acordata de',
                            value: interaction.user.tag
                        }
                    )

                    .setTimestamp();

                const logChannel = await client.channels.fetch(logChannelId);

                await logChannel.send({

                    embeds: [embed]
                });

                return interaction.reply({

                    content: `💸 ${user.tag} a primit amenda.`,

                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.commandName === 'clearamenzi') {

    const isLeadership = interaction.member.roles.cache.some(role =>
        leadershipRoleIds.includes(role.id)
    );

    if (!isLeadership) {

        return interaction.reply({

            content: '❌ Nu ai permisiune.',

            flags: MessageFlags.Ephemeral
        });
    }

    const user = interaction.options.getUser('membru');

    if (!amenzi.has(user.id)) {

        return interaction.reply({

            content: 'ℹ️ Acest membru nu are amenzi.',

            flags: MessageFlags.Ephemeral
        });
    }

    const total = amenzi.get(user.id).reduce((acc, a) => acc + a.suma, 0);

    amenzi.delete(user.id);

    const logChannel = await client.channels.fetch(logChannelId);

    await logChannel.send({

        embeds: [
            new EmbedBuilder()
                .setTitle('💸 AMENZI RESETATE')
                .setColor('Green')
                .addFields(
                    {
                        name: '👤 Membru',
                        value: `<@${user.id}>`
                    },
                    {
                        name: '🛡️ De către',
                        value: interaction.user.tag
                    },
                    {
                        name: '💰 Total șters',
                        value: `${total}$`
                    }
                )
                .setTimestamp()
        ]
    });

    return interaction.reply({

        content: `✅ Amenzile lui ${user.tag} au fost șterse.`,

        flags: MessageFlags.Ephemeral
    });
}
            
            // =====================================================
            // /AMENZI
            // =====================================================

            if (interaction.commandName === 'amenzi') {

                const user = interaction.options.getUser('membru');

                const userAmenzi = amenzi.get(user.id) || [];

                if (userAmenzi.length === 0) {

                    return interaction.reply({

                        content: '✅ Acest membru nu are amenzi.',

                        flags: MessageFlags.Ephemeral
                    });
                }

                const total = userAmenzi.reduce((acc, item) =>
                    acc + item.suma, 0
                );

                const text = userAmenzi.map((amenda, index) =>

                    `${index + 1}. ${amenda.suma}$ • ${amenda.motiv}`
                ).join('\n');

                const embed = new EmbedBuilder()

                    .setTitle(`💸 Amenzi ${user.tag}`)

                    .setColor('Red')

                    .setDescription(text)

                    .addFields({

                        name: '💰 Total',

                        value: `${total}$`
                    });

                return interaction.reply({

                    embeds: [embed],

                    flags: MessageFlags.Ephemeral
                });
            }

            // =====================================================
            // /PROFIL
            // =====================================================

            if (interaction.commandName === 'profil') {

                const user = interaction.options.getUser('membru');

                const userWarns = warns.get(user.id) || [];

                const userAmenzi = amenzi.get(user.id) || [];

                const totalAmenzi = userAmenzi.reduce((acc, item) =>
                    acc + item.suma, 0
                );

                const embed = new EmbedBuilder()

                    .setTitle(`👤 Profil ${user.tag}`)

                    .setColor('Blue')

                    .addFields(

                        {
                            name: '⚠️ Warn-uri',
                            value: `${userWarns.length}`,
                            inline: true
                        },

                        {
                            name: '💸 Amenzi',
                            value: `${totalAmenzi}$`,
                            inline: true
                        },

                        {
                            name: '📋 Task-uri',
                            value: 'In curand',
                            inline: true
                        }
                    )

                    .setThumbnail(user.displayAvatarURL())

                    .setTimestamp();

                return interaction.reply({

                    embeds: [embed],

                    flags: MessageFlags.Ephemeral
                });
            }

            // =====================================================
            // /INVOICE
            // =====================================================

            if (interaction.commandName === 'invoice') {

                const isLeadership = interaction.member.roles.cache.some(role =>
                    leadershipRoleIds.includes(role.id)
                );

                if (!isLeadership) {

                    return interaction.reply({

                        content: '❌ Nu ai permisiune.',

                        flags: MessageFlags.Ephemeral
                    });
                }

                const sub = interaction.options.getSubcommand();
                const logChannel = await client.channels.fetch(logChannelId);

                // ================= CREATE =================

                if (sub === 'create') {

                    const client_user = interaction.options.getUser('client');
                    const descriere = interaction.options.getString('descriere');
                    const suma = interaction.options.getInteger('suma');

                    const invoiceId = 'INV-' + Date.now().toString();

                    if (!invoices.has(client_user.id)) {
                        invoices.set(client_user.id, []);
                    }

                    invoices.get(client_user.id).push({
                        id: invoiceId,
                        descriere,
                        suma,
                        status: 'PENDING',
                        createdAt: new Date().toLocaleDateString(),
                        createdBy: interaction.user.tag,
                        paidAt: null
                    });

                    if (!invoiceLogs.has('all')) {
                        invoiceLogs.set('all', []);
                    }

                    invoiceLogs.get('all').push({
                        action: 'CREATE',
                        invoiceId,
                        client: client_user.tag,
                        suma,
                        user: interaction.user.tag,
                        data: new Date().toLocaleString()
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('📄 FACTURA NOUA')
                        .setColor('Blue')
                        .addFields(
                            { name: '👤 Client', value: `<@${client_user.id}>` },
                            { name: '📝 Descriere', value: descriere },
                            { name: '💰 Suma', value: `${suma}$` },
                            { name: '📌 Status', value: '🔴 PENDING' },
                            { name: '🆔 Invoice ID', value: invoiceId }
                        )
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] });

                    return interaction.reply({
                        content: `✅ Factura creata cu ID: \`${invoiceId}\``,
                        flags: MessageFlags.Ephemeral
                    });
                }

                // ================= VIEW =================

                if (sub === 'view') {

                    const client_user = interaction.options.getUser('client');
                    const userInvoices = invoices.get(client_user.id) || [];

                    if (userInvoices.length === 0) {

                        return interaction.reply({
                            content: '✅ Acest client nu are facturi.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const text = userInvoices.map((inv, index) =>

                        `${index + 1}. **${inv.id}** | ${inv.suma}$ | ${inv.status} | ${inv.descriere}`
                    ).join('\n');

                    const totalAmount = userInvoices.reduce((acc, item) => acc + item.suma, 0);
                    const pendingAmount = userInvoices.filter(inv => inv.status === 'PENDING').reduce((acc, item) => acc + item.suma, 0);

                    const embed = new EmbedBuilder()
                        .setTitle(`📄 Facturi ${client_user.tag}`)
                        .setColor('Blue')
                        .setDescription(text)
                        .addFields(
                            { name: '💰 Total', value: `${totalAmount}$`, inline: true },
                            { name: '🔴 De plată', value: `${pendingAmount}$`, inline: true }
                        )
                        .setTimestamp();

                    return interaction.reply({
                        embeds: [embed],
                        flags: MessageFlags.Ephemeral
                    });
                }

                // ================= PAY =================

                if (sub === 'pay') {

                    const invoiceId = interaction.options.getString('invoice_id');
                    let found = false;

                    invoices.forEach((userInvoices, userId) => {
                        const invoice = userInvoices.find(inv => inv.id === invoiceId);

                        if (invoice) {
                            if (invoice.status === 'PAID') {
                                found = 'already';
                                return;
                            }

                            invoice.status = 'PAID';
                            invoice.paidAt = new Date().toLocaleDateString();

                            found = true;

                            invoiceLogs.get('all').push({
                                action: 'PAID',
                                invoiceId,
                                suma: invoice.suma,
                                user: interaction.user.tag,
                                data: new Date().toLocaleString()
                            });

                            const embed = new EmbedBuilder()
                                .setTitle('✅ FACTURA PLATITA')
                                .setColor('Green')
                                .addFields(
                                    { name: '🆔 Invoice ID', value: invoiceId },
                                    { name: '💰 Suma', value: `${invoice.suma}$` },
                                    { name: '📅 Data plații', value: invoice.paidAt },
                                    { name: '🛡️ De către', value: interaction.user.tag }
                                )
                                .setTimestamp();

                            logChannel.send({ embeds: [embed] });
                        }
                    });

                    if (found === 'already') {
                        return interaction.reply({
                            content: '❌ Aceasta factura a fost deja platita.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    if (!found) {
                        return interaction.reply({
                            content: '❌ Factura nu a fost gasita.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    return interaction.reply({
                        content: `✅ Factura ${invoiceId} marcata ca platita.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                // ================= LOGS =================

                if (sub === 'logs') {

                    const allLogs = invoiceLogs.get('all') || [];

                    if (allLogs.length === 0) {
                        return interaction.reply({
                            content: '❌ Nu exista loguri.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    let text = '';
                    allLogs.slice(-10).forEach(log => {
                        text += `\`${log.action}\` | ${log.invoiceId} | ${log.suma}$ | ${log.user} | ${log.data}\n`;
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('📜 INVOICE LOGS')
                        .setColor('Blue')
                        .setDescription(text)
                        .setTimestamp();

                    return interaction.reply({
                        embeds: [embed],
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        }

        // =====================================================
        // MODAL CV
        // =====================================================

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

        // =====================================================
        // BUTTONS
        // =====================================================

        if (interaction.isButton()) {

            // =====================================================
            // TASK BUTTON
            // =====================================================

            if (interaction.customId.startsWith('task_done_')) {

                const embed = interaction.message.embeds[0];

                const membruField = embed.fields.find(
                    field => field.name === '👤 Membru'
                );

                if (!membruField) {

                    return interaction.reply({

                        content: '❌ Task invalid.',

                        flags: MessageFlags.Ephemeral
                    });
                }

                const mentionedUserId = membruField.value.replace(/[<@!>]/g, '');

                const isOwner = interaction.user.id === mentionedUserId;

                const isLeadership = interaction.member.roles.cache.some(role =>
                    leadershipRoleIds.includes(role.id)
                );

                if (!isOwner && !isLeadership) {

                    return interaction.reply({

                        content: '❌ Nu ai permisiune sa folosesti acest buton.',

                        flags: MessageFlags.Ephemeral
                    });
                }

                const updatedEmbed = EmbedBuilder.from(
                    interaction.message.embeds[0]
                )

                    .setColor('Green')

                    .spliceFields(3, 1, {

                        name: '📌 Status',

                        value: '✅ FINALIZAT'
                    });

                const disabledButtons = new ActionRowBuilder()

                    .addComponents(

                        ButtonBuilder.from(interaction.component)

                            .setDisabled(true)
                    );

                await interaction.update({

                    embeds: [updatedEmbed],

                    components: [disabledButtons]
                });

                const logsChannel = await client.channels.fetch(
                    taskLogsChannelId
                );

                await logsChannel.send(
                    `📢 <@${mentionedUserId}> este pregatit pentru predarea task-ului.`
                );

                return;
            }

            // =====================================================
            // CV BUTTONS
            // =====================================================

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

                await member.send(
                    '❌ Aplicatia ta a fost RESPINSA.'
                ).catch(() => {});

                const logChannel = await client.channels.fetch(logChannelId);

                await logChannel.send(
                    `📢 Supervizorul ${interaction.user.tag} a RESPINS CV-ul lui <@${userId}> !`
                );

                return await interaction.reply({

                    content: '❌ CV respins.',

                    flags: MessageFlags.Ephemeral
                });
            }
        }

    } catch (err) {

        console.error(err);
    }

});

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

// ================= LOGIN =================

client.login(token);
