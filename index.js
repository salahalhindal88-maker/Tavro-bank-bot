require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('better-sqlite3');

const CONFIG = {
  ECONOMY_CHANNEL_ID: '1478138274546454732',
  LOG_CHANNEL_ID: '',
  RICH_ROLE_ID: '',
  MILLIONAIRE_ROLE_ID: '',
  OWNER_ID: '717481322683301940',
};

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
    last_collect INTEGER DEFAULT 0,
    last_transfer INTEGER DEFAULT 0,
    last_mine INTEGER DEFAULT 0
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
  CREATE TABLE IF NOT EXISTS user_mines (
    owner_id TEXT PRIMARY KEY,
    mine_id TEXT,
    last_mined INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS mine_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT,
    resource_name TEXT,
    quantity INTEGER DEFAULT 0,
    unit_value INTEGER DEFAULT 0
  );
  INSERT OR IGNORE INTO government (id, treasury) VALUES (1, 0);
`);

// تحديث الأعمدة الجديدة إذا كانت قاعدة البيانات قديمة
try { db.exec(`ALTER TABLE users ADD COLUMN last_transfer INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN last_mine INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN reputation INTEGER DEFAULT 100`); } catch(e) {}

const HOUSES = [
  { id: 'h1',  name: '🏠 غرفة مشتركة',      price: 5_000,       income: 70 },
  { id: 'h2',  name: '🏠 شقة صغيرة',         price: 15_000,      income: 110 },
  { id: 'h3',  name: '🏠 شقة عادية',          price: 30_000,      income: 180 },
  { id: 'h4',  name: '🏠 شقة مفروشة',         price: 60_000,      income: 305 },
  { id: 'h5',  name: '🏡 بيت شعبي',           price: 100_000,     income: 465 },
  { id: 'h6',  name: '🏡 بيت عائلي',          price: 180_000,     income: 820 },
  { id: 'h7',  name: '🏡 فيلا صغيرة',         price: 300_000,     income: 1_800 },
  { id: 'h8',  name: '🏡 فيلا عادية',          price: 500_000,     income: 2_800 },
  { id: 'h9',  name: '🏡 فيلا فاخرة',          price: 800_000,     income: 3_800 },
  { id: 'h10', name: '🏰 قصر صغير',           price: 1_200_000,   income: 5_500 },
  { id: 'h11', name: '🏰 قصر عصري',           price: 1_800_000,   income: 7_900 },
  { id: 'h12', name: '🏰 قصر ملكي',           price: 2_500_000,   income: 10_900 },
  { id: 'h13', name: '🌊 شاليه ساحلي',         price: 3_500_000,   income: 15_700 },
  { id: 'h14', name: '🌴 فيلا جزيرة خاصة',     price: 5_000_000,   income: 21_500 },
  { id: 'h15', name: '🏔 شاليه جبلي',          price: 7_000_000,   income: 29_000 },
  { id: 'h16', name: '✈️ بنتهاوس طابق 50',     price: 10_000_000,  income: 43_000 },
  { id: 'h17', name: '🌍 قصر تاريخي',          price: 15_000_000,  income: 65_000 },
  { id: 'h18', name: '🚀 برج سكني خاص',        price: 25_000_000,  income: 105_000 },
  { id: 'h19', name: '👑 قصر فضائي',           price: 50_000_000,  income: 207_000 },
  { id: 'h20', name: '💎 قصر الأمراء',         price: 100_000_000, income: 430_000 },
];

const COMPANIES = [
  { id: 'c1',  name: '🛒 بقالة صغيرة',        price: 10_000,      income: 100 },
  { id: 'c2',  name: '☕ كافيه',              price: 25_000,      income: 200 },
  { id: 'c3',  name: '🍔 مطعم وجبات سريعة',    price: 50_000,      income: 350 },
  { id: 'c4',  name: '💈 صالون حلاقة',         price: 80_000,      income: 590 },
  { id: 'c5',  name: '🏪 متجر إلكترونيات',     price: 150_000,     income: 1_200 },
  { id: 'c6',  name: '🚗 معرض سيارات',         price: 300_000,     income: 2_800 },
  { id: 'c7',  name: '🏋️ صالة رياضية',         price: 500_000,     income: 3_900 },
  { id: 'c8',  name: '🏨 فندق صغير',           price: 800_000,     income: 5_600 },
  { id: 'c9',  name: '🏗 شركة مقاولات',        price: 1_200_000,   income: 8_000 },
  { id: 'c10', name: '💊 صيدلية كبرى',         price: 1_800_000,   income: 11_500 },
  { id: 'c11', name: '✈️ شركة طيران',          price: 3_000_000,   income: 18_000 },
  { id: 'c12', name: '📱 شركة تقنية',          price: 5_000_000,   income: 29_000 },
  { id: 'c13', name: '🏭 مصنع كبير',           price: 8_000_000,   income: 47_000 },
  { id: 'c14', name: '🛢 شركة نفط',            price: 12_000_000,  income: 72_000 },
  { id: 'c15', name: '🏦 بنك خاص',             price: 20_000_000,  income: 117_000 },
  { id: 'c16', name: '🌐 شركة إنترنت عالمية',  price: 35_000_000,  income: 207_000 },
  { id: 'c17', name: '🚀 شركة فضاء',           price: 60_000_000,  income: 344_000 },
  { id: 'c18', name: '💎 شركة مجوهرات ملكية',  price: 100_000_000, income: 565_000 },
  { id: 'c19', name: '🌍 إمبراطورية تجارية',   price: 200_000_000, income: 1_150_000 },
  { id: 'c20', name: '👑 احتكار عالمي',        price: 500_000_000, income: 2_850_000 },
];

const LEVELS = [
  { level: 1, min: 0,           name: '👶 مبتدئ',     salary: 1_000 },
  { level: 2, min: 10_000,      name: '🧑 عامل',      salary: 2_000 },
  { level: 3, min: 50_000,      name: '💼 موظف',      salary: 2_700 },
  { level: 4, min: 200_000,     name: '📊 مدير',      salary: 6_900 },
  { level: 5, min: 1_000_000,   name: '🏢 رجل أعمال', salary: 15_000 },
  { level: 6, min: 5_000_000,   name: '💎 ثري',       salary: 40_000 },
  { level: 7, min: 20_000_000,  name: '👑 مليونير',   salary: 100_000 },
  { level: 8, min: 100_000_000, name: '🌟 إمبراطور',  salary: 300_000 },
];

const REPUTATION_LEVELS = [
  { min: 0,   max: 0,   name: '🚫 إيقاف خدمات', blocked: true },
  { min: 1,   max: 20,  name: '😈 مجرم',         blocked: false },
  { min: 21,  max: 49,  name: '🤡 شحاذ',         blocked: false },
  { min: 50,  max: 64,  name: '😐 مشبوه',        blocked: false },
  { min: 65,  max: 74,  name: '🙂 عادي',         blocked: false },
  { min: 75,  max: 84,  name: '😊 محترم',        blocked: false },
  { min: 85,  max: 94,  name: '⭐ موثوق',        blocked: false },
  { min: 95,  max: 99,  name: '🌟 محترف',        blocked: false },
  { min: 100, max: 100, name: '💎 أسطورة',       blocked: false },
];

const MINES_LIST = [
  { id: 'm1', name: '⛏️ منجم الحجارة',        price: 500_000,    maxStorage: 50, resources: [{ name: 'حجر',       value: 10_000,     chance: 70, emoji: '🪨' }, { name: 'رخام',       value: 30_000,     chance: 30, emoji: '⬜' }] },
  { id: 'm2', name: '🪨 منجم الفحم',           price: 1_500_000,  maxStorage: 45, resources: [{ name: 'فحم',       value: 25_000,     chance: 65, emoji: '⬛' }, { name: 'أنثراسيت',  value: 70_000,     chance: 35, emoji: '🖤' }] },
  { id: 'm3', name: '🔩 منجم الحديد',          price: 3_000_000,  maxStorage: 40, resources: [{ name: 'حديد خام', value: 60_000,     chance: 60, emoji: '🔩' }, { name: 'صلب',        value: 150_000,    chance: 40, emoji: '⚙️' }] },
  { id: 'm4', name: '🪙 منجم النحاس',          price: 6_000_000,  maxStorage: 35, resources: [{ name: 'نحاس',     value: 150_000,    chance: 60, emoji: '🟤' }, { name: 'برونز',      value: 350_000,    chance: 40, emoji: '🏺' }] },
  { id: 'm5', name: '⚪ منجم الفضة',           price: 10_000_000, maxStorage: 30, resources: [{ name: 'فضة خام',  value: 400_000,    chance: 55, emoji: '⚪' }, { name: 'فضة نقية',  value: 900_000,    chance: 45, emoji: '🥈' }] },
  { id: 'm6', name: '🟡 منجم الذهب',           price: 16_000_000, maxStorage: 25, resources: [{ name: 'ذهب خام',  value: 1_000_000,  chance: 55, emoji: '🟡' }, { name: 'ذهب نقي',   value: 2_500_000,  chance: 45, emoji: '🥇' }] },
  { id: 'm7', name: '💎 منجم الأحجار الكريمة', price: 22_000_000, maxStorage: 20, resources: [{ name: 'زمرد',     value: 4_000_000,  chance: 40, emoji: '💚' }, { name: 'ياقوت',      value: 7_000_000,  chance: 35, emoji: '❤️' }, { name: 'ألماس',     value: 12_000_000, chance: 25, emoji: '💎' }] },
  { id: 'm8', name: '🔵 منجم الأحجار النادرة', price: 30_000_000, maxStorage: 15, resources: [{ name: 'صفير',     value: 18_000_000, chance: 40, emoji: '💙' }, { name: 'فيروز',      value: 30_000_000, chance: 35, emoji: '🟦' }, { name: 'عقيق ملكي', value: 55_000_000, chance: 25, emoji: '💜' }] },
];

const MINE_COOLDOWN     = 3 * 60 * 60 * 1000;
const TRANSFER_COOLDOWN = 2 * 60 * 60 * 1000;
const ITEMS_PER_PAGE    = 5;
const MINES_PER_PAGE    = 4;

const COOLDOWNS = {
  راتب: 1*60*60*1000, عمل: 1*60*60*1000, مجازفة: 5*60*1000,
  استثمر: 5*60*1000, تداول: 5*60*1000, سرقة: 15*60*1000, تحصيل: 1*60*60*1000,
};

function fmt(n) {
  if (n >= 1_000_000_000) return (n/1_000_000_000).toFixed(1)+'B 💰';
  if (n >= 1_000_000)     return (n/1_000_000).toFixed(1)+'M 💰';
  if (n >= 1_000)         return (n/1_000).toFixed(1)+'K 💰';
  return n.toLocaleString('ar')+' 💰';
}

function parseAmount(str, fallback = null) {
  if (!str) return NaN;
  const s = str.toLowerCase().trim();
  if (s === 'كل'    || s === 'all')         return fallback ?? NaN;
  if (s === 'نص'    || s === 'نصف')         return fallback !== null ? Math.floor(fallback / 2)   : NaN;
  if (s === 'ربع')                           return fallback !== null ? Math.floor(fallback / 4)   : NaN;
  if (s === 'ثلث')                           return fallback !== null ? Math.floor(fallback / 3)   : NaN;
  if (s === 'ثلثين' || s === 'ثلثان')       return fallback !== null ? Math.floor(fallback * 2/3) : NaN;
  if (s === '3ارباع' || s === 'ثلاثةارباع') return fallback !== null ? Math.floor(fallback * 3/4) : NaN;
  const mults = { 'k': 1_000, 'm': 1_000_000, 'b': 1_000_000_000 };
  for (const [suf, m] of Object.entries(mults)) {
    if (s.endsWith(suf)) { const n = parseFloat(s.slice(0,-suf.length)); if (!isNaN(n)) return Math.floor(n*m); }
  }
  return parseInt(s);
}

function getLevel(total) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (total >= l.min) cur = l;
  return cur;
}

function getReputation(rep) {
  return REPUTATION_LEVELS.find(r => rep >= r.min && rep <= r.max) || REPUTATION_LEVELS[0];
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
  const fm = { راتب:'last_salary', عمل:'last_work', مجازفة:'last_gamble', استثمر:'last_invest', تداول:'last_trade', سرقة:'last_rob', تحصيل:'last_collect' };
  const f = fm[cmd]; if (!f) return 0;
  return Math.max(0, COOLDOWNS[cmd] - (Date.now() - (user[f]||0)));
}

function fmtTime(ms) {
  if (ms <= 0) return '✅ جاهز';
  const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000);
  if (h > 0) return `${h}س ${m}د ${s}ث`;
  if (m > 0) return `${m}د ${s}ث`;
  return `${s}ث`;
}

function buildPageButtons(page, totalPages, prefix) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${prefix}_${page-1}`).setLabel('◀️ السابق').setStyle(ButtonStyle.Secondary).setDisabled(page<=0),
    new ButtonBuilder().setCustomId(`${prefix}_info`).setLabel(`${page+1} / ${totalPages}`).setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId(`${prefix}_${page+1}`).setLabel('التالي ▶️').setStyle(ButtonStyle.Secondary).setDisabled(page>=totalPages-1),
  );
}

