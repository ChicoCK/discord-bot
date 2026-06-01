require('dotenv').config();

const mongoose = require('mongoose');

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
const MONGODB_URI = process.env.MONGODB_URI;

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

// ================= CONFIG =================

const taskChannelId = '1494860985066848357';
const taskLogsChannelId = '1503906070010269721';
const invoireChannelId = '1493771851485417532'; // Invoire channel where requests are posted
const invoireLogsChannelId = '1510636374812790865'; // Logs channel for accept/decline actions
const invoirePermissionRoleId = '1504935162092195930'; // Permission role for buttons

const dosarChannelId = '1510810718662824047';
const dosarRunnerRoleId = '1493795104950059139';

let leaveRequestIdCounter = 0;
let dosarIdCounter = 0;

const leadershipRoleIds = [
    '1493768690133499926'
];

// ================= DOSSIER CONSTANTS =================

const AKTIVITATI_LEGALE = [
    'Patrulă',
    'Jointuri',
    'Topitorie',
    'Minereu',
    'Fier',
    'Elemente de fixare',
    'Mecanisme',
    'Țeavă',
    'Cadru'
];

const AKTIVITATI_ILEGALE = [
    'Procesare Coca',
    'Procesare Crack',
    'Braconier'
];

const activeDosarReminders = new Map(); // Track reminder timers

// ================= MONGODB SCHEMA =================

const dosarSchema = new mongoose.Schema({
    dosarId: { type: String, unique: true, required: true },
    creatorId: { type: String, required: true },
    participantsIds: [String],
    tipActivitate: { type: String, required: true },
    categorie: { type: String, required: true },
    imagine: { type: String },
    bodycam: { type: String },
    observatii: { type: String },
    status: { type: String, default: 'Activ' },
    dataInceput: { type: Date, required: true },
    dataFinal: { type: Date },
    motivaInchidere: { type: String },
    messageId: { type: String },
    channelId: { type: String },
    reminderSent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Dosar = mongoose.model('Dosar', dosarSchema);

// ================= MONGODB CONNECTION =================

async function connectMongoDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB conectat');
    } catch (err) {
        console.error('❌ Eroare conexiune MongoDB:', err);
    }
}

// ================= HELPER FUNCTIONS =================

function getCategorie(tipActivitate) {
    if (AKTIVITATI_LEGALE.includes(tipActivitate)) return 'Legală';
    if (AKTIVITATI_ILEGALE.includes(tipActivitate)) return 'Ilegală';
    return 'Necunoscută';
}

function getDuration(startDate, endDate) {
    const diff = endDate - startDate;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

async function createDosarEmbed(dosar, participantsData) {
    const duration = dosar.dataFinal 
        ? getDuration(new Date(dosar.dataInceput), new Date(dosar.dataFinal))
        : getDuration(new Date(dosar.dataInceput), new Date());

    const statusEmoji = dosar.status === 'Activ' ? '🟢' 
        : dosar.status === 'Finalizat' ? '🔴' 
        : '⚫';

    const participantsText = participantsData
        .map(p => `• ${p}`)
        .join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`📁 DOSAR ACTIVITATE #${dosar.dosarId}`)
        .setColor(dosar.status === 'Activ' ? 'Green' : dosar.status === 'Finalizat' ? 'Red' : 'DarkGrey')
        .addFields(
            { name: 'Status', value: `${statusEmoji} ${dosar.status}`, inline: true },
            { name: 'Tip activitate', value: dosar.tipActivitate, inline: true },
            { name: 'Categorie', value: getCategorie(dosar.tipActivitate), inline: true },
            { name: 'Creator', value: `<@${dosar.creatorId}>`, inline: true },
            { name: 'Număr participanți', value: `${dosar.participantsIds.length}`, inline: true },
            { name: '📅 Data începerii', value: new Date(dosar.dataInceput).toLocaleDateString('ro-RO'), inline: true },
            { name: '⏰ Ora începerii', value: new Date(dosar.dataInceput).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }), inline: true },
            { name: '⏱️ Durată', value: duration, inline: true }
        );

    if (dosar.bodycam) {
        embed.addFields({ name: '📹 Bodycam', value: `[Link](${dosar.bodycam})`, inline: true });
    }

    if (dosar.observatii) {
        embed.addFields({ name: '📝 Observații', value: dosar.observatii, inline: false });
    }

    embed.addFields({ name: 'Participanți', value: participantsText || 'Niciun participant', inline: false });

    if (dosar.motivaInchidere) {
        embed.addFields({ name: '⛔ Motiv Închidere', value: dosar.motivaInchidere, inline: false });
    }

    if (dosar.imagine) {
        embed.setImage(dosar.imagine);
    }

    embed.setFooter({ text: 'Sistem Automat de Evidență Activități RP' });
    embed.setTimestamp();

    return embed;
}

