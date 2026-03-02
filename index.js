require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('better-sqlite3');

// ==============================
// قاعدة البيانات
// ==============================
const db = new Database('economy.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    balance INTEGER DEFAULT 5000,
    bank INTEGER DEFAULT 0,
    loan INTEGER DEFAULT 0,
    loan_due INTEGER DEFAULT 0,
    reputation INTEGER DEFAULT 100,
    protection_until INTEGER DEFAULT 0,
    last_salary INTEGER DEFAULT 0,
    last_work INTEGER DEFAULT 0,
    last_gamble INTEGER DEFAULT 0,
    last_invest INTEGER DEFAULT 0,
    last_trade INTEGER DEFAULT 0,
    last_rob INTEGER DEFAULT 0,
    last_collect INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT,
    type TEXT,
    prop_id TEXT,
    name TEXT,
    price INTEGER,
    income INTEGER,
    bought_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS government (
    id INTEGER PRIMARY KEY DEFAULT 1,
    treasury INTEGER DEFAULT 0
  );
  INSERT OR IGNORE INTO government (id, treasury) VALUES (1, 0);
`);

// ==============================
// البيانات الثابتة
// ==============================
const HOUSES = [
  { id: 'h1',  name: '🏠 غرفة مشتركة',       price: 5_000,    income: 30 },
  { id: 'h2',  name: '🏠 شقة صغيرة',          price: 15_000,   income: 80 },
  { id: 'h3',  name: '🏠 شقة عادية',           price: 30_000,   income: 150 },
  { id: 'h4',  name: '🏠 شقة مفروشة',          price: 60_000,   income: 280 },
  { id: 'h5',  name: '🏡 بيت شعبي',            price: 100_000,  income: 450 },
  { id: 'h6',  name: '🏡 بيت عائلي',           price: 180_000,  income: 800 },
  { id: 'h7',  name: '🏡 فيلا صغيرة',          price: 300_000,  income: 1_300 },
  { id: 'h8',  name: '🏡 فيلا عادية',           price: 500_000,  income: 2_100 },
  { id: 'h9',  name: '🏡 فيلا فاخرة',           price: 800_000,  income: 3_300 },
  { id: 'h10', name: '🏰 قصر صغير',            price: 1_200_000, income: 5_000 },
  { id: 'h11', name: '🏰 قصر عصري',            price: 1_800_000, income: 7_500 },
  { id: 'h12', name: '🏰 قصر ملكي',            price: 2_500_000, income: 10_500 },
  { id: 'h13', name: '🌊 شاليه ساحلي',          price: 3_500_000, income: 14_500 },
  { id: 'h14', name: '🌴 فيلا جزيرة خاصة',      price: 5_000_000, income: 20_000 },
  { id: 'h15', name: '🏔 شاليه جبلي',           price: 7_000_000, income: 28_000 },
  { id: 'h16', name: '✈️ بنتهاوس طابق 50',      price: 10_000_000, income: 40_000 },
  { id: 'h17', name: '🌍 قصر تاريخي',           price: 15_000_000, income: 60_000 },
  { id: 'h18', name: '🚀 برج سكني خاص',         price: 25_000_000, income: 100_000 },
  { id: 'h19', name: '👑 قصر فضائي',            price: 50_000_000, income: 200_000 },
  { id: 'h20', name: '💎 قصر الأمراء',          price: 100_000_000, income: 420_000 },
];

const COMPANIES = [
  { id: 'c1',  name: '🛒 بقالة صغيرة',         price: 10_000,   income: 70 },
  { id: 'c2',  name: '☕ كافيه',               price: 25_000,   income: 160 },
  { id: 'c3',  name: '🍔 مطعم وجبات سريعة',     price: 50_000,   income: 310 },
  { id: 'c4',  name: '💈 صالون حلاقة',          price: 80_000,   income: 490 },
  { id: 'c5',  name: '🏪 متجر إلكترونيات',      price: 150_000,  income: 900 },
  { id: 'c6',  name: '🚗 معرض سيارات',          price: 300_000,  income: 1_800 },
  { id: 'c7',  name: '🏋️ صالة رياضية',          price: 500_000,  income: 2_900 },
  { id: 'c8',  name: '🏨 فندق صغير',            price: 800_000,  income: 4_600 },
  { id: 'c9',  name: '🏗 شركة مقاولات',         price: 1_200_000, income: 7_000 },
  { id: 'c10', name: '💊 صيدلية كبرى',          price: 1_800_000, income: 10_500 },
  { id: 'c11', name: '✈️ شركة طيران',           price: 3_000_000, income: 17_000 },
  { id: 'c12', name: '📱 شركة تقنية',           price: 5_000_000, income: 28_000 },
  { id: 'c13', name: '🏭 مصنع كبير',            price: 8_000_000, income: 45_000 },
  { id: 'c14', name: '🛢 شركة نفط',             price: 12_000_000, income: 70_000 },
  { id: 'c15', name: '🏦 بنك خاص',              price: 20_000_000, income: 115_000 },
  { id: 'c16', name: '🌐 شركة إنترنت عالمية',   price: 35_000_000, income: 200_000 },
  { id: 'c17', name: '🚀 شركة فضاء',            price: 60_000_000, income: 340_000 },
  { id: 'c18', name: '💎 شركة مجوهرات ملكية',   price: 100_000_000, income: 560_000 },
  { id: 'c19', name: '🌍 إمبراطورية تجارية',    price: 200_000_000, income: 1_100_000 },
  { id: 'c20', name: '👑 احتكار عالمي',         price: 500_000_000, income: 2_800_000 },
];

const LEVELS = [
  { level: 1, min: 0,           name: '👶 مبتدئ',    salary: 500 },
  { level: 2, min: 10_000,      name: '🧑 عامل',     salary: 1_000 },
  { level: 3, min: 50_000,      name: '💼 موظف',     salary: 2_500 },
  { level: 4, min: 200_000,     name: '📊 مدير',     salary: 6_000 },
  { level: 5, min: 1_000_000,   name: '🏢 رجل أعمال', salary: 15_000 },
  { level: 6, min: 5_000_000,   name: '💎 ثري',      salary: 40_000 },
  { level: 7, min: 20_000_000,  name: '👑 مليونير',  salary: 100_000 },
  { level: 8, min: 100_000_000, name: '🌟 إمبراطور', salary: 300_000 },
];

const ITEMS_PER_PAGE = 5;

// أوقات التبريد (بالمللي ثانية)
const COOLDOWNS = {
  راتب:    4 * 60 * 60 * 1000,
  عمل:     2 * 60 * 60 * 1000,
  مجازفة:  30 * 60 * 1000,
  استثمر:  60 * 60 * 1000,
  تداول:   45 * 60 * 1000,
  سرقة:    2 * 60 * 60 * 1000,
  تحصيل:   1 * 60 * 60 * 1000,
};

// ==============================
// دوال مساعدة
// ==============================
function fmt(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B 💰';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M 💰';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K 💰';
  return n.toLocaleString('ar') + ' 💰';
}

function getLevel(total) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (total >= l.min) cur = l;
  return cur;
}

function getUser(id, username = '') {
  let u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!u) {
    db.prepare('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)').run(id, username);
    u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }
  return u;
}

function cooldownLeft(user, cmd) {
  const fieldMap = { راتب: 'last_salary', عمل: 'last_work', مجازفة: 'last_gamble', استثمر: 'last_invest', تداول: 'last_trade', سرقة: 'last_rob', تحصيل: 'last_collect' };
  const field = fieldMap[cmd];
  if (!field) return 0;
  const elapsed = Date.now() - (user[field] || 0);
  return Math.max(0, COOLDOWNS[cmd] - elapsed);
}

function fmtTime(ms) {
  if (ms <= 0) return '✅ جاهز';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}س ${m}د ${s}ث`;
  if (m > 0) return `${m}د ${s}ث`;
  return `${s}ث`;
}