function buildHousesEmbed(page) {
  const start=page*ITEMS_PER_PAGE, slice=HOUSES.slice(start,start+ITEMS_PER_PAGE), totalPages=Math.ceil(HOUSES.length/ITEMS_PER_PAGE);
  return { embed: new EmbedBuilder().setTitle('🏠 سوق البيوت').setColor('#3498db').setDescription(slice.map(h=>`**${h.name}** \`[${h.id}]\`\n💰 ${fmt(h.price)} | 📈 ${fmt(h.income)}/ساعة`).join('\n\n')).setFooter({text:`صفحة ${page+1} من ${totalPages} | شراء بيت [id]`}), totalPages };
}

function buildCompaniesEmbed(page) {
  const start=page*ITEMS_PER_PAGE, slice=COMPANIES.slice(start,start+ITEMS_PER_PAGE), totalPages=Math.ceil(COMPANIES.length/ITEMS_PER_PAGE);
  return { embed: new EmbedBuilder().setTitle('🏢 سوق الشركات').setColor('#9b59b6').setDescription(slice.map(c=>`**${c.name}** \`[${c.id}]\`\n💰 ${fmt(c.price)} | 📈 ${fmt(c.income)}/ساعة`).join('\n\n')).setFooter({text:`صفحة ${page+1} من ${totalPages} | شراء شركة [id]`}), totalPages };
}

function buildMinesEmbed(page) {
  const start=page*MINES_PER_PAGE, slice=MINES_LIST.slice(start,start+MINES_PER_PAGE), totalPages=Math.ceil(MINES_LIST.length/MINES_PER_PAGE);
  return { embed: new EmbedBuilder().setTitle('⛏️ سوق المناجم').setColor('#8B4513').setDescription(slice.map(m=>`**${m.name}** \`[${m.id}]\`\n💰 ${fmt(m.price)} | 📦 ${m.maxStorage} وحدة\n${m.resources.map(r=>`  ${r.emoji} ${r.name} (${r.chance}%) — ${fmt(r.value)}`).join('\n')}`).join('\n\n')).setFooter({text:`صفحة ${page+1} من ${totalPages} | شراء منجم [id] — منجم واحد فقط!`}), totalPages };
}

async function updateWealthRole(member, balance) {
  if (!member) return;
  try {
    if (CONFIG.MILLIONAIRE_ROLE_ID && balance >= 10_000_000) {
      const role = member.guild.roles.cache.get(CONFIG.MILLIONAIRE_ROLE_ID);
      if (role && !member.roles.cache.has(CONFIG.MILLIONAIRE_ROLE_ID)) await member.roles.add(role);
    } else if (CONFIG.RICH_ROLE_ID && balance >= 1_000_000) {
      const role = member.guild.roles.cache.get(CONFIG.RICH_ROLE_ID);
      if (role && !member.roles.cache.has(CONFIG.RICH_ROLE_ID)) await member.roles.add(role);
    }
  } catch(e) { console.error('خطأ رول:', e); }
}