async function updateDosarMessage(dosar) {
    try {
        const channel = await client.channels.fetch(dosar.channelId || dosarChannelId);
        const message = await channel.messages.fetch(dosar.messageId);
        
        const participants = dosar.participantsIds.map(id => `<@${id}>`);
        const embed = await createDosarEmbed(dosar, participants);
        
        await message.edit({ embeds: [embed] });
    } catch (err) {
        console.error('Eroare actualizare mesaj dosar:', err);
    }
}

async function sendReminderDM(dosar) {
    try {
        const creator = await client.users.fetch(dosar.creatorId);
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`reminder_continue_${dosar.dosarId}`)
                    .setLabel('✅ Da, continuăm')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`reminder_close_${dosar.dosarId}`)
                    .setLabel('🛑 Închide')
                    .setStyle(ButtonStyle.Danger)
            );

        const embed = new EmbedBuilder()
            .setTitle('⏰ Reminder Activitate')
            .setColor('Yellow')
            .setDescription('Activitatea ta este încă deschisă. Mai participați la această activitate?')
            .addFields(
                { name: '🆔 ID Dosar', value: `#${dosar.dosarId}` },
                { name: '📋 Tip Activitate', value: dosar.tipActivitate }
            )
            .setTimestamp();

        await creator.send({ embeds: [embed], components: [buttons] });

        dosar.reminderSent = true;
        await dosar.save();

        // Auto-close after 10 minutes if no response
        const autoCloseTimeout = setTimeout(async () => {
            try {
                const updatedDosar = await Dosar.findOne({ dosarId: dosar.dosarId });
                if (updatedDosar && updatedDosar.status === 'Activ' && updatedDosar.reminderSent) {
                    updatedDosar.status = 'Închis automat';
                    updatedDosar.dataFinal = new Date();
                    updatedDosar.motivaInchidere = 'Nu s-a răspuns la verificarea activității.';
                    await updatedDosar.save();

                    await updateDosarMessage(updatedDosar);
                }
            } catch (err) {
                console.error('Eroare auto-close dosar:', err);
            }
        }, 10 * 60 * 1000); // 10 minutes

        activeDosarReminders.set(dosar.dosarId, autoCloseTimeout);

    } catch (err) {
        console.error('Eroare trimitere reminder:', err);
    }
}

function startDailyReportChecker() {
    setInterval(async () => {
        const now = new Date();
        
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            await sendDailyReport();
        }
    }, 60 * 1000);
}