function buildPageButtons(page, totalPages, prefix) {
  const row = new ActionRowBuilder();
  row.addComponents(
    new ButtonBuilder().setCustomId(`${prefix}_${page - 1}`).setLabel('◀️ السابق').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder().setCustomId(`${prefix}_info`).setLabel(`${page + 1} / ${totalPages}`).setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId(`${prefix}_${page + 1}`).setLabel('التالي ▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
  );
  return row;
}

function buildHousesEmbed(page) {
  const start = page * ITEMS_PER_PAGE;
  const slice = HOUSES.slice(start, start + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(HOUSES.length / ITEMS_PER_PAGE);
  const desc = slice.map(h =>
    `**${h.name}** \`[${h.id}]\`\n💰 السعر: ${fmt(h.price)} | 📈 دخل/ساعة: ${fmt(h.income)}`
  ).join('\n\n');
  const embed = new EmbedBuilder()
    .setTitle('🏠 سوق البيوت')
    .setColor('#3498db')
    .setDescription(desc)
    .setFooter({ text: `صفحة ${page + 1} من ${totalPages} | اكتب: شراء بيت [id]` });
  return { embed, totalPages };
}

function buildCompaniesEmbed(page) {
  const start = page * ITEMS_PER_PAGE;
  const slice = COMPANIES.slice(start, start + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(COMPANIES.length / ITEMS_PER_PAGE);
  const desc = slice.map(c =>
    `**${c.name}** \`[${c.id}]\`\n💰 السعر: ${fmt(c.price)} | 📈 دخل/ساعة: ${fmt(c.income)}`
  ).join('\n\n');
  const embed = new EmbedBuilder()
    .setTitle('🏢 سوق الشركات')
    .setColor('#9b59b6')
    .setDescription(desc)
    .setFooter({ text: `صفحة ${page + 1} من ${totalPages} | اكتب: شراء شركة [id]` });
  return { embed, totalPages };
}

// ==============================
// البوت
// ==============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

client.once('ready', () => {
  console.log(`✅ البوت شغال: ${client.user.tag}`);
  // تشغيل الأنظمة التلقائية
  startTaxSystem();
  startConfiscationSystem();
});

// ==============================
// معالج الرسائل
// ==============================
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const raw = msg.content.trim();
  const parts = raw.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);
  const user = getUser(msg.author.id, msg.author.username);

  // ==============================
  // أوامر
  // ==============================
  try {

    // -------- ملفي / بروفايل --------
    if (cmd === 'ملفي' || cmd === 'بروفايل') {
      const target = msg.mentions.users.first();
      const u = target ? getUser(target.id, target.username) : user;
      const level = getLevel(u.balance + u.bank);
      const props = db.prepare('SELECT * FROM properties WHERE owner_id = ?').all(u.id);
      const totalIncome = props.reduce((s, p) => s + p.income, 0);
      const isProtected = u.protection_until > Date.now();

      const embed = new EmbedBuilder()
        .setTitle(`📊 الملف الاقتصادي — ${target?.username || msg.author.username}`)
        .setThumbnail((target || msg.author).displayAvatarURL())
        .setColor(isProtected ? '#00ff88' : '#4e8aff')
        .addFields(
          { name: '💰 المحفظة', value: fmt(u.balance), inline: true },
          { name: '🏦 البنك', value: fmt(u.bank), inline: true },
          { name: '📊 الإجمالي', value: fmt(u.balance + u.bank), inline: true },
          { name: '🏆 المستوى', value: level.name, inline: true },
          { name: '⭐ السمعة', value: `${u.reputation}/100`, inline: true },
          { name: '📈 دخل/ساعة', value: fmt(totalIncome), inline: true },
          { name: '🏠 عدد الممتلكات', value: `${props.length}`, inline: true },
          { name: '💳 القرض', value: u.loan > 0 ? fmt(u.loan) : 'لا يوجد', inline: true },
          { name: '🛡 الحماية', value: isProtected ? `⏰ ${fmtTime(u.protection_until - Date.now())}` : '❌ غير مفعلة', inline: true },
        )
        .setFooter({ text: `راتبك: ${fmt(level.salary)} كل 4 ساعات` })
        .setTimestamp();

      return msg.reply({ embeds: [embed] });
    }

    // -------- رصيد --------
    if (cmd === 'رصيد') {
      const embed = new EmbedBuilder()
        .setTitle('💳 رصيدك')
        .setColor('#4e8aff')
        .addFields(
          { name: '💰 المحفظة', value: fmt(user.balance), inline: true },
          { name: '🏦 البنك', value: fmt(user.bank), inline: true },
          { name: '📊 الإجمالي', value: fmt(user.balance + user.bank), inline: true },
        );
      return msg.reply({ embeds: [embed] });
    }

    // -------- راتب --------
    if (cmd === 'راتب') {
      const left = cooldownLeft(user, 'راتب');
      if (left > 0) return msg.reply(`⏰ راتبك القادم بعد **${fmtTime(left)}**`);

      const level = getLevel(user.balance + user.bank);
      const tax = Math.floor(level.salary * 0.01);
      const net = level.salary - tax;

      db.prepare('UPDATE users SET balance = balance + ?, last_salary = ? WHERE id = ?').run(net, Date.now(), msg.author.id);
      db.prepare('UPDATE government SET treasury = treasury + ? WHERE id = 1').run(tax);

      const embed = new EmbedBuilder()
        .setTitle('💰 تم استلام الراتب!')
        .setColor('#00ff88')
        .addFields(
          { name: '📥 الراتب', value: fmt(level.salary), inline: true },
          { name: '⚖️ ضريبة 1%', value: fmt(tax), inline: true },
          { name: '✅ الصافي', value: fmt(net), inline: true },
        )
        .setFooter({ text: 'الراتب القادم بعد 4 ساعات' });
      return msg.reply({ embeds: [embed] });
    }

    // -------- عمل --------
    if (cmd === 'عمل') {
      const left = cooldownLeft(user, 'عمل');
      if (left > 0) return msg.reply(`⏰ تعب! ارجع بعد **${fmtTime(left)}**`);

      const level = getLevel(user.balance + user.bank);
      const earned = Math.floor(level.salary * 0.3 + Math.random() * level.salary * 0.4);
      const jobs = ['🔨 عمل في البناء', '💻 برمج موقع', '🚗 وصّل طلبيات', '📦 رتّب مستودع', '🍳 طبخ في مطعم', '🌿 شغل في المزرعة', '🔧 صيانة سيارات'];
      const job = jobs[Math.floor(Math.random() * jobs.length)];

      db.prepare('UPDATE users SET balance = balance + ?, last_work = ? WHERE id = ?').run(earned, Date.now(), msg.author.id);

      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(job).setColor('#ffd700')
          .setDescription(`عملت وكسبت **${fmt(earned)}**!`)
          .setFooter({ text: 'ارجع كل ساعتين للعمل' })
      ]});
    }

    // -------- تحويل --------
    if (cmd === 'تحويل') {
      const target = msg.mentions.users.first();
      const amount = parseInt(args[1]);
      if (!target || isNaN(amount) || amount <= 0)
        return msg.reply('❌ الاستخدام: `تحويل @شخص المبلغ`');
      if (target.id === msg.author.id) return msg.reply('❌ ما تقدر تحوّل لنفسك!');
      if (user.balance < amount) return msg.reply('❌ رصيدك ما يكفي!');

      const fee = Math.max(1, Math.floor(amount * 0.02));
      const received = amount - fee;

      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(amount, msg.author.id);
      getUser(target.id, target.username);
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(received, target.id);
      db.prepare('UPDATE government SET treasury = treasury + ? WHERE id = 1').run(fee);

      const embed = new EmbedBuilder()
        .setTitle('✅ تم التحويل')
        .setColor('#00ff88')
        .addFields(
          { name: '📤 المرسل', value: msg.author.username, inline: true },
          { name: '📥 المستلم', value: target.username, inline: true },
          { name: '💰 المبلغ', value: fmt(amount), inline: true },
          { name: '💸 رسوم 2%', value: fmt(fee), inline: true },
          { name: '✅ وصل', value: fmt(received), inline: true },
        );
      return msg.reply({ embeds: [embed] });
    }

    // -------- إيداع --------
    if (cmd === 'إيداع' || cmd === 'ايداع') {
      const amount = args[0]?.toLowerCase() === 'كل' ? user.balance : parseInt(args[0]);
      if (isNaN(amount) || amount <= 0) return msg.reply('❌ الاستخدام: `إيداع المبلغ` أو `إيداع كل`');
      if (user.balance < amount) return msg.reply('❌ رصيدك ما يكفي!');

      db.prepare('UPDATE users SET balance = balance - ?, bank = bank + ? WHERE id = ?').run(amount, amount, msg.author.id);
      return msg.reply({ embeds: [new EmbedBuilder().setTitle('🏦 تم الإيداع').setColor('#00ff88').setDescription(`أودعت **${fmt(amount)}** في البنك`)] });
    }

    // -------- سحب --------
    if (cmd === 'سحب') {
      const amount = args[0]?.toLowerCase() === 'كل' ? user.bank : parseInt(args[0]);
      if (isNaN(amount) || amount <= 0) return msg.reply('❌ الاستخدام: `سحب المبلغ` أو `سحب كل`');
      if (user.bank < amount) return msg.reply('❌ رصيد البنك ما يكفي!');

      db.prepare('UPDATE users SET bank = bank - ?, balance = balance + ? WHERE id = ?').run(amount, amount, msg.author.id);
      return msg.reply({ embeds: [new EmbedBuilder().setTitle('💰 تم السحب').setColor('#00ff88').setDescription(`سحبت **${fmt(amount)}** من البنك`)] });
    }

    // -------- سوق البيوت --------
    if (cmd === 'بيوت') {
      const { embed, totalPages } = buildHousesEmbed(0);
      const row = buildPageButtons(0, totalPages, 'houses');
      return msg.reply({ embeds: [embed], components: [row] });
    }

    // -------- سوق الشركات --------
    if (cmd === 'شركات') {
      const { embed, totalPages } = buildCompaniesEmbed(0);
      const row = buildPageButtons(0, totalPages, 'companies');
      return msg.reply({ embeds: [embed], components: [row] });
    }

    // -------- شراء --------
    if (cmd === 'شراء') {
      const type = args[0]; // بيت أو شركة
      const itemId = args[1]?.toLowerCase();

      if (!type || !itemId || !['بيت', 'شركة', 'شركه'].includes(type))
        return msg.reply('❌ الاستخدام: `شراء بيت h1` أو `شراء شركة c1`');

      const isHouse = type === 'بيت';
      const list = isHouse ? HOUSES : COMPANIES;
      const item = list.find(i => i.id === itemId);

      if (!item) return msg.reply(`❌ الـID غير صحيح! استخدم \`${isHouse ? 'بيوت' : 'شركات'}\` للعرض`);
      if (user.balance < item.price) return msg.reply(`❌ تحتاج **${fmt(item.price)}** ورصيدك **${fmt(user.balance)}**`);

      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(item.price, msg.author.id);
      db.prepare('INSERT INTO properties (owner_id, type, prop_id, name, price, income) VALUES (?, ?, ?, ?, ?, ?)')
        .run(msg.author.id, isHouse ? 'house' : 'company', item.id, item.name, item.price, item.income);

      const embed = new EmbedBuilder()
        .setTitle(`✅ تم الشراء — ${item.name}`)
        .setColor('#00ff88')
        .addFields(
          { name: '💰 السعر', value: fmt(item.price), inline: true },
          { name: '📈 دخل/ساعة', value: fmt(item.income), inline: true },
          { name: '📅 دخل/يوم', value: fmt(item.income * 24), inline: true },
        );
      return msg.reply({ embeds: [embed] });
    }

    // -------- بيع --------
    if (cmd === 'بيع') {
      const propId = parseInt(args[0]);
      if (isNaN(propId)) return msg.reply('❌ الاستخدام: `بيع [رقم العقار]` — شوف `ممتلكاتي`');

      const prop = db.prepare('SELECT * FROM properties WHERE id = ? AND owner_id = ?').get(propId, msg.author.id);
      if (!prop) return msg.reply('❌ العقار غير موجود أو ليس ملكك!');

      const sellPrice = Math.floor(prop.price * 0.70);
      db.prepare('DELETE FROM properties WHERE id = ?').run(propId);
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(sellPrice, msg.author.id);

      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(`💸 تم البيع — ${prop.name}`).setColor('#ffd700')
          .addFields(
            { name: '💰 سعر الشراء', value: fmt(prop.price), inline: true },
            { name: '✅ استلمت (70%)', value: fmt(sellPrice), inline: true },
          )
      ]});
    }

    // -------- ممتلكاتي --------
    if (cmd === 'ممتلكاتي') {
      const props = db.prepare('SELECT * FROM properties WHERE owner_id = ?').all(msg.author.id);
      if (props.length === 0) return msg.reply('🏚 ليس لديك ممتلكات! استخدم `شراء بيت [id]`');

      const houses = props.filter(p => p.type === 'house');
      const companies = props.filter(p => p.type === 'company');
      const totalIncome = props.reduce((s, p) => s + p.income, 0);

      let desc = '';
      if (houses.length > 0) {
        desc += '**🏠 البيوت:**\n';
        houses.forEach(h => desc += `• \`#${h.id}\` ${h.name} — ${fmt(h.income)}/ساعة\n`);
      }
      if (companies.length > 0) {
        desc += '\n**🏢 الشركات:**\n';
        companies.forEach(c => desc += `• \`#${c.id}\` ${c.name} — ${fmt(c.income)}/ساعة\n`);
      }

      const embed = new EmbedBuilder()
        .setTitle(`🏛 ممتلكات ${msg.author.username}`)
        .setColor('#9b59b6')
        .setDescription(desc)
        .addFields(
          { name: '📈 دخل/ساعة', value: fmt(totalIncome), inline: true },
          { name: '📅 دخل/يوم', value: fmt(totalIncome * 24), inline: true },
        )
        .setFooter({ text: 'لبيع عقار: بيع [رقم العقار]' });
      return msg.reply({ embeds: [embed] });
    }

    // -------- تحصيل --------
    if (cmd === 'تحصيل') {
      const left = cooldownLeft(user, 'تحصيل');
      if (left > 0) return msg.reply(`⏰ انتظر **${fmtTime(left)}** قبل التحصيل`);

      const props = db.prepare('SELECT * FROM properties WHERE owner_id = ?').all(msg.author.id);
      if (props.length === 0) return msg.reply('❌ ليس لديك ممتلكات!');

      const now = Date.now();
      let total = 0;
      for (const p of props) {
        const hours = Math.min(24, (now - p.bought_at * 1000) / 3600000);
        total += Math.floor(p.income * hours);
        db.prepare('UPDATE properties SET bought_at = ? WHERE id = ?').run(Math.floor(now / 1000), p.id);
      }

      db.prepare('UPDATE users SET balance = balance + ?, last_collect = ? WHERE id = ?').run(total, now, msg.author.id);

      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('💰 تم التحصيل!').setColor('#00ff88')
          .setDescription(`جمعت **${fmt(total)}** من **${props.length}** عقارات!`)
          .setFooter({ text: 'ارجع بعد ساعة للتحصيل مجدداً' })
      ]});
    }

    // -------- قرض --------
    if (cmd === 'قرض') {
      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount <= 0) return msg.reply('❌ الاستخدام: `قرض المبلغ`');
      if (user.loan > 0) return msg.reply(`❌ عندك قرض قائم! سدده أولاً بـ \`سداد\``);

      const max = Math.max(10_000, (user.balance + user.bank) * 2);
      if (amount > max) return msg.reply(`❌ الحد الأقصى: **${fmt(max)}**`);

      const repay = Math.floor(amount * 1.10);
      const due = Date.now() + 7 * 24 * 60 * 60 * 1000;

      db.prepare('UPDATE users SET balance = balance + ?, loan = ?, loan_due = ? WHERE id = ?').run(amount, repay, due, msg.author.id);

      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('🏦 تم منح القرض').setColor('#ffd700')
          .addFields(
            { name: '💰 استلمت', value: fmt(amount), inline: true },
            { name: '💸 للسداد +10%', value: fmt(repay), inline: true },
            { name: '⏰ المهلة', value: '7 أيام', inline: true },
          )
          .setFooter({ text: '⚠️ عدم السداد يؤدي لمصادرة ممتلكاتك!' })
      ]});
    }

    // -------- سداد --------
    if (cmd === 'سداد') {
      if (user.loan === 0) return msg.reply('✅ ليس عليك أي قرض!');
      if (user.balance < user.loan) return msg.reply(`❌ تحتاج **${fmt(user.loan)}** ورصيدك **${fmt(user.balance)}**`);

      const loan = user.loan;
      db.prepare('UPDATE users SET balance = balance - ?, loan = 0, loan_due = 0 WHERE id = ?').run(loan, msg.author.id);
      db.prepare('UPDATE government SET treasury = treasury + ? WHERE id = 1').run(Math.floor(loan * 0.1));

      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('✅ تم سداد القرض!').setColor('#00ff88')
          .setDescription(`سددت **${fmt(loan)}** بنجاح! 🎉`)
      ]});
    }

    // -------- حماية --------
    if (cmd === 'حماية') {
      const options = { '6': { hours: 6, price: 5_000 }, '12': { hours: 12, price: 9_000 }, '24': { hours: 24, price: 15_000 }, '72': { hours: 72, price: 35_000 } };
      const opt = options[args[0]];
      if (!opt) return msg.reply('❌ الاستخدام: `حماية 6` أو `حماية 12` أو `حماية 24` أو `حماية 72`\n💰 الأسعار: 6ساعات=5K | 12ساعة=9K | 24ساعة=15K | 3أيام=35K');
      if (user.balance < opt.price) return msg.reply(`❌ تحتاج **${fmt(opt.price)}**`);

      const until = Date.now() + opt.hours * 3600000;
      db.prepare('UPDATE users SET balance = balance - ?, protection_until = ? WHERE id = ?').run(opt.price, until, msg.author.id);

      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('🛡 تم تفعيل الحماية!').setColor('#00ff88')
          .addFields(
            { name: '⏰ المدة', value: `${opt.hours} ساعة`, inline: true },
            { name: '💰 التكلفة', value: fmt(opt.price), inline: true },
            { name: '🕐 تنتهي', value: `<t:${Math.floor(until / 1000)}:R>`, inline: true },
          )
      ]});
    }

    // -------- مجازفة --------
    if (cmd === 'مجازفة') {
      const left = cooldownLeft(user, 'مجازفة');
      if (left > 0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);

      const amount = args[0]?.toLowerCase() === 'كل' ? user.balance : parseInt(args[0]);
      if (isNaN(amount) || amount < 100) return msg.reply('❌ الاستخدام: `مجازفة المبلغ` (الحد الأدنى 100)');
      if (user.balance < amount) return msg.reply('❌ رصيدك ما يكفي!');

      const win = Math.random() > 0.5;
      const change = win ? amount : -amount;
      db.prepare('UPDATE users SET balance = balance + ?, last_gamble = ? WHERE id = ?').run(change, Date.now(), msg.author.id);

      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(win ? '🎉 ربحت!' : '😭 خسرت!').setColor(win ? '#00ff88' : '#e74c3c')
          .addFields(
            { name: '🎲 النتيجة', value: win ? '✅ فزت' : '❌ خسرت', inline: true },
            { name: '💰 المبلغ', value: fmt(amount), inline: true },
            { name: '💳 الرصيد الجديد', value: fmt(user.balance + change), inline: true },
          )
      ]});
    }

    // -------- استثمر --------
    if (cmd === 'استثمر') {
      const left = cooldownLeft(user, 'استثمر');
      if (left > 0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);

      const amount = parseInt(args[0]);
      const riskKey = args[1] || 'منخفض';
      if (isNaN(amount) || amount < 1000) return msg.reply('❌ الاستخدام: `استثمر المبلغ [منخفض/متوسط/عالي]`');
      if (user.balance < amount) return msg.reply('❌ رصيدك ما يكفي!');

      const risks = {
        منخفض: { winChance: 0.80, minG: 0.10, maxG: 0.30, maxL: 0.05 },
        متوسط: { winChance: 0.60, minG: 0.20, maxG: 0.60, maxL: 0.25 },
        عالي:  { winChance: 0.45, minG: 0.50, maxG: 1.50, maxL: 0.40 },
      };
      const cfg = risks[riskKey] || risks['منخفض'];
      const win = Math.random() < cfg.winChance;
      const change = win
        ? Math.floor(amount * (cfg.minG + Math.random() * (cfg.maxG - cfg.minG)))
        : -Math.floor(amount * cfg.maxL);

      db.prepare('UPDATE users SET balance = balance + ?, last_invest = ? WHERE id = ?').run(change, Date.now(), msg.author.id);

      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(win ? '📈 استثمار ناجح!' : '📉 خسارة!').setColor(win ? '#00ff88' : '#e74c3c')
          .addFields(
            { name: '💰 المستثمر', value: fmt(amount), inline: true },
            { name: win ? '📈 الربح' : '📉 الخسارة', value: fmt(Math.abs(change)), inline: true },
            { name: '💳 الرصيد الجديد', value: fmt(user.balance + change), inline: true },
          )
      ]});
    }

    // -------- تداول --------
    if (cmd === 'تداول') {
      const left = cooldownLeft(user, 'تداول');
      if (left > 0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);

      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount < 5000) return msg.reply('❌ الاستخدام: `تداول المبلغ` (الحد الأدنى 5000)');
      if (user.balance < amount) return msg.reply('❌ رصيدك ما يكفي!');

      const roll = Math.random();
      let change, result;
      if (roll > 0.7)       { change = Math.floor(amount * (0.5 + Math.random())); result = `📈 موجة صعود!`; }
      else if (roll > 0.4)  { change = Math.floor(amount * 0.1 * Math.random()); result = `📊 ارتفاع بسيط`; }
      else if (roll > 0.15) { change = -Math.floor(amount * 0.2 * Math.random()); result = `📉 تراجع طفيف`; }
      else                  { change = -Math.floor(amount * (0.3 + Math.random() * 0.4)); result = `💥 انهيار!`; }

      db.prepare('UPDATE users SET balance = balance + ?, last_trade = ? WHERE id = ?').run(change, Date.now(), msg.author.id);

      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(`📊 ${result}`).setColor(change >= 0 ? '#00ff88' : '#e74c3c')
          .addFields(
            { name: '💰 المبلغ', value: fmt(amount), inline: true },
            { name: change >= 0 ? '📈 ربح' : '📉 خسارة', value: fmt(Math.abs(change)), inline: true },
            { name: '💳 الرصيد الجديد', value: fmt(user.balance + change), inline: true },
          )
      ]});
    }

    // -------- سرقة --------
    if (cmd === 'سرقة') {
      const left = cooldownLeft(user, 'سرقة');
      if (left > 0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);

      const target = msg.mentions.users.first();
      if (!target) return msg.reply('❌ الاستخدام: `سرقة @شخص`');
      if (target.id === msg.author.id) return msg.reply('❌ ما تقدر تسرق نفسك!');

      const victim = db.prepare('SELECT * FROM users WHERE id = ?').get(target.id);
      if (!victim || victim.balance < 500) return msg.reply('😅 الضحية فقيرة!');

      if (victim.protection_until > Date.now()) {
        db.prepare('UPDATE users SET reputation = MAX(0, reputation - 5) WHERE id = ?').run(msg.author.id);
        return msg.reply(`🛡 **${target.username}** محمي! خسرت 5 نقاط سمعة!`);
      }

      const success = Math.random() > 0.45;
      db.prepare('UPDATE users SET last_rob = ? WHERE id = ?').run(Date.now(), msg.author.id);

      if (success) {
        const stolen = Math.floor(Math.random() * victim.balance * 0.15) + 100;
        db.prepare('UPDATE users SET balance = balance + ?, reputation = MAX(0, reputation - 10) WHERE id = ?').run(stolen, msg.author.id);
        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(stolen, target.id);
        return msg.reply({ embeds: [
          new EmbedBuilder().setTitle('🦹 نجحت السرقة!').setColor('#ffd700')
            .setDescription(`سرقت **${fmt(stolen)}** من ${target.username}!`)
            .setFooter({ text: '⚠️ السرقة تقلل سمعتك -10' })
        ]});
      } else {
        const fine = Math.floor(user.balance * 0.10);
        db.prepare('UPDATE users SET balance = balance - ?, reputation = MAX(0, reputation - 15) WHERE id = ?').run(fine, msg.author.id);
        db.prepare('UPDATE government SET treasury = treasury + ? WHERE id = 1').run(fine);
        return msg.reply({ embeds: [
          new EmbedBuilder().setTitle('👮 تم القبض عليك!').setColor('#e74c3c')
            .setDescription(`فشلت السرقة! دفعت **${fmt(fine)}** غرامة و -15 سمعة!`)
        ]});
      }
    }

    // -------- المتصدرون --------
    if (cmd === 'متصدرون' || cmd === 'ليدربورد') {
      const top = db.prepare('SELECT *, (balance + bank) as total FROM users ORDER BY total DESC LIMIT 10').all();
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      const desc = top.map((u, i) => `${medals[i]} **${u.username}** — ${fmt(u.total)}`).join('\n');
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('🏆 أغنى المواطنين').setColor('#ffd700').setDescription(desc || 'لا بيانات').setTimestamp()
      ]});
    }

    // -------- إحصائياتي --------
    if (cmd === 'إحصائياتي' || cmd === 'احصائياتي') {
      const props = db.prepare('SELECT * FROM properties WHERE owner_id = ?').all(msg.author.id);
      const level = getLevel(user.balance + user.bank);
      const totalIncome = props.reduce((s, p) => s + p.income, 0);
      const embed = new EmbedBuilder()
        .setTitle(`📊 إحصائيات — ${msg.author.username}`)
        .setColor('#9b59b6')
        .addFields(
          { name: '🏆 المستوى', value: level.name, inline: true },
          { name: '⭐ السمعة', value: `${user.reputation}/100`, inline: true },
          { name: '💰 الثروة', value: fmt(user.balance + user.bank), inline: true },
          { name: '🏠 بيوت', value: `${props.filter(p => p.type === 'house').length}`, inline: true },
          { name: '🏢 شركات', value: `${props.filter(p => p.type === 'company').length}`, inline: true },
          { name: '📈 دخل/ساعة', value: fmt(totalIncome), inline: true },
          { name: '💳 قرض', value: user.loan > 0 ? fmt(user.loan) : 'لا يوجد', inline: true },
          { name: '🛡 حماية', value: user.protection_until > Date.now() ? `✅ ${fmtTime(user.protection_until - Date.now())}` : '❌', inline: true },
          { name: '💰 راتب', value: fmt(level.salary), inline: true },
        );
      return msg.reply({ embeds: [embed] });
    }

    // -------- الحكومة --------
    if (cmd === 'الحكومة' || cmd === 'بنك') {
      const gov = db.prepare('SELECT * FROM government WHERE id = 1').get();
      const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('🏛 البنك الحكومي').setColor('#e74c3c')
          .addFields(
            { name: '💰 الخزنة', value: fmt(gov.treasury), inline: true },
            { name: '👥 المواطنون', value: `${userCount}`, inline: true },
          ).setTimestamp()
      ]});
    }

    // -------- وقت --------
    if (cmd === 'وقت') {
      const cmdsToCheck = [
        { name: 'راتب', key: 'راتب', emoji: '💰' },
        { name: 'عمل', key: 'عمل', emoji: '🔨' },
        { name: 'مجازفة', key: 'مجازفة', emoji: '🎲' },
        { name: 'استثمر', key: 'استثمر', emoji: '📈' },
        { name: 'تداول', key: 'تداول', emoji: '📊' },
        { name: 'سرقة', key: 'سرقة', emoji: '🦹' },
        { name: 'تحصيل', key: 'تحصيل', emoji: '🏠' },
      ];
      const fields = cmdsToCheck.map(c => {
        const left = cooldownLeft(user, c.key);
        return { name: `${c.emoji} ${c.name}`, value: left > 0 ? `⏰ ${fmtTime(left)}` : '✅ جاهز', inline: true };
      });
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(`⏰ أوقات الأوامر — ${msg.author.username}`).setColor('#3498db').addFields(...fields).setTimestamp()
      ]});
    }

    // -------- اوامر --------
    if (cmd === 'اوامر' || cmd === 'أوامر') {
      const embed = new EmbedBuilder()
        .setTitle('📋 قائمة الأوامر الكاملة')
        .setColor('#4e8aff')
        .addFields(
          {
            name: '👤 الحساب الشخصي',
            value: [
              '`ملفي` — ملفك الاقتصادي الكامل',
              '`رصيد` — تحقق من رصيدك',
              '`إحصائياتي` — إحصائياتك التفصيلية',
              '`وقت` — أوقات الأوامر المتبقية',
            ].join('\n')
          },
          {
            name: '💰 الكسب',
            value: [
              '`راتب` — استلم راتبك (كل 4 ساعات)',
              '`عمل` — اعمل وكسب فلوس (كل ساعتين)',
              '`تحصيل` — احصّل دخل ممتلكاتك (كل ساعة)',
            ].join('\n')
          },
          {
            name: '🏦 البنك',
            value: [
              '`إيداع [مبلغ/كل]` — أودع في البنك',
              '`سحب [مبلغ/كل]` — اسحب من البنك',
              '`تحويل @شخص مبلغ` — حوّل فلوس',
              '`قرض مبلغ` — اطلب قرضاً',
              '`سداد` — سدد قرضك',
            ].join('\n')
          },
          {
            name: '🏠 العقارات',
            value: [
              '`بيوت` — سوق البيوت (بأزرار تنقل)',
              '`شركات` — سوق الشركات (بأزرار تنقل)',
              '`شراء بيت [h1-h20]` — شراء بيت',
              '`شراء شركة [c1-c20]` — شراء شركة',
              '`بيع [رقم]` — بيع عقار بـ70%',
              '`ممتلكاتي` — عرض ممتلكاتك',
            ].join('\n')
          },
          {
            name: '🎮 الألعاب',
            value: [
              '`مجازفة مبلغ` — 50/50 (كل 30 دقيقة)',
              '`استثمر مبلغ [منخفض/متوسط/عالي]` — استثمار (كل ساعة)',
              '`تداول مبلغ` — تداول بالسوق (كل 45 دقيقة)',
              '`سرقة @شخص` — سرق شخص (كل ساعتين)',
            ].join('\n')
          },
          {
            name: '🛡 الحماية',
            value: [
              '`حماية 6` — 6 ساعات بـ 5K',
              '`حماية 12` — 12 ساعة بـ 9K',
              '`حماية 24` — 24 ساعة بـ 15K',
              '`حماية 72` — 3 أيام بـ 35K',
            ].join('\n')
          },
          {
            name: '📊 عام',
            value: [
              '`متصدرون` — أغنى 10 أشخاص',
              '`الحكومة` — خزنة البنك الحكومي',
            ].join('\n')
          },
        )
        .setFooter({ text: 'اكتب الأمر مباشرة بدون أي علامة!' });
      return msg.reply({ embeds: [embed] });
    }

    // -------- أوامر الإدارة --------
    if (!msg.member?.permissions.has(PermissionFlagsBits.Administrator)) return;

    if (cmd === 'أعطِ' || cmd === 'اعطي') {
      const target = msg.mentions.users.first();
      const amount = parseInt(args[1]);
      if (!target || isNaN(amount)) return msg.reply('❌ الاستخدام: `اعطي @شخص مبلغ`');
      getUser(target.id, target.username);
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, target.id);
      return msg.reply(`✅ أضفت **${fmt(amount)}** لـ ${target.username}`);
    }

    if (cmd === 'خذ') {
      const target = msg.mentions.users.first();
      const amount = parseInt(args[1]);
      if (!target || isNaN(amount)) return msg.reply('❌ الاستخدام: `خذ @شخص مبلغ`');
      db.prepare('UPDATE users SET balance = MAX(0, balance - ?) WHERE id = ?').run(amount, target.id);
      return msg.reply(`✅ أخذت **${fmt(amount)}** من ${target.username}`);
    }

    if (cmd === 'ريست') {
      const target = msg.mentions.users.first();
      if (!target) return msg.reply('❌ الاستخدام: `ريست @شخص`');
      db.prepare('UPDATE users SET balance = 5000, bank = 0, loan = 0, loan_due = 0, reputation = 100 WHERE id = ?').run(target.id);
      db.prepare('DELETE FROM properties WHERE owner_id = ?').run(target.id);
      return msg.reply(`✅ تم ريست حساب **${target.username}**`);
    }

  } catch (e) {
    console.error('خطأ:', e);
    msg.reply('❌ حدث خطأ غير متوقع!').catch(() => {});
  }
});