async function sendLog(client, guildId, content) {
  if (!CONFIG.LOG_CHANNEL_ID) return;
  try {
    const guild = client.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(CONFIG.LOG_CHANNEL_ID);
    if (channel) await channel.send(content);
  } catch(e) {}
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

client.once('ready', () => {
  console.log(`✅ البوت شغال: ${client.user.tag}`);
  startTaxSystem();
  startConfiscationSystem();
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (CONFIG.ECONOMY_CHANNEL_ID && msg.channelId !== CONFIG.ECONOMY_CHANNEL_ID) return;

  const parts = msg.content.trim().split(/\s+/);
  const cmd   = parts[0];
  const args  = parts.slice(1);
  const user  = getUser(msg.author.id, msg.author.username);

  try {

    if (cmd === 'ملفي' || cmd === 'بروفايل') {
      const target = msg.mentions.users.first();
      const u      = target ? getUser(target.id, target.username) : user;
      const level  = getLevel(u.balance + u.bank);
      const props  = db.prepare('SELECT * FROM properties WHERE owner_id = ?').all(u.id);
      const income = props.reduce((s,p) => s+p.income, 0);
      const prot   = u.protection_until > Date.now();
      const myMine = db.prepare('SELECT * FROM user_mines WHERE owner_id = ?').get(u.id);
      const repLvl = getReputation(u.reputation);
      return msg.reply({ embeds: [
        new EmbedBuilder()
          .setTitle(`📊 الملف الاقتصادي — ${target?.username || msg.author.username}`)
          .setThumbnail((target || msg.author).displayAvatarURL())
          .setColor(prot ? '#00ff88' : '#4e8aff')
          .addFields(
            { name: '💰 المحفظة',  value: fmt(u.balance),              inline: true },
            { name: '🏦 البنك',     value: fmt(u.bank),                 inline: true },
            { name: '📊 الإجمالي',  value: fmt(u.balance + u.bank),     inline: true },
            { name: '🏆 المستوى',   value: level.name,                  inline: true },
            { name: '⭐ السمعة',    value: `${u.reputation}/100 ${repLvl.name}`, inline: true },
            { name: '📈 دخل/ساعة', value: fmt(income),                 inline: true },
            { name: '🏠 الممتلكات', value: `${props.length}`,           inline: true },
            { name: '⛏️ المنجم',    value: myMine ? MINES_LIST.find(m=>m.id===myMine.mine_id)?.name : 'لا يوجد', inline: true },
            { name: '💳 القرض',     value: u.loan > 0 ? fmt(u.loan) : 'لا يوجد', inline: true },
            { name: '🛡 الحماية',   value: prot ? `⏰ ${fmtTime(u.protection_until - Date.now())}` : '❌', inline: true },
          )
          .setFooter({ text: `راتبك: ${fmt(level.salary)} كل ساعة` })
          .setTimestamp()
      ]});
    }

    if (cmd === 'رصيد') {
      const repLvl = getReputation(user.reputation);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('💳 رصيدك').setColor('#4e8aff')
          .addFields(
            { name: '💰 المحفظة', value: fmt(user.balance), inline: true },
            { name: '🏦 البنك',    value: fmt(user.bank),    inline: true },
            { name: '📊 الإجمالي', value: fmt(user.balance + user.bank), inline: true },
            { name: '⭐ السمعة',   value: `${user.reputation}/100 ${repLvl.name}`, inline: true },
          )
      ]});
    }

    const repLvl = getReputation(user.reputation);
    const allowedWhenBlocked = ['ملفي','بروفايل','رصيد','وقت','اوامر','أوامر','سمعة'];
    if (repLvl.blocked && !allowedWhenBlocked.includes(cmd))
      return msg.reply('🚫 **خدماتك موقوفة!** سمعتك وصلت الصفر.\nاكتب `سمعة` لمعرفة كيف ترفعها.');

    if (cmd === 'راتب') {
      const left = cooldownLeft(user, 'راتب');
      if (left > 0) return msg.reply(`⏰ راتبك القادم بعد **${fmtTime(left)}**`);
      const level = getLevel(user.balance + user.bank);
      const tax   = Math.floor(level.salary * 0.01);
      const net   = level.salary - tax;
      db.prepare('UPDATE users SET balance=balance+?, last_salary=?, reputation=MIN(100,reputation+1) WHERE id=?').run(net, Date.now(), msg.author.id);
      db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(tax);
      await updateWealthRole(msg.member, user.balance + net);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('💰 تم استلام الراتب!').setColor('#00ff88')
          .addFields(
            { name: '📥 الراتب',    value: fmt(level.salary), inline: true },
            { name: '⚖️ ضريبة 1%', value: fmt(tax),           inline: true },
            { name: '✅ الصافي',    value: fmt(net),           inline: true },
          ).setFooter({ text: '⭐ +1 سمعة | الراتب القادم بعد ساعة' })
      ]});
    }

    if (cmd === 'عمل') {
      const left = cooldownLeft(user, 'عمل');
      if (left > 0) return msg.reply(`⏰ تعب! ارجع بعد **${fmtTime(left)}**`);
      const level  = getLevel(user.balance + user.bank);
      const earned = Math.floor(level.salary * 0.3 + Math.random() * level.salary * 0.4);
      const jobs   = ['🔨 عمل في البناء','💻 برمج موقع','🚗 وصّل طلبيات','📦 رتّب مستودع','🍳 طبخ في مطعم','🌿 شغل في المزرعة','🔧 صيانة سيارات'];
      db.prepare('UPDATE users SET balance=balance+?, last_work=?, reputation=MIN(100,reputation+1) WHERE id=?').run(earned, Date.now(), msg.author.id);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(jobs[Math.floor(Math.random()*jobs.length)]).setColor('#ffd700')
          .setDescription(`عملت وكسبت **${fmt(earned)}**!`)
          .setFooter({ text: '⭐ +1 سمعة | ارجع كل ساعة' })
      ]});
    }

    if (cmd === 'تحويل') {
      const target = msg.mentions.users.first();
      const amount = parseAmount(args[1], user.balance);
      if (!target || isNaN(amount) || amount <= 0) return msg.reply('❌ الاستخدام: `تحويل @شخص المبلغ`');
      if (target.id === msg.author.id) return msg.reply('❌ ما تقدر تحوّل لنفسك!');
      const transLeft = Math.max(0, TRANSFER_COOLDOWN - (Date.now() - (user.last_transfer||0)));
      if (transLeft > 0) return msg.reply(`⏰ التحويل القادم بعد **${fmtTime(transLeft)}**`);
      const maxTransfer = Math.floor((user.balance + user.bank) * 0.35);
      if (amount > maxTransfer) return msg.reply(`❌ الحد الأقصى للتحويل: **${fmt(maxTransfer)}** (35% من ثروتك)`);
      if (user.balance < amount) return msg.reply('❌ رصيدك ما يكفي!');
      const fee = Math.max(1, Math.floor(amount * 0.02)), received = amount - fee;
      db.prepare('UPDATE users SET balance=balance-?, last_transfer=? WHERE id=?').run(amount, Date.now(), msg.author.id);
      getUser(target.id, target.username);
      db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(received, target.id);
      db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(fee);
      await sendLog(client, msg.guildId, `💸 تحويل: ${msg.author.username} → ${target.username} | ${fmt(amount)}`);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('✅ تم التحويل').setColor('#00ff88')
          .addFields(
            { name: '📤 المرسل',  value: msg.author.username, inline: true },
            { name: '📥 المستلم', value: target.username,     inline: true },
            { name: '💰 المبلغ',  value: fmt(amount),         inline: true },
            { name: '💸 رسوم 2%', value: fmt(fee),            inline: true },
            { name: '✅ وصل',     value: fmt(received),       inline: true },
          ).setFooter({ text: 'التحويل القادم بعد ساعتين' })
      ]});
    }

    if (cmd === 'إيداع' || cmd === 'ايداع') {
      const amount = parseAmount(args[0], user.balance);
      if (isNaN(amount) || amount <= 0) return msg.reply('❌ الاستخدام: `إيداع [مبلغ/كل/نص/ربع/ثلث]`');
      if (user.balance < amount) return msg.reply('❌ رصيدك ما يكفي!');
      db.prepare('UPDATE users SET balance=balance-?, bank=bank+? WHERE id=?').run(amount, amount, msg.author.id);
      return msg.reply({ embeds: [new EmbedBuilder().setTitle('🏦 تم الإيداع').setColor('#00ff88').setDescription(`أودعت **${fmt(amount)}** في البنك`)] });
    }

    if (cmd === 'سحب') {
      const amount = parseAmount(args[0], user.bank);
      if (isNaN(amount) || amount <= 0) return msg.reply('❌ الاستخدام: `سحب [مبلغ/كل/نص/ربع/ثلث]`');
      if (user.bank < amount) return msg.reply('❌ رصيد البنك ما يكفي!');
      db.prepare('UPDATE users SET bank=bank-?, balance=balance+? WHERE id=?').run(amount, amount, msg.author.id);
      return msg.reply({ embeds: [new EmbedBuilder().setTitle('💰 تم السحب').setColor('#00ff88').setDescription(`سحبت **${fmt(amount)}** من البنك`)] });
    }

    if (cmd === 'بيوت')  { const {embed,totalPages}=buildHousesEmbed(0);    return msg.reply({embeds:[embed],components:[buildPageButtons(0,totalPages,'houses')]}); }
    if (cmd === 'شركات') { const {embed,totalPages}=buildCompaniesEmbed(0); return msg.reply({embeds:[embed],components:[buildPageButtons(0,totalPages,'companies')]}); }
    if (cmd === 'مناجم') { const {embed,totalPages}=buildMinesEmbed(0);     return msg.reply({embeds:[embed],components:[buildPageButtons(0,totalPages,'mines')]}); }

    if (cmd === 'شراء') {
      const type = args[0], itemId = args[1]?.toLowerCase();
      if (type === 'منجم') {
        if (!itemId) return msg.reply('❌ الاستخدام: `شراء منجم [id]`');
        const mine = MINES_LIST.find(m => m.id === itemId);
        if (!mine) return msg.reply('❌ ID غير صحيح! اكتب `مناجم`');
        if (db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id)) return msg.reply('❌ عندك منجم! بيع منجمك أولاً بـ `بيع منجم`');
        if (user.balance < mine.price) return msg.reply(`❌ تحتاج **${fmt(mine.price)}**`);
        db.prepare('UPDATE users SET balance=balance-?, reputation=MIN(100,reputation+2) WHERE id=?').run(mine.price, msg.author.id);
        db.prepare('INSERT INTO user_mines (owner_id,mine_id,last_mined) VALUES (?,?,0)').run(msg.author.id, mine.id);
        return msg.reply({ embeds: [
          new EmbedBuilder().setTitle(`✅ اشتريت ${mine.name}!`).setColor('#00ff88')
            .addFields(
              { name: '💰 السعر',    value: fmt(mine.price),    inline: true },
              { name: '📦 التخزين', value: `${mine.maxStorage} وحدة`, inline: true },
              { name: '⏰ التعدين', value: 'كل 3 ساعات',       inline: true },
              { name: '💎 الموارد', value: mine.resources.map(r=>`${r.emoji} ${r.name} (${r.chance}%) — ${fmt(r.value)}`).join('\n') },
            ).setFooter({ text: '⭐ +2 سمعة | اكتب: تعدين للبدء!' })
        ]});
      }
      if (!type || !itemId || !['بيت','شركة','شركه'].includes(type))
        return msg.reply('❌ الاستخدام: `شراء بيت h1` أو `شراء شركة c1` أو `شراء منجم m1`');
      const isHouse = type === 'بيت', list = isHouse ? HOUSES : COMPANIES, item = list.find(i => i.id === itemId);
      if (!item) return msg.reply('❌ ID غير صحيح!');
      if (user.balance < item.price) return msg.reply(`❌ تحتاج **${fmt(item.price)}**`);
      db.prepare('UPDATE users SET balance=balance-?, reputation=MIN(100,reputation+2) WHERE id=?').run(item.price, msg.author.id);
      db.prepare('INSERT INTO properties (owner_id,type,prop_id,name,price,income) VALUES (?,?,?,?,?,?)').run(msg.author.id, isHouse?'house':'company', item.id, item.name, item.price, item.income);
      await updateWealthRole(msg.member, user.balance - item.price);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(`✅ تم الشراء — ${item.name}`).setColor('#00ff88')
          .addFields(
            { name: '💰 السعر',     value: fmt(item.price),       inline: true },
            { name: '📈 دخل/ساعة', value: fmt(item.income),      inline: true },
            { name: '📅 دخل/يوم',  value: fmt(item.income * 24), inline: true },
          ).setFooter({ text: '⭐ +2 سمعة' })
      ]});
    }

    if (cmd === 'بيع') {
      if (args[0] === 'منجم') {
        const myMine = db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
        if (!myMine) return msg.reply('❌ ليس لديك منجم!');
        const mine = MINES_LIST.find(m => m.id === myMine.mine_id), sellPrice = Math.floor(mine.price * 0.70);
        db.prepare('DELETE FROM user_mines WHERE owner_id=?').run(msg.author.id);
        db.prepare('DELETE FROM mine_inventory WHERE owner_id=?').run(msg.author.id);
        db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(sellPrice, msg.author.id);
        return msg.reply({ embeds: [
          new EmbedBuilder().setTitle(`💸 تم بيع ${mine.name}`).setColor('#ffd700')
            .addFields({ name: '💰 سعر الشراء', value: fmt(mine.price), inline: true }, { name: '✅ استلمت (70%)', value: fmt(sellPrice), inline: true })
            .setFooter({ text: '⚠️ تم حذف الموارد!' })
        ]});
      }
      if (args[0] === 'مورد') {
        const resourceName = args[1], qtyArg = args[2];
        if (!resourceName || !qtyArg) return msg.reply('❌ الاستخدام: `بيع مورد [اسم] [كمية/كل]`');
        const stored = db.prepare('SELECT * FROM mine_inventory WHERE owner_id=? AND resource_name=?').get(msg.author.id, resourceName);
        if (!stored || stored.quantity <= 0) return msg.reply(`❌ ما عندك **${resourceName}**!`);
        const qty = qtyArg === 'كل' ? stored.quantity : parseInt(qtyArg);
        if (isNaN(qty) || qty <= 0 || qty > stored.quantity) return msg.reply(`❌ كمية غير صحيحة! عندك ${stored.quantity}`);
        const earned = qty * stored.unit_value;
        db.prepare('UPDATE mine_inventory SET quantity=quantity-? WHERE owner_id=? AND resource_name=?').run(qty, msg.author.id, resourceName);
        db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(earned, msg.author.id);
        return msg.reply({ embeds: [
          new EmbedBuilder().setTitle('💰 تم بيع المورد!').setColor('#00ff88')
            .addFields({ name: '📦 المورد', value: `${qty}x ${resourceName}`, inline: true }, { name: '💰 الربح', value: fmt(earned), inline: true })
        ]});
      }
      const propId = parseInt(args.find(a => !isNaN(parseInt(a))));
      if (isNaN(propId)) return msg.reply('❌ الاستخدام: `بيع [رقم]` أو `بيع منجم` أو `بيع مورد [اسم] [كمية]`');
      const prop = db.prepare('SELECT * FROM properties WHERE id=? AND owner_id=?').get(propId, msg.author.id);
      if (!prop) return msg.reply('❌ العقار غير موجود!');
      const sellPrice = Math.floor(prop.price * 0.70);
      db.prepare('DELETE FROM properties WHERE id=?').run(propId);
      db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(sellPrice, msg.author.id);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(`💸 تم البيع — ${prop.name}`).setColor('#ffd700')
          .addFields({ name: '💰 سعر الشراء', value: fmt(prop.price), inline: true }, { name: '✅ استلمت (70%)', value: fmt(sellPrice), inline: true })
      ]});
    }

    if (cmd === 'ممتلكاتي') {
      const props = db.prepare('SELECT * FROM properties WHERE owner_id=?').all(msg.author.id);
      if (props.length === 0) return msg.reply('🏚 ليس لديك ممتلكات!');
      const houses = props.filter(p=>p.type==='house'), companies = props.filter(p=>p.type==='company');
      const totalIncome = props.reduce((s,p) => s+p.income, 0);
      let desc = '';
      if (houses.length > 0)    { desc += '**🏠 البيوت:**\n';   houses.forEach(h => desc += `• \`#${h.id}\` ${h.name} — ${fmt(h.income)}/ساعة\n`); }
      if (companies.length > 0) { desc += '\n**🏢 الشركات:**\n'; companies.forEach(c => desc += `• \`#${c.id}\` ${c.name} — ${fmt(c.income)}/ساعة\n`); }
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(`🏛 ممتلكات ${msg.author.username}`).setColor('#9b59b6')
          .setDescription(desc)
          .addFields({ name: '📈 دخل/ساعة', value: fmt(totalIncome), inline: true }, { name: '📅 دخل/يوم', value: fmt(totalIncome*24), inline: true })
          .setFooter({ text: 'بيع [رقم] لبيع عقار' })
      ]});
    }

    if (cmd === 'تحصيل') {
      const left = cooldownLeft(user, 'تحصيل');
      if (left > 0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);
      const props = db.prepare('SELECT * FROM properties WHERE owner_id=?').all(msg.author.id);
      if (props.length === 0) return msg.reply('❌ ليس لديك ممتلكات!');
      const now = Date.now(); let total = 0;
      for (const p of props) {
        total += Math.floor(p.income * Math.min(24, (now - p.bought_at*1000) / 3600000));
        db.prepare('UPDATE properties SET bought_at=? WHERE id=?').run(Math.floor(now/1000), p.id);
      }
      db.prepare('UPDATE users SET balance=balance+?, last_collect=? WHERE id=?').run(total, now, msg.author.id);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('💰 تم التحصيل!').setColor('#00ff88')
          .setDescription(`جمعت **${fmt(total)}** من **${props.length}** عقارات!`)
          .setFooter({ text: 'ارجع بعد ساعة' })
      ]});
    }

    if (cmd === 'تعدين') {
      const myMine = db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
      if (!myMine) return msg.reply('❌ ليس لديك منجم! اكتب `مناجم`');
      const now = Date.now(), elapsed = now - (myMine.last_mined||0);
      const left = Math.max(0, MINE_COOLDOWN - elapsed);
      if (left > 0) return msg.reply(`⏰ ارجع بعد **${fmtTime(left)}**`);
      const mine  = MINES_LIST.find(m => m.id === myMine.mine_id);
      const units = Math.min(Math.max(1, Math.floor(elapsed/MINE_COOLDOWN)), mine.maxStorage);
      const roll  = Math.random() * 100; let cum = 0, res = mine.resources[0];
      for (const r of mine.resources) { cum += r.chance; if (roll <= cum) { res = r; break; } }
      const stored = db.prepare('SELECT * FROM mine_inventory WHERE owner_id=? AND resource_name=?').get(msg.author.id, res.name);
      const curQty = stored ? stored.quantity : 0, actual = Math.min(units, mine.maxStorage - curQty);
      if (actual <= 0) return msg.reply(`⚠️ مستودع **${res.name}** ممتلئ! بيع أولاً`);
      if (stored) { db.prepare('UPDATE mine_inventory SET quantity=quantity+? WHERE owner_id=? AND resource_name=?').run(actual, msg.author.id, res.name); }
      else { db.prepare('INSERT INTO mine_inventory (owner_id,resource_name,quantity,unit_value) VALUES (?,?,?,?)').run(msg.author.id, res.name, actual, res.value); }
      db.prepare('UPDATE user_mines SET last_mined=? WHERE owner_id=?').run(now, msg.author.id);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('⛏️ نتيجة التعدين!').setColor('#8B4513')
          .addFields(
            { name: '🏔 المنجم',   value: mine.name,                             inline: true },
            { name: `${res.emoji} المورد`, value: res.name,                      inline: true },
            { name: '📦 الكمية',   value: `${actual} وحدة`,                      inline: true },
            { name: '💰 القيمة',   value: fmt(actual * res.value),               inline: true },
            { name: '📊 المستودع', value: `${curQty+actual}/${mine.maxStorage}`, inline: true },
          ).setFooter({ text: 'مستودعي | بيع مورد [اسم] [كمية/كل]' })
      ]});
    }

    if (cmd === 'مستودعي') {
      const inv = db.prepare('SELECT * FROM mine_inventory WHERE owner_id=? AND quantity>0').all(msg.author.id);
      if (inv.length === 0) return msg.reply('📦 مستودعك فارغ!');
      const myMine = db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
      const mine   = myMine ? MINES_LIST.find(m => m.id === myMine.mine_id) : null;
      const totVal = inv.reduce((s,i) => s+(i.quantity*i.unit_value), 0);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(`📦 مستودع ${msg.author.username}`).setColor('#8B4513')
          .setDescription(inv.map(i => `${mine?.resources.find(r=>r.name===i.resource_name)?.emoji||'📦'} **${i.resource_name}**: ${i.quantity} وحدة — ${fmt(i.quantity*i.unit_value)}`).join('\n'))
          .addFields({ name: '💰 إجمالي القيمة', value: fmt(totVal) })
          .setFooter({ text: 'بيع مورد [اسم] [كمية/كل]' })
      ]});
    }

    if (cmd === 'مناجمي') {
      const myMine = db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
      if (!myMine) return msg.reply('❌ ليس لديك منجم!');
      const mine = MINES_LIST.find(m => m.id === myMine.mine_id);
      const left = Math.max(0, MINE_COOLDOWN - (Date.now() - (myMine.last_mined||0)));
      const inv  = db.prepare('SELECT * FROM mine_inventory WHERE owner_id=? AND quantity>0').all(msg.author.id);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(`⛏️ منجمك — ${mine.name}`).setColor('#8B4513')
          .addFields(
            { name: '💰 السعر',          value: fmt(mine.price),    inline: true },
            { name: '📦 التخزين',        value: `${mine.maxStorage} وحدة`, inline: true },
            { name: '⏰ التعدين القادم', value: left > 0 ? fmtTime(left) : '✅ جاهز!', inline: true },
            { name: '📊 المستودع',       value: inv.length > 0 ? inv.map(i=>`${i.resource_name}: ${i.quantity}`).join(' | ') : 'فارغ' },
            { name: '💰 قيمة المستودع', value: fmt(inv.reduce((s,i)=>s+(i.quantity*i.unit_value),0)), inline: true },
          ).setFooter({ text: 'بيع منجم — لبيع بـ 70%' })
      ]});
    }

    if (cmd === 'قرض') {
      const amount = parseAmount(args[0]);
      if (isNaN(amount) || amount <= 0) return msg.reply('❌ الاستخدام: `قرض المبلغ`');
      if (user.loan > 0) return msg.reply('❌ عندك قرض! سدده أولاً');
      if (amount > 20_000) return msg.reply(`❌ الحد الأقصى: **${fmt(20_000)}**`);
      const repay = Math.floor(amount * 1.10), due = Date.now() + 7*24*60*60*1000;
      db.prepare('UPDATE users SET balance=balance+?, loan=?, loan_due=? WHERE id=?').run(amount, repay, due, msg.author.id);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('🏦 تم منح القرض').setColor('#ffd700')
          .addFields(
            { name: '💰 استلمت',      value: fmt(amount), inline: true },
            { name: '💸 للسداد +10%', value: fmt(repay),  inline: true },
            { name: '⏰ المهلة',      value: '7 أيام',    inline: true },
          ).setFooter({ text: '⚠️ عدم السداد يؤدي لمصادرة ممتلكاتك!' })
      ]});
    }

    if (cmd === 'سداد') {
      if (user.loan === 0) return msg.reply('✅ ليس عليك أي قرض!');
      if (user.balance < user.loan) return msg.reply(`❌ تحتاج **${fmt(user.loan)}**`);
      const loan = user.loan;
      db.prepare('UPDATE users SET balance=balance-?, loan=0, loan_due=0, reputation=MIN(100,reputation+5) WHERE id=?').run(loan, msg.author.id);
      db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(Math.floor(loan*0.1));
      return msg.reply({ embeds: [new EmbedBuilder().setTitle('✅ تم سداد القرض!').setColor('#00ff88').setDescription(`سددت **${fmt(loan)}** بنجاح! 🎉\n⭐ +5 سمعة على الالتزام!`)] });
    }

    if (cmd === 'حماية') {
      const opts = { '6':{hours:6,price:5_000}, '12':{hours:12,price:9_000}, '24':{hours:24,price:15_000}, '72':{hours:72,price:35_000} };
      const opt  = opts[args[0]];
      if (!opt) return msg.reply('❌ الاستخدام: `حماية 6/12/24/72`\n6س=5K | 12س=9K | 24س=15K | 3أيام=35K');
      if (user.balance < opt.price) return msg.reply(`❌ تحتاج **${fmt(opt.price)}**`);
      const until = Date.now() + opt.hours * 3600000;
      db.prepare('UPDATE users SET balance=balance-?, protection_until=? WHERE id=?').run(opt.price, until, msg.author.id);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('🛡 تم تفعيل الحماية!').setColor('#00ff88')
          .addFields(
            { name: '⏰ المدة',   value: `${opt.hours} ساعة`,               inline: true },
            { name: '💰 التكلفة', value: fmt(opt.price),                     inline: true },
            { name: '🕐 تنتهي',   value: `<t:${Math.floor(until/1000)}:R>`, inline: true },
          )
      ]});
    }

    if (cmd === 'مجازفة') {
      const left = cooldownLeft(user, 'مجازفة');
      if (left > 0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);
      const amount = parseAmount(args[0], user.balance);
      if (isNaN(amount) || amount < 100) return msg.reply('❌ الاستخدام: `مجازفة [مبلغ/نص/ربع/كل]` (الحد الأدنى 100)');
      if (user.balance < amount) return msg.reply('❌ رصيدك ما يكفي!');
      const win = Math.random() > 0.5, change = win ? amount : -amount;
      db.prepare('UPDATE users SET balance=balance+?, last_gamble=? WHERE id=?').run(change, Date.now(), msg.author.id);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(win ? '🎉 ربحت!' : '😭 خسرت!').setColor(win ? '#00ff88' : '#e74c3c')
          .addFields(
            { name: '🎲 النتيجة',      value: win ? '✅ فزت' : '❌ خسرت', inline: true },
            { name: '💰 المبلغ',        value: fmt(amount),                inline: true },
            { name: '💳 الرصيد الجديد', value: fmt(user.balance + change), inline: true },
          )
      ]});
    }

    if (cmd === 'استثمر') {
      const left = cooldownLeft(user, 'استثمر');
      if (left > 0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);
      const amount  = parseAmount(args[0], user.balance);
      const riskKey = args[1] || 'منخفض';
      if (isNaN(amount) || amount < 1000) return msg.reply('❌ الاستخدام: `استثمر [مبلغ/نص/ربع/كل] [منخفض/متوسط/عالي]`');
      if (user.balance < amount) return msg.reply('❌ رصيدك ما يكفي!');
      const risks = {
        منخفض: { winChance: 0.80, minG: 0.10, maxG: 0.30, maxL: 0.05 },
        متوسط: { winChance: 0.60, minG: 0.20, maxG: 0.60, maxL: 0.25 },
        عالي:  { winChance: 0.45, minG: 0.50, maxG: 1.50, maxL: 0.40 },
      };
      const cfg = risks[riskKey] || risks['منخفض'], win = Math.random() < cfg.winChance;
      const change = win ? Math.floor(amount*(cfg.minG+Math.random()*(cfg.maxG-cfg.minG))) : -Math.floor(amount*cfg.maxL);
      db.prepare('UPDATE users SET balance=balance+?, last_invest=? WHERE id=?').run(change, Date.now(), msg.author.id);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(win ? '📈 استثمار ناجح!' : '📉 خسارة!').setColor(win ? '#00ff88' : '#e74c3c')
          .addFields(
            { name: '💰 المستثمر',                    value: fmt(amount),           inline: true },
            { name: win ? '📈 الربح' : '📉 الخسارة', value: fmt(Math.abs(change)), inline: true },
            { name: '💳 الرصيد الجديد',               value: fmt(user.balance + change), inline: true },
          )
      ]});
    }

    if (cmd === 'تداول') {
      const left = cooldownLeft(user, 'تداول');
      if (left > 0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);
      const amount = parseAmount(args[0], user.balance);
      if (isNaN(amount) || amount < 5000) return msg.reply('❌ الاستخدام: `تداول [مبلغ/نص/ربع/كل]` (الحد الأدنى 5000)');
      if (user.balance < amount) return msg.reply('❌ رصيدك ما يكفي!');
      const roll = Math.random(); let change, result;
      if (roll > 0.7)       { change = Math.floor(amount*(0.5+Math.random())); result = '📈 موجة صعود!'; }
      else if (roll > 0.4)  { change = Math.floor(amount*0.1*Math.random());   result = '📊 ارتفاع بسيط'; }
      else if (roll > 0.15) { change = -Math.floor(amount*0.2*Math.random());  result = '📉 تراجع طفيف'; }
      else                  { change = -Math.floor(amount*(0.3+Math.random()*0.4)); result = '💥 انهيار!'; }
      db.prepare('UPDATE users SET balance=balance+?, last_trade=? WHERE id=?').run(change, Date.now(), msg.author.id);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(`📊 ${result}`).setColor(change >= 0 ? '#00ff88' : '#e74c3c')
          .addFields(
            { name: '💰 المبلغ',                          value: fmt(amount),           inline: true },
            { name: change >= 0 ? '📈 ربح' : '📉 خسارة', value: fmt(Math.abs(change)), inline: true },
            { name: '💳 الرصيد الجديد',                   value: fmt(user.balance + change), inline: true },
          )
      ]});
    }

    if (cmd === 'سرقة') {
      const left = cooldownLeft(user, 'سرقة');
      if (left > 0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);
      const target = msg.mentions.users.first();
      if (!target) return msg.reply('❌ الاستخدام: `سرقة @شخص`');
      if (target.id === msg.author.id) return msg.reply('❌ ما تقدر تسرق نفسك!');
      const victim = db.prepare('SELECT * FROM users WHERE id=?').get(target.id);
      if (!victim || victim.balance < 500) return msg.reply('😅 الضحية فقيرة!');
      if (victim.protection_until > Date.now()) {
        db.prepare('UPDATE users SET reputation=MAX(0,reputation-5) WHERE id=?').run(msg.author.id);
        return msg.reply(`🛡 **${target.username}** محمي! -5 سمعة!`);
      }
      const success = Math.random() > 0.45;
      db.prepare('UPDATE users SET last_rob=? WHERE id=?').run(Date.now(), msg.author.id);
      if (success) {
        const stolen = Math.floor(Math.random()*victim.balance*0.15) + 100;
        db.prepare('UPDATE users SET balance=balance+?, reputation=MAX(0,reputation-10) WHERE id=?').run(stolen, msg.author.id);
        db.prepare('UPDATE users SET balance=balance-? WHERE id=?').run(stolen, target.id);
        await sendLog(client, msg.guildId, `🦹 سرقة: ${msg.author.username} سرق ${fmt(stolen)} من ${target.username}`);
        return msg.reply({ embeds: [
          new EmbedBuilder().setTitle('🦹 نجحت السرقة!').setColor('#ffd700')
            .setDescription(`سرقت **${fmt(stolen)}** من ${target.username}!`)
            .setFooter({ text: '⚠️ -10 سمعة' })
        ]});
      } else {
        const fine = Math.floor(user.balance * 0.10);
        db.prepare('UPDATE users SET balance=balance-?, reputation=MAX(0,reputation-15) WHERE id=?').run(fine, msg.author.id);
        db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(fine);
        return msg.reply({ embeds: [new EmbedBuilder().setTitle('👮 تم القبض عليك!').setColor('#e74c3c').setDescription(`دفعت **${fmt(fine)}** غرامة و -15 سمعة!`)] });
      }
    }

    if (cmd === 'سمعة') {
      const repLvl  = getReputation(user.reputation);
      const nextLvl = REPUTATION_LEVELS.find(r => r.min > user.reputation);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('⭐ نظام السمعة').setColor('#ffd700')
          .addFields(
            { name: '📊 سمعتك الحالية',    value: `${user.reputation}/100 — ${repLvl.name}` },
            { name: '📈 كيف ترفع سمعتك؟', value: ['`راتب` — +1 سمعة','`عمل` — +1 سمعة','`سداد` — +5 سمعة','`شراء بيت/شركة/منجم` — +2 سمعة'].join('\n') },
            { name: '📉 كيف تنخفض؟',       value: ['سرقة ناجحة — -10','سرقة فاشلة — -15','محاولة سرقة محمي — -5'].join('\n') },
            { name: '🏷 مستويات السمعة',   value: REPUTATION_LEVELS.map(r => `${r.name}: ${r.min}–${r.max}`).join('\n') },
          ).setFooter({ text: nextLvl ? `تحتاج ${nextLvl.min - user.reputation} نقطة لـ ${nextLvl.name}` : '🎉 أعلى مستوى!' })
      ]});
    }

    if (cmd === 'متصدرون' || cmd === 'ليدربورد') {
      const top    = db.prepare('SELECT *,(balance+bank) as total FROM users ORDER BY total DESC LIMIT 10').all();
      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('🏆 أغنى المواطنين').setColor('#ffd700')
          .setDescription(top.map((u,i) => `${medals[i]} **${u.username}** — ${fmt(u.total)}`).join('\n') || 'لا بيانات')
          .setTimestamp()
      ]});
    }

    if (['إحصائياتي','احصائياتي','احصاياتي','إحصاياتي'].includes(cmd)) {
      const props  = db.prepare('SELECT * FROM properties WHERE owner_id=?').all(msg.author.id);
      const level  = getLevel(user.balance + user.bank);
      const totInc = props.reduce((s,p) => s+p.income, 0);
      const myMine = db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
      const repLvl = getReputation(user.reputation);
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle(`📊 إحصائيات — ${msg.author.username}`).setColor('#9b59b6')
          .addFields(
            { name: '🏆 المستوى',  value: level.name,          inline: true },
            { name: '⭐ السمعة',   value: `${user.reputation}/100 ${repLvl.name}`, inline: true },
            { name: '💰 الثروة',   value: fmt(user.balance + user.bank), inline: true },
            { name: '🏠 بيوت',    value: `${props.filter(p=>p.type==='house').length}`,   inline: true },
            { name: '🏢 شركات',   value: `${props.filter(p=>p.type==='company').length}`, inline: true },
            { name: '📈 دخل/ساعة', value: fmt(totInc),         inline: true },
            { name: '⛏️ المنجم',   value: myMine ? MINES_LIST.find(m=>m.id===myMine.mine_id)?.name : 'لا يوجد', inline: true },
            { name: '💳 قرض',     value: user.loan > 0 ? fmt(user.loan) : 'لا يوجد', inline: true },
            { name: '🛡 حماية',   value: user.protection_until > Date.now() ? `✅ ${fmtTime(user.protection_until - Date.now())}` : '❌', inline: true },
          )
      ]});
    }

    if (cmd === 'الحكومة' || cmd === 'بنك') {
      const gov = db.prepare('SELECT * FROM government WHERE id=1').get();
      const cnt = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('🏛 البنك الحكومي').setColor('#e74c3c')
          .addFields({ name: '💰 الخزنة', value: fmt(gov.treasury), inline: true }, { name: '👥 المواطنون', value: `${cnt}`, inline: true })
          .setTimestamp()
      ]});
    }

    if (cmd === 'وقت') {
      const myMine   = db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
      const mineLeft = myMine ? Math.max(0, MINE_COOLDOWN - (Date.now() - (myMine.last_mined||0))) : -1;
      const tranLeft = Math.max(0, TRANSFER_COOLDOWN - (Date.now() - (user.last_transfer||0)));
      const fields   = [
        { name: '💰 راتب',   value: cooldownLeft(user,'راتب')>0   ? `⏰ ${fmtTime(cooldownLeft(user,'راتب'))}`   : '✅ جاهز', inline: true },
        { name: '🔨 عمل',    value: cooldownLeft(user,'عمل')>0    ? `⏰ ${fmtTime(cooldownLeft(user,'عمل'))}`    : '✅ جاهز', inline: true },
        { name: '🎲 مجازفة', value: cooldownLeft(user,'مجازفة')>0 ? `⏰ ${fmtTime(cooldownLeft(user,'مجازفة'))}` : '✅ جاهز', inline: true },
        { name: '📈 استثمر', value: cooldownLeft(user,'استثمر')>0 ? `⏰ ${fmtTime(cooldownLeft(user,'استثمر'))}` : '✅ جاهز', inline: true },
        { name: '📊 تداول',  value: cooldownLeft(user,'تداول')>0  ? `⏰ ${fmtTime(cooldownLeft(user,'تداول'))}`  : '✅ جاهز', inline: true },
        { name: '🦹 سرقة',   value: cooldownLeft(user,'سرقة')>0   ? `⏰ ${fmtTime(cooldownLeft(user,'سرقة'))}`   : '✅ جاهز', inline: true },
        { name: '🏠 تحصيل',  value: cooldownLeft(user,'تحصيل')>0  ? `⏰ ${fmtTime(cooldownLeft(user,'تحصيل'))}`  : '✅ جاهز', inline: true },
        { name: '💸 تحويل',  value: tranLeft > 0 ? `⏰ ${fmtTime(tranLeft)}` : '✅ جاهز', inline: true },
      ];
      if (mineLeft >= 0) fields.push({ name: '⛏️ تعدين', value: mineLeft > 0 ? `⏰ ${fmtTime(mineLeft)}` : '✅ جاهز', inline: true });
      return msg.reply({ embeds: [new EmbedBuilder().setTitle(`⏰ أوقات الأوامر — ${msg.author.username}`).setColor('#3498db').addFields(...fields).setTimestamp()] });
    }

    if (cmd === 'اوامر' || cmd === 'أوامر') {
      return msg.reply({ embeds: [
        new EmbedBuilder().setTitle('📋 قائمة الأوامر الكاملة').setColor('#4e8aff')
          .addFields(
            { name: '👤 الحساب',   value: ['`ملفي` — ملفك الكامل','`رصيد` — رصيدك','`إحصائياتي`','`وقت` — الكولداون','`سمعة` — نظام السمعة'].join('\n') },
            { name: '💰 الكسب',    value: ['`راتب` — كل ساعة (+1 سمعة)','`عمل` — كل ساعة (+1 سمعة)','`تحصيل` — دخل العقارات'].join('\n') },
            { name: '🏦 البنك',    value: ['`إيداع [مبلغ/كل/نص/ربع/ثلث]`','`سحب [مبلغ/كل/نص/ربع/ثلث]`','`تحويل @شخص مبلغ` — كل ساعتين | حد 35%','`قرض مبلغ` — حد أقصى 20K','`سداد` (+5 سمعة)'].join('\n') },
            { name: '🏠 العقارات', value: ['`بيوت` / `شركات` — السوق','`شراء بيت [h1-h20]` / `شراء شركة [c1-c20]` (+2 سمعة)','`بيع [رقم]` — 70%','`ممتلكاتي`'].join('\n') },
            { name: '⛏️ المناجم',  value: ['`مناجم` — السوق','`شراء منجم [m1-m8]` — واحد فقط! (+2 سمعة)','`تعدين` — كل 3 ساعات','`مستودعي` / `مناجمي`','`بيع مورد [اسم] [كمية/كل]`','`بيع منجم` — 70%'].join('\n') },
            { name: '🎮 الألعاب',  value: ['`مجازفة [مبلغ/نص/ربع/كل]` — كل 5 دقايق','`استثمر [مبلغ] [منخفض/متوسط/عالي]` — كل 5 دقايق','`تداول [مبلغ/نص/ربع/كل]` — كل 5 دقايق','`سرقة @شخص` — كل 15 دقيقة'].join('\n') },
            { name: '🛡 الحماية',  value: ['`حماية 6` — 5K','`حماية 12` — 9K','`حماية 24` — 15K','`حماية 72` — 35K'].join('\n') },
            { name: '📊 عام',      value: ['`متصدرون`','`الحكومة`'].join('\n') },
          ).setFooter({ text: '💡 تقدر تستخدم: كل | نص | ربع | ثلث | ثلثين | 3ارباع | 1k | 1m | 1b' })
      ]});
    }

    // أوامر الإدارة — فقط OWNER_ID
    if (msg.author.id !== CONFIG.OWNER_ID) return;

    if (cmd === 'تفضل' || cmd === 'أعطِ') {
      const target = msg.mentions.users.first(), amount = parseAmount(args[1]);
      if (!target || isNaN(amount)) return msg.reply('❌ الاستخدام: `تفضل @شخص مبلغ`');
      getUser(target.id, target.username);
      db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(amount, target.id);
      await sendLog(client, msg.guildId, `💸 أدمن أعطى ${target.username} — ${fmt(amount)}`);
      return msg.reply(`✅ أضفت **${fmt(amount)}** لـ ${target.username}`);
    }

    if (cmd === 'خذ') {
      const target = msg.mentions.users.first(), amount = parseAmount(args[1]);
      if (!target || isNaN(amount)) return msg.reply('❌ الاستخدام: `خذ @شخص مبلغ`');
      db.prepare('UPDATE users SET balance=MAX(0,balance-?) WHERE id=?').run(amount, target.id);
      db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(amount, msg.author.id);
      await sendLog(client, msg.guildId, `💸 أدمن أخذ من ${target.username} — ${fmt(amount)}`);
      return msg.reply(`✅ أخذت **${fmt(amount)}** من ${target.username}`);
    }

    if (cmd === 'ريست') {
      const target = msg.mentions.users.first();
      if (!target) return msg.reply('❌ الاستخدام: `ريست @شخص`');
      db.prepare('UPDATE users SET balance=5000, bank=0, loan=0, loan_due=0, reputation=100 WHERE id=?').run(target.id);
      db.prepare('DELETE FROM properties WHERE owner_id=?').run(target.id);
      db.prepare('DELETE FROM user_mines WHERE owner_id=?').run(target.id);
      db.prepare('DELETE FROM mine_inventory WHERE owner_id=?').run(target.id);
      await sendLog(client, msg.guildId, `🔄 ريست حساب ${target.username}`);
      return msg.reply(`✅ تم ريست حساب **${target.username}**`);
    }

    if (cmd === 'ريست_الكل') {
      if (args[0] !== 'تأكيد')
        return msg.reply('⚠️ هذا الأمر يرست **كل** الحسابات!\nللتأكيد اكتب: `ريست_الكل تأكيد`');
      db.prepare(`UPDATE users SET balance=5000, bank=0, loan=0, loan_due=0, reputation=100,
        last_salary=0, last_work=0, last_gamble=0, last_invest=0,
        last_trade=0, last_rob=0, last_collect=0, last_transfer=0,
        last_mine=0, protection_until=0`).run();
      db.prepare('DELETE FROM properties').run();
      db.prepare('DELETE FROM user_mines').run();
      db.prepare('DELETE FROM mine_inventory').run();
      db.prepare('UPDATE government SET treasury=0').run();
      await sendLog(client, msg.guildId, `🔄 ريست كامل للاقتصاد بواسطة ${msg.author.username}`);
      return msg.reply('✅ تم ريست **كل** الحسابات والاقتصاد بالكامل! 🔄');
    }

    if (cmd === 'سمعة_أدمن') {
      const target = msg.mentions.users.first(), amount = parseInt(args[1]);
      if (!target || isNaN(amount)) return msg.reply('❌ الاستخدام: `سمعة_أدمن @شخص رقم` (يمكن سالب)');
      db.prepare('UPDATE users SET reputation=MAX(0,MIN(100,reputation+?)) WHERE id=?').run(amount, target.id);
      return msg.reply(`✅ تم تعديل سمعة **${target.username}** بـ ${amount>0?'+':''}${amount}`);
    }

  } catch(e) {
    console.error('خطأ:', e);
    msg.reply('❌ حدث خطأ غير متوقع!').catch(() => {});
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const [type, pageStr] = interaction.customId.split('_');
  if (pageStr === 'info') return interaction.deferUpdate();
  const page = parseInt(pageStr); if (isNaN(page)) return;
  if (type === 'houses')    { const {embed,totalPages}=buildHousesEmbed(page);    return interaction.update({embeds:[embed],components:[buildPageButtons(page,totalPages,'houses')]}); }
  if (type === 'companies') { const {embed,totalPages}=buildCompaniesEmbed(page); return interaction.update({embeds:[embed],components:[buildPageButtons(page,totalPages,'companies')]}); }
  if (type === 'mines')     { const p=Math.max(0,Math.min(page,Math.ceil(MINES_LIST.length/MINES_PER_PAGE)-1)); const {embed,totalPages}=buildMinesEmbed(p); return interaction.update({embeds:[embed],components:[buildPageButtons(p,totalPages,'mines')]}); }
});

