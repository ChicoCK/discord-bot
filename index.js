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

const leaveRequests = new Map(); // leave request storage
const leaveHistory = new Map(); // leave request history

const seif = new Map();
let seifMessageId = null;

// ================= CONFIG =================

const taskChannelId = '1494860985066848357';
const taskLogsChannelId = '1503906070010269721';
const invoireChannelId = '1493771851485417532'; // Invoire channel where requests are posted
const invoireLogsChannelId = '1510636374812790865'; // Logs channel for accept/decline actions
const invoirePermissionRoleId = '1504935162092195930'; // Permission role for buttons
const seifChannelId = '1511120983279276104';

let leaveRequestIdCounter = 0;

const leadershipRoleIds = [
    '1493768690133499926'
];

function buildSeifEmbed() {

    const items = Array.from(seif.entries());

    return new EmbedBuilder()
        .setTitle('🏦 SEIF PRODUSE GANG')
        .setColor('Gold')
        .setDescription(
            items.length
                ? items.map(([k, v]) => `**${k}**: ${v}`).join('\n')
                : 'Nu există produse în seif.'
        );
}
// ================= READY =================

client.once(Events.ClientReady, async () => {
await updateSeif(client);
    console.log(`🤖 Bot pornit ca ${client.user.tag}`);
console.log("🧪 SEIF START TEST");

try {
    await updateSeif(client);
    console.log("🧪 SEIF END TEST OK");
} catch (err) {
    console.log("🧨 SEIF CRASH:", err);
}
    
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

        // ================= INVOIRE =================

        new SlashCommandBuilder()

            .setName('invoire')

            .setDescription('Sistem cereri de concediu')

            .addSubcommand(cmd =>
                cmd.setName('create')
                    .setDescription('Creeaza o cerere de concediu')
                    .addIntegerOption(opt =>
                        opt.setName('zile')
                            .setDescription('Numarul de zile')
                            .setRequired(true)
                    )
                    .addStringOption(opt =>
                        opt.setName('motiv')
                            .setDescription('Motivul concediului')
                            .setRequired(true)
                    )
            )

            .addSubcommand(cmd =>
                cmd.setName('accept')
                    .setDescription('Aproba o cerere de concediu')
                    .addIntegerOption(opt =>
                        opt.setName('id')
                            .setDescription('ID-ul cererii')
                            .setRequired(true)
                    )
            )

            .addSubcommand(cmd =>
                cmd.setName('reject')
                    .setDescription('Respinge o cerere de concediu')
                    .addIntegerOption(opt =>
                        opt.setName('id')
                            .setDescription('ID-ul cererii')
                            .setRequired(true)
                    )
            )

            .addSubcommand(cmd =>
                cmd.setName('active')
                    .setDescription('Arata toate concediile active')
            )

            .addSubcommand(cmd =>
                cmd.setName('history')
                    .setDescription('Vezi istoric cereri de concediu')
                    .addUserOption(opt =>
                        opt.setName('membru')
                            .setDescription('Membrul')
                            .setRequired(true)
                    )
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

    // Start expiration checker
    startExpirationChecker();
});

// ================= ERRORS =================

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// ================= EXPIRATION CHECKER =================

function startExpirationChecker() {
    setInterval(async () => {
        const now = new Date();
        
        leaveRequests.forEach((requests, userId) => {
            requests.forEach(async (request, index) => {
                if (request.status === 'PENDING') {
                    const endDate = new Date(request.endDate);
                    
                    // Check if expired
                    if (now > endDate) {
                        request.status = 'EXPIRED';
                        
                        try {
                            const invoireChannel = await client.channels.fetch(invoireLogsChannelId);
                            const user = await client.users.fetch(userId);
                            
                            await invoireChannel.send({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle('⏰ Cerere de concediu expirata')
                                        .setColor('Red')
                                        .addFields(
                                            { name: '👤 Membru', value: `<@${userId}>` },
                                            { name: '🆔 ID', value: `#${request.id}` },
                                            { name: '📅 Data expirarii', value: request.endDate }
                                        )
                                        .setTimestamp()
                                ]
                            });
                        } catch (err) {
                            console.error('Error sending expiration message:', err);
                        }
                    }
                    
                    // Check for 24h reminder
                    const reminderDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
                    if (now >= reminderDate && now < new Date(reminderDate.getTime() + 60 * 60 * 1000)) {
                        try {
                            const user = await client.users.fetch(userId);
                            await user.send({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle('⏰ Reminder: Concediul expira maine!')
                                        .setColor('Yellow')
                                        .addFields(
                                            { name: '🆔 ID Cerere', value: `#${request.id}` },
                                            { name: '📅 Data expirarii', value: request.endDate }
                                        )
                                        .setTimestamp()
                                ]
                            });
                        } catch (err) {
                            console.error('Error sending reminder:', err);
                        }
                    }
                }
            });
        });
    }, 60 * 1000); // Check every minute
}