// ==============================
// معالج الأزرار (تنقل الصفحات)
// ==============================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const [type, pageStr] = interaction.customId.split('_');
  if (pageStr === 'info') return interaction.deferUpdate();

  const page = parseInt(pageStr);
  if (isNaN(page)) return;

  if (type === 'houses') {
    const { embed, totalPages } = buildHousesEmbed(page);
    const row = buildPageButtons(page, totalPages, 'houses');
    return interaction.update({ embeds: [embed], components: [row] });
  }

  if (type === 'companies') {
    const { embed, totalPages } = buildCompaniesEmbed(page);
    const row = buildPageButtons(page, totalPages, 'companies');
    return interaction.update({ embeds: [embed], components: [row] });
  }
});

// ==============================
// نظام الضرائب (كل 24 ساعة)
// ==============================
function startTaxSystem() {
  setInterval(() => {
    try {
      const users = db.prepare('SELECT * FROM users').all();
      let total = 0;
      for (const u of users) {
        const tax = Math.floor((u.balance + u.bank) * 0.01);
        if (tax <= 0) continue;
        const fromBal = Math.min(tax, u.balance);
        const fromBank = tax - fromBal;
        db.prepare('UPDATE users SET balance = balance - ?, bank = MAX(0, bank - ?) WHERE id = ?').run(fromBal, fromBank, u.id);
        total += tax;
      }
      db.prepare('UPDATE government SET treasury = treasury + ? WHERE id = 1').run(total);
      console.log(`⚖️ ضرائب: ${total.toLocaleString()}`);
    } catch (e) { console.error('خطأ ضرائب:', e); }
  }, 24 * 60 * 60 * 1000);
}