async function sendDailyReport() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dosars = await Dosar.find({
            dataInceput: { $gte: today, $lt: tomorrow }
        });

        if (dosars.length === 0) return;

        const legalCount = dosars.filter(d => getCategorie(d.tipActivitate) === 'Legală').length;
        const illegalCount = dosars.filter(d => getCategorie(d.tipActivitate) === 'Ilegală').length;

        const uniqueParticipants = new Set();
        dosars.forEach(d => {
            d.participantsIds.forEach(id => uniqueParticipants.add(id));
        });

        let totalDurationMs = 0;
        dosars.forEach(d => {
            const endDate = d.dataFinal || new Date();
            totalDurationMs += endDate - new Date(d.dataInceput);
        });

        const totalHours = Math.floor(totalDurationMs / (1000 * 60 * 60));
        const totalMinutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));

        const statsMap = {};
        dosars.forEach(d => {
            if (!statsMap[d.tipActivitate]) {
                statsMap[d.tipActivitate] = 0;
            }
            statsMap[d.tipActivitate]++;
        });

        let breakdown = '';
        Object.entries(statsMap).forEach(([activity, count]) => {
            breakdown += `• ${activity}: ${count}\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle('📊 RAPORT ZILNIC')
            .setColor('Gold')
            .addFields(
                { name: '📅 Data', value: today.toLocaleDateString('ro-RO'), inline: true },
                { name: '📈 Total activități', value: `${dosars.length}`, inline: true },
                { name: '✅ Legale', value: `${legalCount}`, inline: true },
                { name: '⛔ Ilegale', value: `${illegalCount}`, inline: true },
                { name: '👥 Participanți unici', value: `${uniqueParticipants.size}`, inline: true },
                { name: '⏱️ Durată totală', value: `${totalHours}h ${totalMinutes}m`, inline: true },
                { name: '📝 Defalcare', value: breakdown || 'Nicio activitate' }
            )
            .setFooter({ text: 'Sistem Automat de Evidență Activități RP' })
            .setTimestamp();

        const channel = await client.channels.fetch(dosarChannelId);
        await channel.send({ embeds: [embed] });

    } catch (err) {
        console.error('Eroare raport zilnic:', err);
    }
}

// ================= READY =================

client.once(Events.ClientReady, async () => {

    console.log(`🤖 Bot pornit ca ${client.user.tag}`);

    // Connect to MongoDB
    await connectMongoDB();

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
            .setDescription('Sistem de evidență activități RP')
            .addSubcommand(cmd =>
                cmd.setName('start')
                    .setDescription('Porneste o noua activitate')
                    .addStringOption(opt =>
                        opt.setName('tip')
                            .setDescription('Tip de activitate')
                            .setRequired(true)
                            .addChoices(
                                ...AKTIVITATI_LEGALE.map(a => ({ name: a, value: a })),
                                ...AKTIVITATI_ILEGALE.map(a => ({ name: a, value: a }))
                            )
                    )
                    .addStringOption(opt =>
                        opt.setName('participanti')
                            .setDescription('Participanți separati prin virgulă (ex: @user1, @user2)')
                            .setRequired(true)
                    )
            )
            .addSubcommand(cmd =>
                cmd.setName('stop')
                    .setDescription('Inchide o activitate')
                    .addStringOption(opt =>
                        opt.setName('id')
                            .setDescription('ID-ul dosarului')
                            .setRequired(true)
                    )
            )
            .addSubcommand(cmd =>
                cmd.setName('cauta-ora')
                    .setDescription('Cauta activitati la o anumita data si ora')
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
                    .setDescription('Statistici pentru un membru')
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
    
    // Start daily report checker
    startDailyReportChecker();
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
                const sub = interaction.options.getSubcommand();

                // Check Runner Role
                const hasRunnerRole = interaction.member.roles.cache.has(dosarRunnerRoleId);
                if (!hasRunnerRole) {
                    return interaction.reply({
                        content: '❌ Nu ai permisiune. Doar Runner și grade superioare pot folosi aceasta comanda.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                // ================= DOSAR START =================
                if (sub === 'start') {
                    try {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                        const tipActivitate = interaction.options.getString('tip');
                        const participantiString = interaction.options.getString('participanti');

                        // Parse participants
                        const mentions = participantiString.match(/<@!?(\d+)>/g) || [];
                        const participantsIds = mentions.map(m => m.replace(/[<@!>]/g, ''));

                        if (participantsIds.length === 0) {
                            return await interaction.editReply({
                                content: '❌ Trebuie sa adaugi cel putin un participant. Foloseste @mentions.'
                            });
                        }

                        // Check for overlapping dossiers
                        const activeDosarsDB = await Dosar.find({ status: 'Activ' });
                        for (const participant of participantsIds) {
                            const overlap = activeDosarsDB.some(d => d.participantsIds.includes(participant));
                            if (overlap) {
                                return await interaction.editReply({
                                    content: `❌ Utilizatorul <@${participant}> participă deja la o activitate activă.`
                                });
                            }
                        }

                        // Show modal for additional info
                        const modal = new ModalBuilder()
                            .setCustomId(`dosar_start_modal_${Date.now()}`)
                            .setTitle('📁 Creare Dosar Activitate');

                        const bodycamInput = new TextInputBuilder()
                            .setCustomId('bodycam')
                            .setLabel('Link Bodycam (opțional)')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false);

                        const observatiiInput = new TextInputBuilder()
                            .setCustomId('observatii')
                            .setLabel('Observații (opțional)')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false);

                        modal.addComponents(
                            new ActionRowBuilder().addComponents(bodycamInput),
                            new ActionRowBuilder().addComponents(observatiiInput)
                        );

                        // Store data temporarily
                        activeDosars.set(interaction.user.id, {
                            tipActivitate,
                            participantsIds,
                            creatorId: interaction.user.id
                        });

                        return await interaction.showModal(modal);

                    } catch (err) {
                        console.error('Eroare dosar start:', err);
                        await interaction.editReply({ content: '❌ Eroare la crearea dosarului.' });
                    }
                }

                // ================= DOSAR STOP =================
                if (sub === 'stop') {
                    try {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                        const dosarId = interaction.options.getString('id');
                        const dosar = await Dosar.findOne({ dosarId });

                        if (!dosar) {
                            return await interaction.editReply({ content: '❌ Dosarul nu a fost găsit.' });
                        }

                        if (dosar.status !== 'Activ') {
                            return await interaction.editReply({ content: '❌ Doar dosarele active pot fi închise.' });
                        }

                        const isCreator = dosar.creatorId === interaction.user.id;
                        const isLeadership = interaction.member.roles.cache.some(role =>
                            leadershipRoleIds.includes(role.id)
                        );

                        if (!isCreator && !isLeadership) {
                            return await interaction.editReply({ content: '❌ Doar creatorul sau grade superioare pot inchide dosarul.' });
                        }

                        dosar.status = 'Finalizat';
                        dosar.dataFinal = new Date();
                        await dosar.save();

                        // Clear reminder timeout if exists
                        if (activeDosarReminders.has(dosar.dosarId)) {
                            clearTimeout(activeDosarReminders.get(dosar.dosarId));
                            activeDosarReminders.delete(dosar.dosarId);
                        }

                        await updateDosarMessage(dosar);

                        await interaction.editReply({ 
                            content: `✅ Dosarul #${dosarId} a fost finalizat.`
                        });

                    } catch (err) {
                        console.error('Eroare dosar stop:', err);
                        await interaction.editReply({ content: '❌ Eroare la inchiderea dosarului.' });
                    }
                }

                // ================= DOSAR CAUTA-ORA =================
                if (sub === 'cauta-ora') {
                    try {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                        const dataStr = interaction.options.getString('data');
                        const oraStr = interaction.options.getString('ora');

                        const [day, month, year] = dataStr.split('-');
                        const [hour, minute] = oraStr.split(':');

                        const searchDate = new Date(year, month - 1, day, hour, minute);
                        const startOfDay = new Date(year, month - 1, day, 0, 0);
                        const endOfDay = new Date(year, month - 1, day, 23, 59);

                        const dosars = await Dosar.find({
                            $or: [
                                {
                                    status: 'Activ',
                                    dataInceput: { $lte: searchDate },
                                    dataFinal: { $gte: searchDate }
                                },
                                {
                                    dataInceput: { $gte: startOfDay, $lte: endOfDay }
                                }
                            ]
                        });

                        if (dosars.length === 0) {
                            return await interaction.editReply({ content: '✅ Nu exista activitati la aceasta data si ora.' });
                        }

                        let text = '';
                        for (const d of dosars) {
                            const duration = d.dataFinal 
                                ? getDuration(new Date(d.dataInceput), new Date(d.dataFinal))
                                : getDuration(new Date(d.dataInceput), new Date());

                            text += `\n**#${d.dosarId}** | ${d.tipActivitate} | ${d.status} | Durata: ${duration}`;
                        }

                        const embed = new EmbedBuilder()
                            .setTitle(`📋 Activități la ${dataStr} ${oraStr}`)
                            .setColor('Blue')
                            .setDescription(text)
                            .setFooter({ text: `Total: ${dosars.length} activități` })
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });

                    } catch (err) {
                        console.error('Eroare dosar cauta-ora:', err);
                        await interaction.editReply({ content: '❌ Data/ora invalida. Foloseste format DD-MM-YYYY si HH:MM' });
                    }
                }

                // ================= DOSAR MEMBRU =================
                if (sub === 'membru') {
                    try {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                        const user = interaction.options.getUser('utilizator');
                        const dosars = await Dosar.find({
                            participantsIds: user.id,
                            status: { $in: ['Finalizat', 'Închis automat'] }
                        });

                        if (dosars.length === 0) {
                            return await interaction.editReply({ 
                                content: `✅ ${user.tag} nu are activitati inchise.` 
                            });
                        }

                        const statsMap = {};
                        let totalDuration = 0;

                        dosars.forEach(d => {
                            const duration = getDuration(new Date(d.dataInceput), new Date(d.dataFinal || Date.now()));
                            const durationMs = (new Date(d.dataFinal || Date.now())) - (new Date(d.dataInceput));
                            totalDuration += durationMs;

                            if (!statsMap[d.tipActivitate]) {
                                statsMap[d.tipActivitate] = 0;
                            }
                            statsMap[d.tipActivitate]++;
                        });

                        const legalCount = dosars.filter(d => getCategorie(d.tipActivitate) === 'Legală').length;
                        const illegalCount = dosars.filter(d => getCategorie(d.tipActivitate) === 'Ilegală').length;

                        const totalHours = Math.floor(totalDuration / (1000 * 60 * 60));
                        const totalMinutes = Math.floor((totalDuration % (1000 * 60 * 60)) / (1000 * 60));

                        let breakdown = '';
                        Object.entries(statsMap).forEach(([activity, count]) => {
                            breakdown += `${activity}: ${count}\n`;
                        });

                        const embed = new EmbedBuilder()
                            .setTitle(`📊 Statistici ${user.tag}`)
                            .setColor('Blue')
                            .addFields(
                                { name: '📈 Total activități', value: `${dosars.length}`, inline: true },
                                { name: '✅ Activități legale', value: `${legalCount}`, inline: true },
                                { name: '⛔ Activități ilegale', value: `${illegalCount}`, inline: true },
                                { name: '📝 Defalcare', value: breakdown || 'Nicio activitate', inline: false },
                                { name: '⏱️ Timp total', value: `${totalHours}h ${totalMinutes}m`, inline: false }
                            )
                            .setThumbnail(user.displayAvatarURL())
                            .setFooter({ text: 'Sistem Automat de Evidență Activități RP' })
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });

                    } catch (err) {
                        console.error('Eroare dosar membru:', err);
                        await interaction.editReply({ content: '❌ Eroare la cautarea statisticilor.' });
                    }
                }
            }
        }

        // =====================================================
        // MODAL SUBMIT
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

            // ================= DOSAR MODAL HANDLERS =================

            if (interaction.customId.startsWith('dosar_start_modal_')) {
                try {
                    const tempData = activeDosars.get(interaction.user.id);
                    if (!tempData) {
                        return await interaction.reply({
                            content: '❌ Session expirată. Incearca din nou.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    // Show file upload prompt
                    const modal = new ModalBuilder()
                        .setCustomId(`dosar_image_modal_${Date.now()}`)
                        .setTitle('📁 Incarca Poza');

                    const imageUrlInput = new TextInputBuilder()
                        .setCustomId('image_url')
                        .setLabel('URL Poza (obligatoriu)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(imageUrlInput)
                    );

                    // Store more data
                    const bodycam = interaction.fields.getTextInputValue('bodycam') || null;
                    const observatii = interaction.fields.getTextInputValue('observatii') || null;

                    tempData.bodycam = bodycam;
                    tempData.observatii = observatii;
                    activeDosars.set(interaction.user.id, tempData);

                    return await interaction.showModal(modal);

                } catch (err) {
                    console.error('Eroare modal dosar start:', err);
                    await interaction.reply({
                        content: '❌ Eroare la prelucrarea formularului.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            if (interaction.customId.startsWith('dosar_image_modal_')) {
                try {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                    const tempData = activeDosars.get(interaction.user.id);
                    if (!tempData) {
                        return await interaction.editReply({
                            content: '❌ Session expirată.'
                        });
                    }

                    const imageUrl = interaction.fields.getTextInputValue('image_url');

                    dosarIdCounter++;
                    const dosarId = dosarIdCounter.toString().padStart(5, '0');

                    const dosar = new Dosar({
                        dosarId,
                        creatorId: tempData.creatorId,
                        participantsIds: tempData.participantsIds,
                        tipActivitate: tempData.tipActivitate,
                        categorie: getCategorie(tempData.tipActivitate),
                        imagine: imageUrl,
                        bodycam: tempData.bodycam,
                        observatii: tempData.observatii,
                        status: 'Activ',
                        dataInceput: new Date()
                    });

                    await dosar.save();

                    const participants = tempData.participantsIds.map(id => `<@${id}>`);
                    const embed = await createDosarEmbed(dosar, participants);

                    const channel = await client.channels.fetch(dosarChannelId);
                    const message = await channel.send({ embeds: [embed] });

                    dosar.messageId = message.id;
                    dosar.channelId = channel.id;
                    await dosar.save();

                    activeDosars.delete(interaction.user.id);

                    // Schedule reminder for 60 minutes
                    setTimeout(async () => {
                        const checkDosar = await Dosar.findOne({ dosarId });
                        if (checkDosar && checkDosar.status === 'Activ') {
                            await sendReminderDM(checkDosar);
                        }
                    }, 60 * 60 * 1000);

                    await interaction.editReply({
                        content: `✅ Dosarul #${dosarId} a fost creat cu succes!`
                    });

                } catch (err) {
                    console.error('Eroare modal image:', err);
                    await interaction.editReply({
                        content: '❌ Eroare la salvarea dosarului.'
                    });
                }
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
            // REMINDER BUTTONS
            // =====================================================

            if (interaction.customId.startsWith('reminder_continue_')) {
                try {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                    const dosarId = interaction.customId.split('_')[2];
                    const dosar = await Dosar.findOne({ dosarId });

                    if (!dosar || dosar.status !== 'Activ') {
                        return await interaction.editReply({ content: '❌ Dosarul nu a fost găsit.' });
                    }

                    dosar.reminderSent = false;
                    await dosar.save();

                    // Clear old timeout if exists
                    if (activeDosarReminders.has(dosarId)) {
                        clearTimeout(activeDosarReminders.get(dosarId));
                    }

                    // Schedule new reminder for 60 minutes
                    setTimeout(async () => {
                        const checkDosar = await Dosar.findOne({ dosarId });
                        if (checkDosar && checkDosar.status === 'Activ') {
                            await sendReminderDM(checkDosar);
                        }
                    }, 60 * 60 * 1000);

                    await interaction.editReply({ content: '✅ Timerul a fost resetat. Vei primi o noua notificare peste 60 de minute.' });

                } catch (err) {
                    console.error('Eroare reminder continue:', err);
                }
            }

            if (interaction.customId.startsWith('reminder_close_')) {
                try {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                    const dosarId = interaction.customId.split('_')[2];
                    const dosar = await Dosar.findOne({ dosarId });

                    if (!dosar || dosar.status !== 'Activ') {
                        return await interaction.editReply({ content: '❌ Dosarul nu a fost găsit.' });
                    }

                    dosar.status = 'Finalizat';
                    dosar.dataFinal = new Date();
                    await dosar.save();

                    // Clear timeout
                    if (activeDosarReminders.has(dosarId)) {
                        clearTimeout(activeDosarReminders.get(dosarId));
                        activeDosarReminders.delete(dosarId);
                    }

                    await updateDosarMessage(dosar);

                    await interaction.editReply({ content: '✅ Dosarul a fost finalizat.' });

                } catch (err) {
                    console.error('Eroare reminder close:', err);
                }
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