// ================= INTERACTIONS =================

client.on(Events.InteractionCreate, async interaction => {

    try {

        if (interaction.isChatInputCommand()) {
            if (interaction.customId === 'seif_add') {

    const modal = new ModalBuilder()
        .setCustomId('seif_add_modal')
        .setTitle('➕ Adaugă produs');

    const produs = new TextInputBuilder()
        .setCustomId('produs')
        .setLabel('Ce produs? (ex: cocaine)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const cantitate = new TextInputBuilder()
        .setCustomId('cantitate')
        .setLabel('Cantitate')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(produs),
        new ActionRowBuilder().addComponents(cantitate)
    );

    return interaction.showModal(modal);
}
            if (interaction.customId === 'seif_remove') {

    const modal = new ModalBuilder()
        .setCustomId('seif_remove_modal')
        .setTitle('➖ Scoate produs');

    const produs = new TextInputBuilder()
        .setCustomId('produs')
        .setLabel('Ce produs?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const cantitate = new TextInputBuilder()
        .setCustomId('cantitate')
        .setLabel('Cantitate')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(produs),
        new ActionRowBuilder().addComponents(cantitate)
    );

    return interaction.showModal(modal);
}
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
            // /INVOIRE
            // =====================================================

            if (interaction.commandName === 'invoire') {

                const sub = interaction.options.getSubcommand();

                // ================= CREATE =================

                if (sub === 'create') {

                    const zile = interaction.options.getInteger('zile');
                    const motiv = interaction.options.getString('motiv');

                    leaveRequestIdCounter++;
                    const requestId = leaveRequestIdCounter;

                    const startDate = new Date();
                    const endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + zile);

                    if (!leaveRequests.has(interaction.user.id)) {
                        leaveRequests.set(interaction.user.id, []);
                    }

                    if (!leaveHistory.has(interaction.user.id)) {
                        leaveHistory.set(interaction.user.id, []);
                    }

                    const request = {
                        id: requestId,
                        userId: interaction.user.id,
                        zile,
                        motiv,
                        startDate: startDate.toLocaleDateString(),
                        endDate: endDate.toLocaleDateString(),
                        status: 'PENDING',
                        createdAt: new Date(),
                        approvedBy: null,
                        rejectedBy: null
                    };

                    leaveRequests.get(interaction.user.id).push(request);

                    const embed = new EmbedBuilder()
                        .setTitle('📋 CERERE DE CONCEDIU NOUA')
                        .setColor('Blue')
                        .addFields(
                            { name: '🆔 ID', value: `#${requestId}` },
                            { name: '👤 Membru', value: `<@${interaction.user.id}>` },
                            { name: '📅 Zile Solicitate', value: `${zile}` },
                            { name: '📝 Motiv', value: motiv },
                            { name: '🚀 Data Inceput', value: startDate.toLocaleDateString() },
                            { name: '🏁 Data Sfarsit', value: endDate.toLocaleDateString() },
                            { name: '📌 Status', value: '🟡 PENDING' }
                        )
                        .setThumbnail(interaction.user.displayAvatarURL())
                        .setFooter({ text: `User ID: ${interaction.user.id}` })
                        .setTimestamp();

                    const buttons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`invoire_accept_${requestId}`)
                                .setLabel('✅ Aproba')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`invoire_reject_${requestId}`)
                                .setLabel('❌ Respinge')
                                .setStyle(ButtonStyle.Danger)
                        );

                    try {
                        const invoireChannel = await client.channels.fetch(invoireChannelId);
                        await invoireChannel.send({
                            embeds: [embed],
                            components: [buttons]
                        });

                        return await interaction.reply({
                            content: `✅ Cerere de concediu creata cu ID: \`#${requestId}\`\n📅 Data: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
                            flags: MessageFlags.Ephemeral
                        });
                    } catch (err) {
                        console.error('Error sending invoire embed:', err);
                        return await interaction.reply({
                            content: '❌ Eroare la crearea cererii de concediu.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }

                // ================= ACCEPT =================

                if (sub === 'accept') {

                    const isLeadership = interaction.member.roles.cache.some(role =>
                        leadershipRoleIds.includes(role.id)
                    );

                    if (!isLeadership) {
                        return interaction.reply({
                            content: '❌ Nu ai permisiune.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const id = interaction.options.getInteger('id');
                    let found = false;

                    leaveRequests.forEach((requests, userId) => {
                        const request = requests.find(req => req.id === id);
                        if (request) {
                            found = true;
                            request.status = 'ACCEPTED';
                            request.approvedBy = interaction.user.tag;

                            const historyEntry = { ...request };
                            if (!leaveHistory.has(userId)) {
                                leaveHistory.set(userId, []);
                            }
                            leaveHistory.get(userId).push(historyEntry);
                        }
                    });

                    if (!found) {
                        return interaction.reply({
                            content: '❌ Cererea nu a fost gasita.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('✅ CERERE DE CONCEDIU APROBATA')
                        .setColor('Green')
                        .addFields(
                            { name: '🆔 ID', value: `#${id}` },
                            { name: '🛡️ Aprobata de', value: interaction.user.tag }
                        )
                        .setTimestamp();

                    const logsChannel = await client.channels.fetch(invoireLogsChannelId);
                    await logsChannel.send({ embeds: [embed] });

                    return interaction.reply({
                        content: `✅ Cererea #${id} a fost aprobata.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                // ================= REJECT =================

                if (sub === 'reject') {

                    const isLeadership = interaction.member.roles.cache.some(role =>
                        leadershipRoleIds.includes(role.id)
                    );

                    if (!isLeadership) {
                        return interaction.reply({
                            content: '❌ Nu ai permisiune.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const id = interaction.options.getInteger('id');
                    let found = false;

                    leaveRequests.forEach((requests, userId) => {
                        const request = requests.find(req => req.id === id);
                        if (request) {
                            found = true;
                            request.status = 'REJECTED';
                            request.rejectedBy = interaction.user.tag;

                            const historyEntry = { ...request };
                            if (!leaveHistory.has(userId)) {
                                leaveHistory.set(userId, []);
                            }
                            leaveHistory.get(userId).push(historyEntry);
                        }
                    });

                    if (!found) {
                        return interaction.reply({
                            content: '❌ Cererea nu a fost gasita.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('❌ CERERE DE CONCEDIU RESPINSA')
                        .setColor('Red')
                        .addFields(
                            { name: '🆔 ID', value: `#${id}` },
                            { name: '🛡️ Respinsa de', value: interaction.user.tag }
                        )
                        .setTimestamp();

                    const logsChannel = await client.channels.fetch(invoireLogsChannelId);
                    await logsChannel.send({ embeds: [embed] });

                    return interaction.reply({
                        content: `✅ Cererea #${id} a fost respinsa.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                // ================= ACTIVE =================

                if (sub === 'active') {

                    let text = '';
                    let hasActive = false;

                    leaveRequests.forEach((requests, userId) => {
                        const activeRequests = requests.filter(req => req.status === 'PENDING' || req.status === 'ACCEPTED');
                        
                        if (activeRequests.length > 0) {
                            hasActive = true;
                            text += `\n**<@${userId}>**\n`;
                            activeRequests.forEach(req => {
                                const now = new Date();
                                const endDate = new Date(req.endDate);
                                const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                                text += `#${req.id} | ${req.zile} zile | Status: ${req.status} | Zile ramase: ${daysLeft}\n`;
                            });
                        }
                    });

                    if (!hasActive) {
                        return interaction.reply({
                            content: '✅ Nu exista cereri de concediu active.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('📋 CERERI DE CONCEDIU ACTIVE')
                        .setColor('Blue')
                        .setDescription(text)
                        .setTimestamp();

                    return interaction.reply({
                        embeds: [embed],
                        flags: MessageFlags.Ephemeral
                    });
                }

                // ================= HISTORY =================

                if (sub === 'history') {

                    const user = interaction.options.getUser('membru');
                    const history = leaveHistory.get(user.id) || [];

                    if (history.length === 0) {
                        return interaction.reply({
                            content: `✅ ${user.tag} nu are istoric de cereri de concediu.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    let text = '';
                    history.forEach(req => {
                        text += `#${req.id} | ${req.zile} zile | ${req.startDate} -> ${req.endDate} | Status: ${req.status}\n`;
                    });

                    const embed = new EmbedBuilder()
                        .setTitle(`📜 Istoric ${user.tag}`)
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

            if (interaction.customId === 'seif_add_modal') {

    const produs = interaction.fields.getTextInputValue('produs').toLowerCase();
    const cantitate = parseInt(interaction.fields.getTextInputValue('cantitate'));

    seif.set(produs, (seif.get(produs) || 0) + cantitate);

    await updateSeif(interaction.client);

    return interaction.reply({
        content: `✅ Adăugat ${cantitate}x ${produs}`,
        flags: MessageFlags.Ephemeral
    });
}
        if (interaction.customId === 'seif_remove_modal') {

    const produs = interaction.fields.getTextInputValue('produs').toLowerCase();
    const cantitate = parseInt(interaction.fields.getTextInputValue('cantitate'));

    if (!seif.has(produs)) seif.set(produs, 0);

    seif.set(produs, seif.get(produs) - cantitate);

    if (seif.get(produs) <= 0) seif.delete(produs);

    await updateSeif(interaction.client);

    return interaction.reply({
        content: `❌ Scos ${cantitate}x ${produs}`,
        flags: MessageFlags.Ephemeral
    });
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
            // INVOIRE BUTTONS
            // =====================================================

            if (interaction.customId.startsWith('invoire_accept_')) {

                const hasPermission = interaction.member.roles.cache.has(invoirePermissionRoleId);

                if (!hasPermission) {
                    return interaction.reply({
                        content: '❌ Nu ai permisiune sa accepti cereri de concediu.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const requestId = parseInt(interaction.customId.split('_')[2]);
                let found = false;
                let userId = null;

                leaveRequests.forEach((requests, uId) => {
                    const request = requests.find(req => req.id === requestId);
                    if (request && request.status === 'PENDING') {
                        found = true;
                        userId = uId;
                        request.status = 'ACCEPTED';
                        request.approvedBy = interaction.user.tag;

                        const historyEntry = { ...request };
                        if (!leaveHistory.has(uId)) {
                            leaveHistory.set(uId, []);
                        }
                        leaveHistory.get(uId).push(historyEntry);
                    }
                });

                if (!found) {
                    return interaction.reply({
                        content: '❌ Cererea nu a fost gasita sau a fost deja procesata.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor('Green')
                    .spliceFields(6, 1, { name: '📌 Status', value: '✅ ACCEPTED' });

                const disabledButtons = new ActionRowBuilder()
                    .addComponents(
                        interaction.message.components[0].components.map(btn => 
                            ButtonBuilder.from(btn).setDisabled(true)
                        )
                    );

                await interaction.update({
                    embeds: [updatedEmbed],
                    components: [disabledButtons]
                });

                // Send log message in Romanian
                const logsChannel = await client.channels.fetch(invoireLogsChannelId);
                await logsChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('✅ INVOIRE APROBATA')
                            .setColor('Green')
                            .setDescription(`📢 Supervizorul ${interaction.user.tag} a ACCEPTAT Invoirea lui <@${userId}>!`)
                            .addFields(
                                { name: '🆔 ID Cerere', value: `#${requestId}` },
                                { name: '👤 Membrul', value: `<@${userId}>` },
                                { name: '🛡️ Aprobata de', value: interaction.user.tag }
                            )
                            .setTimestamp()
                    ]
                });

                return interaction.reply({
                    content: `✅ Cererea #${requestId} a fost APROBATA de ${interaction.user.tag}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.customId.startsWith('invoire_reject_')) {

                const hasPermission = interaction.member.roles.cache.has(invoirePermissionRoleId);

                if (!hasPermission) {
                    return interaction.reply({
                        content: '❌ Nu ai permisiune sa respingi cereri de concediu.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const requestId = parseInt(interaction.customId.split('_')[2]);
                let found = false;
                let userId = null;

                leaveRequests.forEach((requests, uId) => {
                    const request = requests.find(req => req.id === requestId);
                    if (request && request.status === 'PENDING') {
                        found = true;
                        userId = uId;
                        request.status = 'REJECTED';
                        request.rejectedBy = interaction.user.tag;

                        const historyEntry = { ...request };
                        if (!leaveHistory.has(uId)) {
                            leaveHistory.set(uId, []);
                        }
                        leaveHistory.get(uId).push(historyEntry);
                    }
                });

                if (!found) {
                    return interaction.reply({
                        content: '❌ Cererea nu a fost gasita sau a fost deja procesata.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor('Red')
                    .spliceFields(6, 1, { name: '📌 Status', value: '❌ REJECTED' });

                const disabledButtons = new ActionRowBuilder()
                    .addComponents(
                        interaction.message.components[0].components.map(btn => 
                            ButtonBuilder.from(btn).setDisabled(true)
                        )
                    );

                await interaction.update({
                    embeds: [updatedEmbed],
                    components: [disabledButtons]
                });

                // Send log message in Romanian
                const logsChannel = await client.channels.fetch(invoireLogsChannelId);
                await logsChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('❌ INVOIRE RESPINSA')
                            .setColor('Red')
                            .setDescription(`📢 Supervizorul ${interaction.user.tag} a RESPINS Invoirea lui <@${userId}>!`)
                            .addFields(
                                { name: '🆔 ID Cerere', value: `#${requestId}` },
                                { name: '👤 Membrul', value: `<@${userId}>` },
                                { name: '🛡️ Respinsa de', value: interaction.user.tag }
                            )
                            .setTimestamp()
                    ]
                });

                return interaction.reply({
                    content: `✅ Cererea #${requestId} a fost RESPINSA de ${interaction.user.tag}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // =====================================================
            // CV BUTTONS
            // =====================================================

            const embed = interaction.message.embeds[0];

            if (!embed || !embed.footer || !embed.footer.text.includes('USER ID')) {
                return;
            }

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