// ==============================
// نظام المصادرة (كل ساعة)
// ==============================
function startConfiscationSystem() {
  setInterval(() => {
    try {
      const now = Date.now();
      const overdue = db.prepare('SELECT * FROM users WHERE loan > 0 AND loan_due > 0 AND loan_due < ?').all(now);
      for (const u of overdue) {
        if (u.protection_until > now) continue;
        const prop = db.prepare('SELECT * FROM properties WHERE owner_id = ? LIMIT 1').get(u.id);
        if (prop) {
          db.prepare('DELETE FROM properties WHERE id = ?').run(prop.id);
          db.prepare('UPDATE government SET treasury = treasury + ? WHERE id = 1').run(prop.price);
          db.prepare('UPDATE users SET loan = MAX(0, loan - ?) WHERE id = ?').run(prop.price, u.id);
          console.log(`🔨 مصادرة: ${prop.name} من ${u.username}`);
        } else {
          const cut = Math.floor((u.balance + u.bank) * 0.3);
          db.prepare('UPDATE users SET balance = MAX(0, balance - ?), loan = 0, loan_due = 0 WHERE id = ?').run(cut, u.id);
          db.prepare('UPDATE government SET treasury = treasury + ? WHERE id = 1').run(cut);
        }
      }
    } catch (e) { console.error('خطأ مصادرة:', e); }
  }, 60 * 60 * 1000);
}

client.login(process.env.TOKEN);