function startTaxSystem() {
  setInterval(() => {
    try {
      const users = db.prepare('SELECT * FROM users').all(); let total = 0;
      for (const u of users) {
        const tax = Math.floor((u.balance + u.bank) * 0.01); if (tax <= 0) continue;
        const fromBal = Math.min(tax, u.balance), fromBank = tax - fromBal;
        db.prepare('UPDATE users SET balance=balance-?, bank=MAX(0,bank-?) WHERE id=?').run(fromBal, fromBank, u.id);
        total += tax;
      }
      db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(total);
      console.log(`⚖️ ضرائب: ${total.toLocaleString()}`);
    } catch(e) { console.error('خطأ ضرائب:', e); }
  }, 24*60*60*1000);
}

function startConfiscationSystem() {
  setInterval(() => {
    try {
      const now = Date.now();
      const overdue = db.prepare('SELECT * FROM users WHERE loan>0 AND loan_due>0 AND loan_due<?').all(now);
      for (const u of overdue) {
        if (u.protection_until > now) continue;
        const prop = db.prepare('SELECT * FROM properties WHERE owner_id=? LIMIT 1').get(u.id);
        if (prop) {
          db.prepare('DELETE FROM properties WHERE id=?').run(prop.id);
          db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(prop.price);
          db.prepare('UPDATE users SET loan=MAX(0,loan-?) WHERE id=?').run(prop.price, u.id);
        } else {
          const cut = Math.floor((u.balance + u.bank) * 0.3);
          db.prepare('UPDATE users SET balance=MAX(0,balance-?), loan=0, loan_due=0 WHERE id=?').run(cut, u.id);
          db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(cut);
        }
      }
    } catch(e) { console.error('خطأ مصادرة:', e); }
  }, 60*60*1000);
}

client.login(process.env.TOKEN);
