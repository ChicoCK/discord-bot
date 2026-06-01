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
    SelectMenuBuilder
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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
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

const leaveRequests = new Map();
const leaveHistory = new Map();

// ================= DOSSIER STORAGE =================

const dossiers = new Map(); // ID -> dossier data
const activeDossiers = new Map(); // userID -> dossierID (to prevent overlaps)
const dossierIdCounter = { count: 0 };
const dossierReminders = new Map(); // dossierID -> reminder timeout

// ================= CONFIG =================

const taskChannelId = '1494860985066848357';
const taskLogsChannelId = '1503906070010269721';
const invoireChannelId = '1493771851485417532';
const invoireLogsChannelId = '1510636374812790865';
const invoirePermissionRoleId = '1504935162092195930';

const dossierChannelId = '1510810718662824047';
const dossierRoleId = '1493795104950059139';

let leaveRequestIdCounter = 0;

const leadershipRoleIds = [
    '1493768690133499926'
];

// Activity types
const activityTypes = {
    LEGAL: {
        label: 'Legale',
        types: ['Patrulă', 'Jointuri', 'Topitorie', 'Minereu', 'Fier', 'Elemente de fixare', 'Mecanisme', 'Țeavă', 'Cadru']
    },
    ILLEGAL: {
        label: 'Ilegale',
        types: ['Procesare Coca', 'Procesare Crack', 'Braconier']
    }
};

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
            ),

        // ================= DOSAR =================

        new SlashCommandBuilder()

            .setName('dosar')

            .setDescription('Sistem de evidență activități')

            .addSubcommand(cmd =>
                cmd.setName('start')
                    .setDescription('Porneste o noua activitate')
            )

            .addSubcommand(cmd =>
                cmd.setName('stop')
                    .setDescription('Inchide o activitate')
                    .addIntegerOption(opt =>
                        opt.setName('id')
                            .setDescription('ID-ul dossier-ului')
                            .setRequired(true)
                    )
            )

            .addSubcommand(cmd =>
                cmd.setName('cauta-ora')
                    .setDescription('Cauta activitati dupa ora')
                    .addStringOption(opt =>
                        opt.setName('data')
                            .setDescription('Data (DD-MM-YYYY)')
                            .setRequired(true)
                    )
                    .addStringOption(opt =>
                        opt.setName('ora')
                            .setDescription('Ora (HH:MM)')
                            .setRequired(true)
                    )
            )

            .addSubcommand(cmd =>
                cmd.setName('membru')
                    .setDescription('Arata statistici unui membru')
                    .addUserOption(opt =>
                        opt.setName('utilizator')
                            .setDescription('Utilizatorul')
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

    // Start daily report
    startDailyReportScheduler();
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
    }, 60 * 1000);
}

// ================= DAILY REPORT SCHEDULER =================

function startDailyReportScheduler() {
    setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            await sendDailyReport();
        }
    }, 60 * 1000);
}

