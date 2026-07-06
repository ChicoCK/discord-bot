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

// ================= CONFIGURAȚII DIRECT ÎN COD =================
const token = 'MTUwMTM5MDE3ODg2MDY2Mjg0Nw.Gig6f6.SAweirW62WgtGjZKWodP8w15SR4NvlQXbe0PiA';
const clientId = '1501390178860662847'; // ID-ul noului tău Bot (extras din token)
const guildId = '1493764956859138170';  // ID-ul noului server
const logChannelId = '1503422335909367971'; // ID-ul canalului de log-uri (pentru CV, warn, amenzi)
const acceptedRoleIds = ['1504935162092195930']; // ID-urile de roluri care se oferă automat când CV-ul e acceptat

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

const invoiri = new Map();
let invoireCounter = 1;
// ================= CONFIG TASK =================

const taskChannelId = '1494860985066848357';
const taskLogsChannelId = '1503906070010269721';
const invoireLogsChannelId = '1493771851485417532';

const leadershipRoleIds = [
    '1493768690133499926',
    '1504935162092195930'
];

const invoireManagerRoleId = '1503084616695681064';

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

        // ================= INVOIRE =================

new SlashCommandBuilder()
    .setName('invoire')
    .setDescription('Trimite o cerere de invoire')
    .addStringOption(option =>
        option
            .setName('tip')
            .setDescription('Tipul invoirii')
            .setRequired(true)
            .addChoices(
                { name: 'Ore', value: 'ore' },
                { name: 'Zile', value: 'zile' }
            )
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

        // ================= COCA, CRACK, TIGARI =================

        new SlashCommandBuilder()
            .setName('coca')
            .setDescription('Calcul producție Coca')
            .addIntegerOption(option => option.setName('cantitate').setDescription('Număr de bucăți').setMinValue(1)),

        new SlashCommandBuilder()
            .setName('crack')
            .setDescription('Calcul producție Crack')
            .addIntegerOption(option => option.setName('cantitate').setDescription('Număr de bucăți').setMinValue(1)),

        new SlashCommandBuilder()
            .setName('tigari')
            .setDescription('Calcul producție Țigări')
            .addIntegerOption(option => option.setName('pachete').setDescription('Număr de pachete').setMinValue(1))

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
            // /COCA, /CRACK, /TIGARI (Verificare grad minim + comenzi)
            // =====================================================

            if (['coca', 'crack', 'tigari'].includes(interaction.commandName)) {
                const REQUIRED_ROLE_ID = '1493795104950059139';
                const isOwner = interaction.guild.ownerId === interaction.user.id;
                const isAdmin = interaction.member.permissions.has('Administrator');
                let hasAccess = isOwner || isAdmin;

                if (!hasAccess) {
                    const requiredRole = interaction.guild.roles.cache.get(REQUIRED_ROLE_ID);
                    if (requiredRole) {
                        const memberHighestRole = interaction.member.roles.highest;
                        if (memberHighestRole.position >= requiredRole.position) {
                            hasAccess = true;
                        }
                    } else {
                        if (interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
                            hasAccess = true;
                        }
                    }
                }

                if (!hasAccess) {
                    return interaction.reply({
                        content: `❌ Nu ai permisiunea de a folosi comenzile botului. Ai nevoie de gradul <@&${REQUIRED_ROLE_ID}> sau mai mare.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (interaction.commandName === 'coca') {
                    const cantitate = interaction.options.getInteger('cantitate') || 100;
                    return interaction.reply({ ...getCocaMessage(cantitate), flags: MessageFlags.Ephemeral });
                }
                if (interaction.commandName === 'crack') {
                    const cantitate = interaction.options.getInteger('cantitate') || 100;
                    return interaction.reply({ ...getCrackMessage(cantitate), flags: MessageFlags.Ephemeral });
                }
                if (interaction.commandName === 'tigari') {
                    const pachete = interaction.options.getInteger('pachete') || 10;
                    return interaction.reply({ ...getTigariMessage(pachete), flags: MessageFlags.Ephemeral });
                }
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
            // /CLEARAMENZI
            // =====================================================

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
            // /INVOIRE
            // =====================================================

            if (interaction.commandName === 'invoire') {

                const tip = interaction.options.getString('tip');

                const modal = new ModalBuilder()
                    .setCustomId(`invoire_modal_${tip}`)
                    .setTitle('Cerere de Invoire');

                const perioada = new TextInputBuilder()
                    .setCustomId('perioada')
                    .setLabel(
                        tip === 'ore'
                            ? 'Cate ore?'
                            : 'Cate zile?'
                    )
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const motiv = new TextInputBuilder()
                    .setCustomId('motiv')
                    .setLabel('Motiv')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(perioada),
                    new ActionRowBuilder().addComponents(motiv)
                );

                return interaction.showModal(modal);
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
        }

        // =====================================================
        // MODALS SUBMIT
        // =====================================================

        if (interaction.isModalSubmit()) {

            // ================= CV MODAL =================

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

            // ================= INVOIRE MODAL =================

            if (interaction.customId.startsWith('invoire_modal_')) {

                const tip = interaction.customId.split('_')[2];

                const perioada = parseInt(
                    interaction.fields.getTextInputValue('perioada')
                );

                const motiv =
                    interaction.fields.getTextInputValue('motiv');

                const startDate = new Date();

                const endDate = new Date();

                if (tip === 'zile') {
                    endDate.setDate(endDate.getDate() + perioada);
                }

                const id = invoireCounter++;

                invoiri.set(id.toString(), {
                    userId: interaction.user.id,
                    tip,
                    perioada,
                    motiv
                });

                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('📋 CERERE DE INVOIRE NOUA')
                    .addFields(
                        {
                            name: '🆔 ID',
                            value: `#${id}`
                        },
                        {
                            name: '👤 Membru',
                            value: `<@${interaction.user.id}>`
                        },
                        {
                            name: '📌 Tip Invoire',
                            value: tip === 'ore'
                                ? '⏰ Ore'
                                : '📅 Zile'
                        },
                        {
                            name: tip === 'ore'
                                ? '⏰ Ore Solicitate'
                                : '📅 Zile Solicitate',
                            value: `${perioada}`
                        },
                        {
                            name: '📝 Motiv',
                            value: motiv
                        },
                        {
                            name: '📌 Status',
                            value: '🟨 PENDING'
                        }
                    )
                    .setThumbnail(
                        interaction.user.displayAvatarURL()
                    )
                    .setFooter({
                        text: `User ID: ${interaction.user.id}`
                    });

                if (tip === 'zile') {
                    embed.addFields(
                        {
                            name: '🚀 Data Inceput',
                            value: startDate.toLocaleDateString('ro-RO')
                        },
                        {
                            name: '🏁 Data Sfarsit',
                            value: endDate.toLocaleDateString('ro-RO')
                        }
                    );
                }

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`accept_invoire_${id}`)
                            .setLabel('Aproba')
                            .setStyle(ButtonStyle.Success),

                        new ButtonBuilder()
                            .setCustomId(`reject_invoire_${id}`)
                            .setLabel('Respinge')
                            .setStyle(ButtonStyle.Danger)
                    );

                const logChannel =
                    await client.channels.fetch(
                        invoireLogsChannelId
                    );

                await logChannel.send({
                    embeds: [embed],
                    components: [buttons]
                });

                return interaction.reply({
                    content: '✅ Cererea de invoire a fost trimisa.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
        
        // =====================================================
        // BUTTONS
        // =====================================================

        if (interaction.isButton()) {

            // =====================================================
            // CALCULATOR BUTTONS (Coca, Crack, Tigari)
            // =====================================================

            if (interaction.customId.startsWith('coca:') || interaction.customId.startsWith('crack:') || interaction.customId.startsWith('tigari:')) {
                const REQUIRED_ROLE_ID = '1493795104950059139';
                const isOwner = interaction.guild.ownerId === interaction.user.id;
                const isAdmin = interaction.member.permissions.has('Administrator');
                let hasAccess = isOwner || isAdmin;

                if (!hasAccess) {
                    const requiredRole = interaction.guild.roles.cache.get(REQUIRED_ROLE_ID);
                    if (requiredRole) {
                        const memberHighestRole = interaction.member.roles.highest;
                        if (memberHighestRole.position >= requiredRole.position) {
                            hasAccess = true;
                        }
                    } else {
                        if (interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
                            hasAccess = true;
                        }
                    }
                }

                if (!hasAccess) {
                    return interaction.reply({
                        content: `❌ Nu ai permisiunea de a folosi comenzile botului. Ai nevoie de gradul <@&${REQUIRED_ROLE_ID}> sau mai mare.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                const customId = interaction.customId;
                const parts = customId.split(':');
                
                if (parts[0] === 'coca' && parts[1] === 'upd') {
                    const newPieces = parseInt(parts[2], 10);
                    return await interaction.update(getCocaMessage(newPieces));
                } 
                else if (parts[0] === 'crack' && parts[1] === 'upd') {
                    const newPieces = parseInt(parts[2], 10);
                    return await interaction.update(getCrackMessage(newPieces));
                } 
                else if (parts[0] === 'tigari' && parts[1] === 'upd') {
                    const newPacks = parseInt(parts[2], 10);
                    return await interaction.update(getTigariMessage(newPacks));
                }
                return;
            }

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

            if (interaction.customId.startsWith('accept_invoire_')) {

                const canManageInvoiri =
                    interaction.member.roles.cache.has(invoireManagerRoleId);

                if (!canManageInvoiri) {
                    return interaction.reply({
                        content: '❌ Nu ai permisiunea sa aprobi invoiri.',
                        flags: MessageFlags.Ephemeral
                    });
                }
                
                const embed =
                    EmbedBuilder.from(
                        interaction.message.embeds[0]
                    );

                embed.spliceFields(6, 1, {
                    name: '📌 Status',
                    value: '✅ ACCEPTED'
                });

                await interaction.update({
                    embeds: [embed],
                    components: []
                });

                const userId =
                    embed.footer.text.replace(
                        'User ID: ',
                        ''
                    );

                const logChannel =
                    await client.channels.fetch(
                        invoireLogsChannelId
                    );

                await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Green')
                            .setTitle('✅ INVOIRE APROBATA')
                            .setDescription(
                                `📢 Supervizorul ${interaction.user.tag} a ACCEPTAT invoirea lui <@${userId}>`
                            )
                            .addFields(
                                {
                                    name: '🆔 ID Cerere',
                                    value: embed.fields[0].value
                                },
                                {
                                    name: '👤 Membru',
                                    value: `<@${userId}>`
                                },
                                {
                                    name: '🛡️ Aprobata de',
                                    value: interaction.user.tag
                                }
                            )
                    ]
                });

                return;
            }

            if (interaction.customId.startsWith('reject_invoire_')) {

                const canManageInvoiri =
                    interaction.member.roles.cache.has(invoireManagerRoleId);

                if (!canManageInvoiri) {
                    return interaction.reply({
                        content: '❌ Nu ai permisiunea sa respingi invoiri.',
                        flags: MessageFlags.Ephemeral
                    });
                }
                
                const embed =
                    EmbedBuilder.from(
                        interaction.message.embeds[0]
                    );

                embed.spliceFields(6, 1, {
                    name: '📌 Status',
                    value: '❌ RESPINSA'
                });

                await interaction.update({
                    embeds: [embed],
                    components: []
                });

                const userId =
                    embed.footer.text.replace(
                        'User ID: ',
                        ''
                    );

                const logChannel =
                    await client.channels.fetch(
                        invoireLogsChannelId
                    );

                await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Red')
                            .setTitle('❌ INVOIRE RESPINSA')
                            .setDescription(
                                `📢 Supervizorul ${interaction.user.tag} a RESPINS invoirea lui <@${userId}>`
                            )
                            .addFields(
                                {
                                    name: '🆔 ID Cerere',
                                    value: embed.fields[0].value
                                },
                                {
                                    name: '👤 Membru',
                                    value: `<@${userId}>`
                                },
                                {
                                    name: '🛡️ Respinsa de',
                                    value: interaction.user.tag
                                }
                            )
                    ]
                });

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

                { name: '👨💼 Angajator', value: data.angajator },

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

// ================= DRUGS & TIGARI CALCULATOR FUNCTIONS =================

const PROD_PRICES = {
  AMONIAC: 4500,
  SODIU: 4500,
  PLIC: 150,
  FILTRU: 250,
  FOITA: 250,
  RASNITA: 200,
  PACHET_GOL: 100,
  BRICHETA: 70, 
  APA: 35,      
  TIGARI_VREVENU_CLEAN: 5000,
  TIGARI_VREVENU_DIRTY: 7000
};

function getCocaData(pieces) {
  const ratio = pieces / 50;
  const amoniac = Math.ceil(13 * ratio);
  const sodiu = Math.ceil(13 * ratio);
  const plicuri = pieces;
  const frunze = pieces * 3;
  const investitie = (amoniac * PROD_PRICES.AMONIAC) + (sodiu * PROD_PRICES.SODIU) + (plicuri * PROD_PRICES.PLIC);

  return {
    pieces: pieces,
    amoniac: amoniac,
    sodiu: sodiu,
    plicuri: plicuri,
    frunze: frunze,
    investitie: investitie
  };
}

function getCocaMessage(pieces) {
  const data = getCocaData(pieces);
  const estimatedRevenue = pieces * 3750;
  const profit = estimatedRevenue - data.investitie;
  const profitPercent = ((profit / estimatedRevenue) * 100).toFixed(1);

  const embed = new EmbedBuilder()
    .setTitle(`Calcul Producție Coca`)
    .setColor('#f1c40f')
    .setDescription(`**Cantitate:** ${data.pieces} bucăți`)
    .addFields(
      { name: '🧪 Materiale necesare:', value: `• Amoniac: **${data.amoniac.toLocaleString('en-US')}**\n• Sodiu: **${data.sodiu.toLocaleString('en-US')}**\n• Plicuri: **${data.plicuri.toLocaleString('en-US')}**\n• Frunze: **${data.frunze.toLocaleString('en-US')}**` },
      { name: '💰 Investiție Totală:', value: `\`${data.investitie.toLocaleString('en-US')}$\`` },
      { name: '📈 Profit Estimat:', value: `\`${profit.toLocaleString('en-US')}$\` (${profitPercent}%)` }
    )
    .setFooter({ text: "Calcul bazat pe tabelul de producție" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`coca:upd:${Math.max(1, pieces - 100)}:m100`).setLabel('-100').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`coca:upd:${Math.max(1, pieces - 10)}:m10`).setLabel('-10').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`coca:info`).setLabel(`Cantitate: ${pieces}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`coca:upd:${pieces + 10}:p10`).setLabel('+10').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`coca:upd:${pieces + 100}:p100`).setLabel('+100').setStyle(ButtonStyle.Success)
  );
  return { embeds: [embed], components: [row] };
}

function getCrackData(pieces) {
  const ratio = pieces / 100;
  const coca = Math.ceil(50 * ratio);
  const brichete = Math.ceil(50 * ratio);
  const apa = Math.ceil(100 * ratio);
  const investitie = (brichete * PROD_PRICES.BRICHETA) + (apa * PROD_PRICES.APA);
  const murdari = Math.ceil(3179 * pieces);
  const curati = Math.ceil(2225 * pieces);
  const costCoca = coca * 2500;
  const profit = curati - investitie - costCoca;

  return {
    pieces: pieces,
    coca: coca,
    brichete: brichete,
    apa: apa,
    investitie: investitie,
    murdari: murdari,
    curati: curati,
    profit: profit
  };
}

function getCrackMessage(pieces) {
  const data = getCrackData(pieces);
  const profitPercent = ((data.profit / data.curati) * 100).toFixed(1);

  const embed = new EmbedBuilder()
    .setTitle(`Calcul Producție Crack`)
    .setColor('#e74c3c')
    .setDescription(`**Cantitate:** ${data.pieces} bucăți`)
    .addFields(
      { name: '💎 Materiale necesare:', value: `• Coca: **${data.coca.toLocaleString('en-US')}**\n• Brichete: **${data.brichete.toLocaleString('en-US')}**\n• Apă: **${data.apa.toLocaleString('en-US')}**` },
      { name: '💰 Investiție (Brichete+Apă):', value: `\`${data.investitie.toLocaleString('en-US')}$\`` },
      { name: '💵 Bani Curați (Vânzare):', value: `\`${data.curati.toLocaleString('en-US')}$\`` },
      { name: '📈 Profit:', value: `\`${data.profit.toLocaleString('en-US')}$\` (${profitPercent}%)` }
    )
    .setFooter({ text: "Profitul include scăderea costului de Coca" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`crack:upd:${Math.max(1, pieces - 100)}:m100`).setLabel('-100').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`crack:upd:${Math.max(1, pieces - 10)}:m10`).setLabel('-10').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`crack:info`).setLabel(`Cantitate: ${pieces}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`crack:upd:${pieces + 10}:p10`).setLabel('+10').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`crack:upd:${pieces + 100}:p100`).setLabel('+100').setStyle(ButtonStyle.Success)
  );
  return { embeds: [embed], components: [row] };
}

function getTigariMessage(packs) {
  const data = {
    packs: packs,
    tutun: packs * 20,
    rasnite: packs * 2,
    pacheteGole: packs * 1,
    filtre: packs * 5,
    foite: packs * 5
  };

  const costRasnite = data.rasnite * PROD_PRICES.RASNITA;
  const costPachete = data.pacheteGole * PROD_PRICES.PACHET_GOL;
  const costFiltre = data.filtre * PROD_PRICES.FILTRU;
  const costFoite = data.foite * PROD_PRICES.FOITA;
  const totalInvestitie = costRasnite + costPachete + costFiltre + costFoite;
  
  const revenueClean = packs * PROD_PRICES.TIGARI_VREVENU_CLEAN;
  const revenueDirty = packs * PROD_PRICES.TIGARI_VREVENU_DIRTY;
  const profitClean = revenueClean - totalInvestitie;

  const embed = new EmbedBuilder()
    .setTitle(`🚬 Calcul Producție Țigări`)
    .setColor('#95a5a6')
    .setDescription(`**Cantitate:** ${data.packs} pachete (total ${data.packs * 20} țigări)`)
    .addFields(
      { name: '🌿 Tutun & Procesare:', value: `• Tutun mărunțit: **${data.tutun.toLocaleString('en-US')}**\n• Râșnițe necesare: **${data.rasnite.toLocaleString('en-US')}** (\`${costRasnite.toLocaleString('en-US')}$\`)` },
      { name: '📦 Ambalare & Filtre:', value: `• Pachete gole: **${data.pacheteGole.toLocaleString('en-US')}** (\`${costPachete.toLocaleString('en-US')}$\`)\n• Filtre: **${data.filtre.toLocaleString('en-US')}** (\`${costFiltre.toLocaleString('en-US')}$\`)\n• Foițe: **${data.foite.toLocaleString('en-US')}** (\`${costFoite.toLocaleString('en-US')}$\`)` },
      { name: '💰 Investiție Totală (Bani Curați):', value: `\`${totalInvestitie.toLocaleString('en-US')}$\`` },
      { name: '💵 Vânzare (Venit):', value: `• Bani Curați: **${revenueClean.toLocaleString('en-US')}$**\n• Bani Murdari: **${revenueDirty.toLocaleString('en-US')}$**`, inline: true },
      { name: '📈 Profit (Curați):', value: `\`${profitClean.toLocaleString('en-US')}$\``, inline: true }
    )
    .setFooter({ text: "1 pachet = 20 tutun, 5 filtre, 5 foițe" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tigari:upd:${Math.max(1, packs - 10)}:m10`).setLabel('-10').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`tigari:upd:${Math.max(1, packs - 1)}:m1`).setLabel('-1').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`tigari:info`).setLabel(`Cantitate: ${packs} pachete`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`tigari:upd:${packs + 1}:p1`).setLabel('+1').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`tigari:upd:${packs + 10}:p10`).setLabel('+10').setStyle(ButtonStyle.Success)
  );
  return { embeds: [embed], components: [row] };
}