async function sendDailyReport() {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('ro-RO');

        let totalActivities = 0;
        let legalActivities = 0;
        let illegalActivities = 0;
        let uniqueParticipants = new Set();
        let totalDuration = 0;
        let activityTypeBreakdown = {};

        dossiers.forEach((dossier) => {
            if (dossier.dataSfarsit && new Date(dossier.dataSfarsit).toLocaleDateString('ro-RO') === yesterdayStr) {
                totalActivities++;

                if (dossier.categorie === 'Legală') {
                    legalActivities++;
                } else {
                    illegalActivities++;
                }

                dossier.participanti.forEach(p => uniqueParticipants.add(p));

                const startTime = new Date(dossier.dataSfarsit + 'T' + dossier.oraSfarsit);
                const endTime = new Date(dossier.dataSfarsit + 'T' + dossier.oraInceput);
                const duration = (startTime - endTime) / (1000 * 60);
                totalDuration += duration;

                if (!activityTypeBreakdown[dossier.tipActivitate]) {
                    activityTypeBreakdown[dossier.tipActivitate] = 0;
                }
                activityTypeBreakdown[dossier.tipActivitate]++;
            }
        });

        const hours = Math.floor(totalDuration / 60);
        const minutes = totalDuration % 60;

        let breakdownText = '';
        Object.entries(activityTypeBreakdown).forEach(([type, count]) => {
            breakdownText += `${type}: ${count}\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle('📊 RAPORT ZILNIC')
            .setColor('Blue')
            .addFields(
                { name: '📅 Data', value: yesterdayStr },
                { name: '📈 Total activități', value: `${totalActivities}` },
                { name: '✅ Activități legale', value: `${legalActivities}` },
                { name: '❌ Activități ilegale', value: `${illegalActivities}` },
                { name: '👥 Participanți unici', value: `${uniqueParticipants.size}` },
                { name: '⏱️ Durată totală', value: `${hours} ore și ${minutes} minute` },
                { name: '📋 Defalcare pe tipuri', value: breakdownText || 'N/A' }
            )
            .setFooter({ text: 'Sistem Automat de Evidență Activități RP' })
            .setTimestamp();

        const dossierChannel = await client.channels.fetch(dossierChannelId);
        await dossierChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Error sending daily report:', err);
    }
}

// ================= HELPER FUNCTIONS =================

function getDossierEmbed(dossier) {
    const status = dossier.status === 'ACTIV' ? '🟢 Activ' : dossier.status === 'FINALIZAT' ? '🔴 Finalizat' : '⚫ Închis automat';
    const color = dossier.status === 'ACTIV' ? 'Green' : dossier.status === 'FINALIZAT' ? 'Red' : 0x000000;

    const participantiText = dossier.participanti.map(p => `• <@${p}>`).join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`📁 DOSAR ACTIVITATE #${dossier.id}`)
        .setColor(color)
        .addFields(
            { name: 'Status', value: status },
            { name: 'Tip activitate', value: dossier.tipActivitate },
            { name: 'Categorie', value: dossier.categorie },
            { name: 'Creator', value: `<@${dossier.creator}>` },
            { name: 'Participanți', value: participantiText },
            { name: 'Număr participanți', value: `${dossier.participanti.length}` },
            { name: 'Data începerii', value: dossier.dataInceput },
            { name: 'Ora începerii', value: dossier.oraInceput }
        )
        .setFooter({ text: 'Sistem Automat de Evidență Activități RP' })
        .setTimestamp();

    if (dossier.pozeUrl) {
        embed.setImage(dossier.pozeUrl);
    }

    if (dossier.durata) {
        embed.addFields({ name: 'Durata', value: dossier.durata });
    }

    if (dossier.bodycamUrl) {
        embed.addFields({ name: 'Bodycam', value: `[Link Bodycam](${dossier.bodycamUrl})` });
    }

    if (dossier.observatii) {
        embed.addFields({ name: 'Observații', value: dossier.observatii });
    }

    if (dossier.dataSfarsit) {
        embed.addFields({ name: 'Data finalizării', value: dossier.dataSfarsit });
    }

    if (dossier.oraSfarsit) {
        embed.addFields({ name: 'Ora finalizării', value: dossier.oraSfarsit });
    }

    if (dossier.motivInchidere) {
        embed.addFields({ name: 'Motiv închidere', value: dossier.motivInchidere });
    }

    return embed;
}

function checkParticipantOverlap(participanti) {
    for (const participantId of participanti) {
        if (activeDossiers.has(participantId)) {
            return participantId;
        }
    }
    return null;
}

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

            // =====================================================
            // /DOSAR
            // =====================================================

            if (interaction.commandName === 'dosar') {

                const hasRole = interaction.member.roles.cache.has(dossierRoleId);

                if (!hasRole) {
                    return interaction.reply({
                        content: '❌ Nu ai permisiune.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const sub = interaction.options.getSubcommand();

                // ================= DOSAR START =================

                if (sub === 'start') {

                    const legalSelect = new SelectMenuBuilder()
                        .setCustomId('dosar_type_legal')
                        .setPlaceholder('Alege tip activitate legala')
                        .addOptions(
                            activityTypes.LEGAL.types.map(type => ({
                                label: type,
                                value: `legal_${type}`
                            }))
                        );

                    const illegalSelect = new SelectMenuBuilder()
                        .setCustomId('dosar_type_illegal')
                        .setPlaceholder('Alege tip activitate ilegala')
                        .addOptions(
                            activityTypes.ILLEGAL.types.map(type => ({
                                label: type,
                                value: `illegal_${type}`
                            }))
                        );

                    const row1 = new ActionRowBuilder().addComponents(legalSelect);
                    const row2 = new ActionRowBuilder().addComponents(illegalSelect);

                    return interaction.reply({
                        content: '📁 Selecteaza tipul activității:',
                        components: [row1, row2],
                        flags: MessageFlags.Ephemeral
                    });
                }

                // ================= DOSAR STOP =================

                if (sub === 'stop') {

                    const dosarId = interaction.options.getInteger('id');
                    const dossier = dossiers.get(dosarId);

                    if (!dossier) {
                        return interaction.reply({
                            content: `❌ Dosarul #${dosarId} nu a fost gasit.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const isCreator = dossier.creator === interaction.user.id;
                    const isLeadership = interaction.member.roles.cache.some(role =>
                        leadershipRoleIds.includes(role.id)
                    );

                    if (!isCreator && !isLeadership) {
                        return interaction.reply({
                            content: '❌ Nu ai permisiune sa inchizi aceasta activitate.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    if (dossier.status !== 'ACTIV') {
                        return interaction.reply({
                            content: '❌ Aceasta activitate nu este activa.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const endTime = new Date();
                    dossier.dataSfarsit = endTime.toLocaleDateString('ro-RO');
                    dossier.oraSfarsit = endTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
                    dossier.status = 'FINALIZAT';

                    const startDateTime = new Date(dossier.dataInceput + 'T' + dossier.oraInceput);
                    const duration = Math.floor((endTime - startDateTime) / (1000 * 60));
                    const hours = Math.floor(duration / 60);
                    const minutes = duration % 60;
                    dossier.durata = `${hours} ore și ${minutes} minute`;

                    dossier.participanti.forEach(participantId => {
                        activeDossiers.delete(participantId);
                    });

                    if (dossierReminders.has(dosarId)) {
                        clearTimeout(dossierReminders.get(dosarId));
                        dossierReminders.delete(dosarId);
                    }

                    try {
                        const dossierChannel = await client.channels.fetch(dossierChannelId);
                        const embed = getDossierEmbed(dossier);
                        await dossierChannel.send({ embeds: [embed] });
                    } catch (err) {
                        console.error('Error sending dossier:', err);
                    }

                    return interaction.reply({
                        content: `✅ Activitatea #${dosarId} a fost finalizata.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                // ================= DOSAR CAUTA-ORA =================

                if (sub === 'cauta-ora') {

                    const data = interaction.options.getString('data');
                    const ora = interaction.options.getString('ora');

                    const [day, month, year] = data.split('-');
                    const searchDate = new Date(year, month - 1, day);
                    const [searchHour, searchMin] = ora.split(':');

                    let found = [];

                    dossiers.forEach((dossier, dosarId) => {
                        if (dossier.status === 'ACTIV') {
                            const dossierDate = new Date(dossier.dataInceput);
                            const [dHour, dMin] = dossier.oraInceput.split(':');

                            if (dossierDate.toDateString() === searchDate.toDateString()) {
                                const dossierTime = parseInt(dHour) * 60 + parseInt(dMin);
                                const searchTime = parseInt(searchHour) * 60 + parseInt(searchMin);

                                if (searchTime >= dossierTime) {
                                    found.push(dossier);
                                }
                            }
                        }
                    });

                    if (found.length === 0) {
                        return interaction.reply({
                            content: `❌ Nu exista activitati active la data: ${data} ora: ${ora}`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    let text = '';
                    found.forEach(dossier => {
                        text += `\n**#${dossier.id} - ${dossier.tipActivitate}** (${dossier.participanti.length} participanți)`;
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('🔍 ACTIVITATI ACTIVE')
                        .setColor('Blue')
                        .setDescription(text)
                        .addFields({ name: '📅 Data', value: data })
                        .addFields({ name: '🕐 Ora', value: ora })
                        .setTimestamp();

                    return interaction.reply({
                        embeds: [embed],
                        flags: MessageFlags.Ephemeral
                    });
                }

                // ================= DOSAR MEMBRU =================

                if (sub === 'membru') {

                    const user = interaction.options.getUser('utilizator');

                    let totalActivities = 0;
                    let legalActivities = 0;
                    let illegalActivities = 0;
                    let totalMinutes = 0;
                    let activityTypeBreakdown = {};

                    dossiers.forEach((dossier) => {
                        if (dossier.participanti.includes(user.id)) {
                            totalActivities++;

                            if (dossier.categorie === 'Legală') {
                                legalActivities++;
                            } else {
                                illegalActivities++;
                            }

                            if (!activityTypeBreakdown[dossier.tipActivitate]) {
                                activityTypeBreakdown[dossier.tipActivitate] = 0;
                            }
                            activityTypeBreakdown[dossier.tipActivitate]++;

                            if (dossier.durata) {
                                const [h, rest] = dossier.durata.split(' ore și ');
                                const [m] = rest.split(' minute');
                                totalMinutes += parseInt(h) * 60 + parseInt(m);
                            }
                        }
                    });

                    const totalHours = Math.floor(totalMinutes / 60);
                    const remainingMinutes = totalMinutes % 60;

                    let breakdownText = '';
                    Object.entries(activityTypeBreakdown).forEach(([type, count]) => {
                        breakdownText += `${type}: ${count}\n`;
                    });

                    const embed = new EmbedBuilder()
                        .setTitle(`📊 STATISTICI ${user.tag}`)
                        .setColor('Blue')
                        .addFields(
                            { name: '📈 Total activități', value: `${totalActivities}` },
                            { name: '✅ Activități legale', value: `${legalActivities}` },
                            { name: '❌ Activități ilegale', value: `${illegalActivities}` },
                            { name: '⏱️ Timp total petrecut', value: `${totalHours} ore și ${remainingMinutes} minute` },
                            { name: '📋 Defalcare pe tipuri', value: breakdownText || 'N/A' }
                        )
                        .setThumbnail(user.displayAvatarURL())
                        .setTimestamp();

                    return interaction.reply({
                        embeds: [embed],
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        }

        // =====================================================
        // SELECT MENUS - DOSAR
        // =====================================================

        if (interaction.isStringSelectMenu()) {

            if (interaction.customId === 'dosar_type_legal') {

                const selectedType = interaction.values[0].replace('legal_', '');

                await interaction.deferUpdate();

                const modal = new ModalBuilder()
                    .setCustomId(`dosar_modal_legal_${selectedType}`)
                    .setTitle('📋 Creeaza Activitate - ' + selectedType);

                const participantsInput = new TextInputBuilder()
                    .setCustomId('participants')
                    .setLabel('Menționa participanți (ex: @user1 @user2)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                const observatiiInput = new TextInputBuilder()
                    .setCustomId('observatii')
                    .setLabel('Observații (opțional)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);

                const bodycamInput = new TextInputBuilder()
                    .setCustomId('bodycam')
                    .setLabel('Link Bodycam (opțional)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(participantsInput),
                    new ActionRowBuilder().addComponents(observatiiInput),
                    new ActionRowBuilder().addComponents(bodycamInput)
                );

                return await interaction.showModal(modal);
            }

            if (interaction.customId === 'dosar_type_illegal') {

                const selectedType = interaction.values[0].replace('illegal_', '');

                await interaction.deferUpdate();

                const modal = new ModalBuilder()
                    .setCustomId(`dosar_modal_illegal_${selectedType}`)
                    .setTitle('📋 Creeaza Activitate - ' + selectedType);

                const participantsInput = new TextInputBuilder()
                    .setCustomId('participants')
                    .setLabel('Menționa participanți (ex: @user1 @user2)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                const observatiiInput = new TextInputBuilder()
                    .setCustomId('observatii')
                    .setLabel('Observații (opțional)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);

                const bodycamInput = new TextInputBuilder()
                    .setCustomId('bodycam')
                    .setLabel('Link Bodycam (opțional)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(participantsInput),
                    new ActionRowBuilder().addComponents(observatiiInput),
                    new ActionRowBuilder().addComponents(bodycamInput)
                );

                return await interaction.showModal(modal);
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

            // ================= DOSAR MODALS =================

            if (interaction.customId.startsWith('dosar_modal_legal_') || interaction.customId.startsWith('dosar_modal_illegal_')) {

                const isLegal = interaction.customId.startsWith('dosar_modal_legal_');
                const activityType = isLegal
                    ? interaction.customId.replace('dosar_modal_legal_', '')
                    : interaction.customId.replace('dosar_modal_illegal_', '');

                const participantsText = interaction.fields.getTextInputValue('participants');
                const observatii = interaction.fields.getTextInputValue('observatii') || '';
                const bodycamUrl = interaction.fields.getTextInputValue('bodycam') || '';

                const participantIds = [];
                const mentionRegex = /<@!?(\d+)>/g;
                let match;

                while ((match = mentionRegex.exec(participantsText)) !== null) {
                    participantIds.push(match[1]);
                }

                if (participantIds.length === 0) {
                    return interaction.reply({
                        content: '❌ Trebuie sa mentionezi cel putin un participant.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Check for overlaps
                const overlapUser = checkParticipantOverlap(participantIds);
                if (overlapUser) {
                    return interaction.reply({
                        content: `❌ Utilizatorul <@${overlapUser}> participă deja la o activitate activă.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                return interaction.reply({
                    content: '📸 Acum trimite poza activității (obligatoriu).',
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
            // DOSAR REMINDER BUTTONS
            // =====================================================

            if (interaction.customId.startsWith('dosar_continue_')) {

                const dosarId = parseInt(interaction.customId.split('_')[2]);
                const dossier = dossiers.get(dosarId);

                if (!dossier) {
                    return interaction.reply({
                        content: '❌ Dosarul nu a mai exista.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (dossier.creator !== interaction.user.id) {
                    return interaction.reply({
                        content: '❌ Numai creatorul dosarului poate raspunde.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (dossierReminders.has(dosarId)) {
                    clearTimeout(dossierReminders.get(dosarId));
                    dossierReminders.delete(dosarId);
                }

                const newReminder = setTimeout(() => {
                    autoCloseDossier(dosarId);
                }, 10 * 60 * 1000);

                dossierReminders.set(dosarId, newReminder);

                return interaction.reply({
                    content: '✅ Timerul a fost resetat. Urmatorul reminder va fi peste 60 de minute.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.customId.startsWith('dosar_close_')) {

                const dosarId = parseInt(interaction.customId.split('_')[2]);
                const dossier = dossiers.get(dosarId);

                if (!dossier) {
                    return interaction.reply({
                        content: '❌ Dosarul nu mai exista.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (dossier.creator !== interaction.user.id) {
                    return interaction.reply({
                        content: '❌ Numai creatorul dosarului poate inchide activitatea.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const endTime = new Date();
                dossier.dataSfarsit = endTime.toLocaleDateString('ro-RO');
                dossier.oraSfarsit = endTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
                dossier.status = 'FINALIZAT';

                const startDateTime = new Date(dossier.dataInceput + 'T' + dossier.oraInceput);
                const duration = Math.floor((endTime - startDateTime) / (1000 * 60));
                const hours = Math.floor(duration / 60);
                const minutes = duration % 60;
                dossier.durata = `${hours} ore și ${minutes} minute`;

                dossier.participanti.forEach(participantId => {
                    activeDossiers.delete(participantId);
                });

                if (dossierReminders.has(dosarId)) {
                    clearTimeout(dossierReminders.get(dosarId));
                    dossierReminders.delete(dosarId);
                }

                (async () => {
                    try {
                        const dossierChannel = await client.channels.fetch(dossierChannelId);
                        const embed = getDossierEmbed(dossier);
                        await dossierChannel.send({ embeds: [embed] });
                    } catch (err) {
                        console.error('Error sending dossier:', err);
                    }
                })();

                return interaction.reply({
                    content: `✅ Activitatea #${dosarId} a fost finalizata.`,
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

        // =====================================================
        // DOSAR IMAGE HANDLING
        // =====================================================

        // Check if waiting for dossier image
        const dosarStartData = JSON.parse(JSON.stringify(Array.from(applications.entries())));
        
        for (const [userId, data] of applications.entries()) {
            if (data.waiting_for_dosar_image) {
                if (message.attachments.size === 0) {
                    return;
                }

                const attachment = message.attachments.first();
                data.pozeUrl = attachment.url;
                data.waiting_for_dosar_image = false;

                // Now create the dossier
                dossierIdCounter.count++;
                const dosarId = dossierIdCounter.count;

                const dossier = {
                    id: dosarId,
                    creator: userId,
                    participanti: data.participanti,
                    tipActivitate: data.tipActivitate,
                    categorie: data.categorie,
                    pozeUrl: data.pozeUrl,
                    bodycamUrl: data.bodycamUrl,
                    observatii: data.observatii,
                    status: 'ACTIV',
                    dataInceput: new Date().toLocaleDateString('ro-RO'),
                    oraInceput: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
                    dataSfarsit: null,
                    oraSfarsit: null,
                    durata: null,
                    motivInchidere: null
                };

                dossiers.set(dosarId, dossier);

                data.participanti.forEach(participantId => {
                    activeDossiers.set(participantId, dosarId);
                });

                try {
                    const dossierChannel = await client.channels.fetch(dossierChannelId);
                    const embed = getDossierEmbed(dossier);
                    
                    const buttons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`dosar_close_${dosarId}`)
                                .setLabel('🛑 Inchide Activitatea')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await dossierChannel.send({
                        embeds: [embed],
                        components: [buttons]
                    });

                    // Set 60-minute reminder
                    const reminder = setTimeout(async () => {
                        try {
                            const creator = await client.users.fetch(userId);
                            const reminderButtons = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`dosar_continue_${dosarId}`)
                                        .setLabel('✅ Da, continuam')
                                        .setStyle(ButtonStyle.Success),
                                    new ButtonBuilder()
                                        .setCustomId(`dosar_close_${dosarId}`)
                                        .setLabel('🛑 Inchide')
                                        .setStyle(ButtonStyle.Danger)
                                );

                            await creator.send({
                                content: `📢 Activitatea #${dosarId} este încă deschisă. Mai participați la această activitate?`,
                                components: [reminderButtons]
                            });
                        } catch (err) {
                            console.error('Error sending reminder:', err);
                        }
                    }, 60 * 60 * 1000);

                    dossierReminders.set(dosarId, reminder);

                    await message.author.send(`✅ Dosarul #${dosarId} a fost creat cu succes.`).catch(() => {});

                } catch (err) {
                    console.error('Error creating dossier:', err);
                }

                applications.delete(userId);
                await message.delete().catch(() => {});
                return;
            }
        }

        // =====================================================
        // EXISTING CV HANDLING
        // =====================================================

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

        const cvEmbed = new EmbedBuilder()

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

            embeds: [cvEmbed],

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

// ================= AUTO CLOSE DOSSIER =================

function autoCloseDossier(dosarId) {
    const dossier = dossiers.get(dosarId);
    
    if (!dossier || dossier.status !== 'ACTIV') {
        return;
    }

    const endTime = new Date();
    dossier.dataSfarsit = endTime.toLocaleDateString('ro-RO');
    dossier.oraSfarsit = endTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    dossier.status = 'ÎNCHIS AUTOMAT';
    dossier.motivInchidere = 'Nu s-a răspuns la verificarea activității.';

    const startDateTime = new Date(dossier.dataInceput + 'T' + dossier.oraInceput);
    const duration = Math.floor((endTime - startDateTime) / (1000 * 60));
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    dossier.durata = `${hours} ore și ${minutes} minute`;

    dossier.participanti.forEach(participantId => {
        activeDossiers.delete(participantId);
    });

    dossierReminders.delete(dosarId);

    (async () => {
        try {
            const dossierChannel = await client.channels.fetch(dossierChannelId);
            const embed = getDossierEmbed(dossier);
            await dossierChannel.send({ embeds: [embed] });

            const creator = await client.users.fetch(dossier.creator);
            await creator.send({
                content: `⚫ Activitatea #${dosarId} a fost ÎNCHISĂ AUTOMAT din cauza lipsei de răspuns.`
            }).catch(() => {});
        } catch (err) {
            console.error('Error auto-closing dossier:', err);
        }
    })();
}

// ================= LOGIN =================

client.login(token);
