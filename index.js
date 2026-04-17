require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const Database = require('better-sqlite3');

const CONFIG = {
  ECONOMY_CHANNEL_ID: '1478138274546454732',
  LOG_CHANNEL_ID: '',
  OWNER_ID: '717481322683301940',
  EXTRA_OWNERS: ['1412021840133492857' , '1027626650655019048'],
};

const db = new Database('economy.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT,
    balance INTEGER DEFAULT 5000, bank INTEGER DEFAULT 0,
    loan INTEGER DEFAULT 0, loan_due INTEGER DEFAULT 0,
    reputation INTEGER DEFAULT 100, protection_until INTEGER DEFAULT 0,
    last_salary INTEGER DEFAULT 0, last_work INTEGER DEFAULT 0,
    last_gamble INTEGER DEFAULT 0, last_invest INTEGER DEFAULT 0,
    last_trade INTEGER DEFAULT 0, last_rob INTEGER DEFAULT 0,
    last_transfer INTEGER DEFAULT 0, last_mine INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS government (id INTEGER PRIMARY KEY DEFAULT 1, treasury INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS user_mines (owner_id TEXT PRIMARY KEY, mine_id TEXT, last_mined INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS mine_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id TEXT,
    resource_name TEXT, quantity INTEGER DEFAULT 0, unit_value INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS slaves (
    slave_id TEXT PRIMARY KEY, owner_id TEXT,
    buy_price INTEGER, bought_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plaintiff_id TEXT, defendant_id TEXT,
    stolen_amount INTEGER, status TEXT DEFAULT 'open',
    verdict TEXT, created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS rob_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    robber_id TEXT, victim_id TEXT,
    amount INTEGER, at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS gangs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE, leader_id TEXT,
    member2_id TEXT DEFAULT NULL, member3_id TEXT DEFAULT NULL,
    treasury INTEGER DEFAULT 0, wins INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT, amount INTEGER, country TEXT,
    result TEXT, profit INTEGER,
    started_at INTEGER, ends_at INTEGER,
    notified INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS loot_boxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT, box_type TEXT, prize TEXT,
    prize_value INTEGER, opened_at INTEGER DEFAULT (unixepoch())
  );
  INSERT OR IGNORE INTO government (id, treasury) VALUES (1, 0);
`);

try { db.exec(`ALTER TABLE users ADD COLUMN last_transfer INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN last_mine INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN reputation INTEGER DEFAULT 100`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN mine_sold_at INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN last_lootbox INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE trips ADD COLUMN country TEXT DEFAULT 'غير محدد'`); } catch(e) {}

// ==============================
// دول الرحلات الاستثمارية
// ==============================
const TRIP_COUNTRIES = [
  { name: '🇺🇸 أمريكا',      risk: 'متوسط', bonus: 1.0,  desc: 'سوق متنوع ومستقر' },
  { name: '🇨🇳 الصين',       risk: 'عالي',  bonus: 1.3,  desc: 'نمو سريع وتقلبات كبيرة' },
  { name: '🇦🇪 الإمارات',    risk: 'منخفض', bonus: 0.8,  desc: 'بيئة أعمال آمنة' },
  { name: '🇯🇵 اليابان',     risk: 'منخفض', bonus: 0.9,  desc: 'اقتصاد مستقر وموثوق' },
  { name: '🇧🇷 البرازيل',    risk: 'عالي',  bonus: 1.4,  desc: 'فرص كبيرة ومخاطر عالية' },
  { name: '🇩🇪 ألمانيا',     risk: 'منخفض', bonus: 0.85, desc: 'صناعة قوية وعوائد ثابتة' },
  { name: '🇷🇺 روسيا',      risk: 'عالي',  bonus: 1.5,  desc: 'ثروات طبيعية وتقلبات شديدة' },
  { name: '🇸🇦 السعودية',    risk: 'متوسط', bonus: 1.1,  desc: 'نفط وتنويع اقتصادي' },
  { name: '🇮🇳 الهند',       risk: 'متوسط', bonus: 1.2,  desc: 'اقتصاد ناشئ وسريع النمو' },
  { name: '🇨🇭 سويسرا',      risk: 'منخفض', bonus: 0.75, desc: 'أكثر الاقتصادات استقراراً' },
  { name: '🌑 الأسواق الخفية', risk: 'خطر',  bonus: 2.0,  desc: 'مكسب ضخم أو خسارة كاملة!' },
];

// ==============================
// صناديق الحظ
// ==============================
const LOOT_BOXES = {
  عادي: {
    price: 5_000,
    emoji: '📦',
    color: '#95a5a6',
    prizes: [
      { name: 'فلوس صغيرة',  type: 'money',      value: 2_000,   chance: 30 },
      { name: 'فلوس متوسطة', type: 'money',      value: 8_000,   chance: 25 },
      { name: 'فلوس جيدة',   type: 'money',      value: 15_000,  chance: 20 },
      { name: 'حماية 6س',    type: 'protection', value: 6,       chance: 15 },
      { name: 'فلوس كبيرة',  type: 'money',      value: 50_000,  chance: 8  },
      { name: 'جائزة نادرة', type: 'money',      value: 200_000, chance: 2  },
    ]
  },
  فضي: {
    price: 25_000,
    emoji: '🥈',
    color: '#bdc3c7',
    prizes: [
      { name: 'فلوس جيدة',    type: 'money',      value: 20_000,   chance: 25 },
      { name: 'فلوس ممتازة',  type: 'money',      value: 60_000,   chance: 25 },
      { name: 'حماية 24س',   type: 'protection', value: 24,       chance: 20 },
      { name: 'فلوس كبيرة',  type: 'money',      value: 150_000,  chance: 15 },
      { name: 'جائزة نادرة', type: 'money',      value: 500_000,  chance: 10 },
      { name: 'جائزة أسطورية',type:'money',       value: 2_000_000,chance: 5  },
    ]
  },
  ذهبي: {
    price: 100_000,
    emoji: '🥇',
    color: '#f1c40f',
    prizes: [
      { name: 'فلوس ممتازة',   type: 'money',      value: 80_000,    chance: 20 },
      { name: 'فلوس كبيرة',   type: 'money',      value: 300_000,   chance: 20 },
      { name: 'حماية 72س',    type: 'protection', value: 72,        chance: 20 },
      { name: 'جائزة نادرة',  type: 'money',      value: 1_000_000, chance: 20 },
      { name: 'جائزة أسطورية',type: 'money',      value: 5_000_000, chance: 15 },
      { name: 'جائزة إمبراطور',type:'money',       value: 20_000_000,chance: 5  },
    ]
  },
  أسطوري: {
    price: 500_000,
    emoji: '💎',
    color: '#9b59b6',
    prizes: [
      { name: 'فلوس كبيرة',    type: 'money',      value: 500_000,   chance: 20 },
      { name: 'جائزة نادرة',   type: 'money',      value: 2_000_000, chance: 20 },
      { name: 'جائزة أسطورية', type: 'money',      value: 10_000_000,chance: 20 },
      { name: 'جائزة إمبراطور',type: 'money',      value: 50_000_000,chance: 20 },
      { name: 'حماية 72س',     type: 'protection', value: 72,        chance: 10 },
      { name: 'الجائزة الكبرى',type: 'money',      value: 200_000_000,chance: 10},
    ]
  },
};

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
  { id: 'm1',  name: '⛏️ منجم الحجارة',         price: 500_000,      maxStorage: 50, resources: [{ name: 'حجر',        value: 10_000,        chance: 70, emoji: '🪨' }, { name: 'رخام',        value: 30_000,        chance: 30, emoji: '⬜' }] },
  { id: 'm2',  name: '🪨 منجم الفحم',            price: 1_500_000,    maxStorage: 45, resources: [{ name: 'فحم',        value: 25_000,        chance: 65, emoji: '⬛' }, { name: 'أنثراسيت',   value: 70_000,        chance: 35, emoji: '🖤' }] },
  { id: 'm3',  name: '🔩 منجم الحديد',           price: 3_000_000,    maxStorage: 40, resources: [{ name: 'حديد',       value: 60_000,        chance: 60, emoji: '🔩' }, { name: 'صلب',         value: 150_000,       chance: 40, emoji: '⚙️' }] },
  { id: 'm4',  name: '🪙 منجم النحاس',           price: 6_000_000,    maxStorage: 35, resources: [{ name: 'نحاس',       value: 150_000,       chance: 60, emoji: '🟤' }, { name: 'برونز',       value: 350_000,       chance: 40, emoji: '🏺' }] },
  { id: 'm5',  name: '⚪ منجم الفضة',            price: 10_000_000,   maxStorage: 30, resources: [{ name: 'فضة',        value: 400_000,       chance: 55, emoji: '⚪' }, { name: 'بلاتين',      value: 900_000,       chance: 45, emoji: '🥈' }] },
  { id: 'm6',  name: '🟡 منجم الذهب',            price: 16_000_000,   maxStorage: 25, resources: [{ name: 'ذهب',        value: 1_000_000,     chance: 55, emoji: '🟡' }, { name: 'إلكتروم',     value: 2_500_000,     chance: 45, emoji: '🥇' }] },
  { id: 'm7',  name: '💎 منجم الأحجار الكريمة',  price: 22_000_000,   maxStorage: 20, resources: [{ name: 'زمرد',       value: 4_000_000,     chance: 40, emoji: '💚' }, { name: 'ياقوت',       value: 7_000_000,     chance: 35, emoji: '❤️' }, { name: 'ألماس',      value: 12_000_000,    chance: 25, emoji: '💎' }] },
  { id: 'm8',  name: '🔵 منجم الأحجار النادرة',  price: 30_000_000,   maxStorage: 15, resources: [{ name: 'صفير',       value: 18_000_000,    chance: 40, emoji: '💙' }, { name: 'فيروز',       value: 30_000_000,    chance: 35, emoji: '🟦' }, { name: 'عقيق',       value: 55_000_000,    chance: 25, emoji: '💜' }] },
  { id: 'm9',  name: '☢️ منجم المعادن النادرة',   price: 80_000_000,   maxStorage: 12, resources: [{ name: 'تيتانيوم',   value: 80_000_000,    chance: 45, emoji: '⚫' }, { name: 'إيريديوم',    value: 180_000_000,   chance: 35, emoji: '🔘' }, { name: 'أوسميوم',    value: 350_000_000,   chance: 20, emoji: '☢️' }] },
  { id: 'm10', name: '🌌 منجم الكريستال',         price: 200_000_000,  maxStorage: 10, resources: [{ name: 'كريستال',    value: 200_000_000,   chance: 50, emoji: '🔮' }, { name: 'كوارتز',      value: 500_000_000,   chance: 30, emoji: '🌌' }, { name: 'نيليوم',     value: 1_000_000_000, chance: 20, emoji: '✨' }] },
  { id: 'm11', name: '🌠 منجم النجوم',            price: 500_000_000,  maxStorage: 8,  resources: [{ name: 'ستارديست',   value: 600_000_000,   chance: 45, emoji: '🌠' }, { name: 'نيوترونيوم',  value: 1_500_000_000, chance: 35, emoji: '⭐' }, { name: 'كوزميوم',    value: 3_000_000_000, chance: 20, emoji: '🌟' }] },
  { id: 'm12', name: '👑 منجم الإمبراطور',        price: 1_000_000_000,maxStorage: 5,  resources: [{ name: 'أوريكالكوم', value: 2_000_000_000, chance: 40, emoji: '👑' }, { name: 'أدامانتيوم',  value: 5_000_000_000, chance: 35, emoji: '💠' }, { name: 'إكسيريوم',   value: 10_000_000_000,chance: 25, emoji: '🔱' }] },
];

const MINE_COOLDOWN     = 3 * 60 * 60 * 1000;
const TRANSFER_COOLDOWN = 1 * 60 * 60 * 1000;
const SLAVE_CUT         = 0.20;
const MINES_PER_PAGE    = 4;

const COOLDOWNS = {
  راتب: 1*60*60*1000, عمل: 1*60*60*1000, مجازفة: 5*60*1000,
  استثمر: 5*60*1000, تداول: 5*60*1000, سرقة: 15*60*1000,
};

function fmt(n) {
  if (n >= 1_000_000_000_000) return (n/1_000_000_000_000).toFixed(1)+'T 💰';
  if (n >= 1_000_000_000)     return (n/1_000_000_000).toFixed(1)+'B 💰';
  if (n >= 1_000_000)         return (n/1_000_000).toFixed(1)+'M 💰';
  if (n >= 1_000)             return (n/1_000).toFixed(1)+'K 💰';
  return n.toLocaleString('ar')+' 💰';
}

function parseAmount(str, fallback = null) {
  if (!str) return NaN;
  const s = str.toLowerCase().trim();
  if (s==='كل'||s==='all')            return fallback ?? NaN;
  if (s==='نص'||s==='نصف')            return fallback!==null ? Math.floor(fallback/2)   : NaN;
  if (s==='ربع')                       return fallback!==null ? Math.floor(fallback/4)   : NaN;
  if (s==='ثلث')                       return fallback!==null ? Math.floor(fallback/3)   : NaN;
  if (s==='ثلثين'||s==='ثلثان')       return fallback!==null ? Math.floor(fallback*2/3) : NaN;
  if (s==='3ارباع'||s==='ثلاثةارباع') return fallback!==null ? Math.floor(fallback*3/4) : NaN;
  const mults = { 'k':1_000,'m':1_000_000,'b':1_000_000_000,'t':1_000_000_000_000 };
  for (const [suf,m] of Object.entries(mults)) {
    if (s.endsWith(suf)) { const n=parseFloat(s.slice(0,-suf.length)); if(!isNaN(n)) return Math.floor(n*m); }
  }
  return parseInt(s);
}

function getLevel(total) { let c=LEVELS[0]; for(const l of LEVELS) if(total>=l.min) c=l; return c; }
function getReputation(rep) { return REPUTATION_LEVELS.find(r=>rep>=r.min&&rep<=r.max)||REPUTATION_LEVELS[0]; }

function getUser(id, username='') {
  let u=db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (!u) { db.prepare('INSERT OR IGNORE INTO users (id,username) VALUES (?,?)').run(id,username); u=db.prepare('SELECT * FROM users WHERE id=?').get(id); }
  return u;
}

function cooldownLeft(user, cmd) {
  const fm={راتب:'last_salary',عمل:'last_work',مجازفة:'last_gamble',استثمر:'last_invest',تداول:'last_trade',سرقة:'last_rob'};
  const f=fm[cmd]; if(!f) return 0;
  return Math.max(0, COOLDOWNS[cmd]-(Date.now()-(user[f]||0)));
}

function fmtTime(ms) {
  if (ms<=0) return '✅ جاهز';
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);
  if(h>0) return `${h}س ${m}د ${s}ث`; if(m>0) return `${m}د ${s}ث`; return `${s}ث`;
}

function slaveCut(userId, earned, label) {
  const rec = db.prepare('SELECT * FROM slaves WHERE slave_id=?').get(userId);
  if (!rec || earned <= 0) return earned;
  const cut = Math.floor(earned * SLAVE_CUT);
  if (cut <= 0) return earned;
  db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(cut, rec.owner_id);
  db.prepare('UPDATE users SET balance=MAX(0,balance-?) WHERE id=?').run(cut, userId);
  try {
    const slaveUser = db.prepare('SELECT username FROM users WHERE id=?').get(userId);
    client.users.fetch(rec.owner_id).then(o=>o.send(`💰 **حصتك من العبودية!**\nعبدك **${slaveUser?.username||userId}** كسب من ${label}\nأخذت: **${fmt(cut)}**`).catch(()=>{})).catch(()=>{});
  } catch(e) {}
  return earned - cut;
}

function rollPrize(prizes) {
  const total = prizes.reduce((s,p)=>s+p.chance,0);
  let r = Math.random()*total, cum=0;
  for(const p of prizes){ cum+=p.chance; if(r<=cum) return p; }
  return prizes[prizes.length-1];
}

function buildPageButtons(page, totalPages, prefix) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${prefix}_${page-1}`).setLabel('◀️ السابق').setStyle(ButtonStyle.Secondary).setDisabled(page<=0),
    new ButtonBuilder().setCustomId(`${prefix}_info`).setLabel(`${page+1} / ${totalPages}`).setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId(`${prefix}_${page+1}`).setLabel('التالي ▶️').setStyle(ButtonStyle.Secondary).setDisabled(page>=totalPages-1),
  );
}

function buildMinesEmbed(page) {
  const start=page*MINES_PER_PAGE, slice=MINES_LIST.slice(start,start+MINES_PER_PAGE), totalPages=Math.ceil(MINES_LIST.length/MINES_PER_PAGE);
  return {embed:new EmbedBuilder().setTitle('⛏️ سوق المناجم').setColor('#8B4513')
    .setDescription(slice.map(m=>`**${m.name}** \`[${m.id}]\`\n💰 ${fmt(m.price)} | 📦 ${m.maxStorage} وحدة\n${m.resources.map(r=>`  ${r.emoji} ${r.name} (${r.chance}%) — ${fmt(r.value)}`).join('\n')}`).join('\n\n'))
    .setFooter({text:`صفحة ${page+1} من ${totalPages} | شراء منجم [id]`}), totalPages};
}

async function sendLog(guildId, content) {
  if(!CONFIG.LOG_CHANNEL_ID) return;
  try { const ch=client.guilds.cache.get(guildId)?.channels.cache.get(CONFIG.LOG_CHANNEL_ID); if(ch) await ch.send(content); } catch(e){}
}

const client = new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMembers]});
client.once('ready', () => { console.log(`✅ البوت شغال: ${client.user.tag}`); startTaxSystem(); startConfiscationSystem(); });

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (CONFIG.ECONOMY_CHANNEL_ID && msg.channelId !== CONFIG.ECONOMY_CHANNEL_ID) return;
  const parts=msg.content.trim().split(/\s+/), cmd=parts[0], args=parts.slice(1);
  const user=getUser(msg.author.id, msg.author.username);
  try {

    // ملفي
    if (cmd==='ملفي'||cmd==='بروفايل') {
      const target=msg.mentions.users.first(), u=target?getUser(target.id,target.username):user;
      const level=getLevel(u.balance+u.bank), repLvl=getReputation(u.reputation), prot=u.protection_until>Date.now();
      const myMine=db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(u.id);
      const slaveRec=db.prepare('SELECT * FROM slaves WHERE slave_id=?').get(u.id);
      const mySlaves=db.prepare('SELECT * FROM slaves WHERE owner_id=?').all(u.id);
      const ownerName=slaveRec?db.prepare('SELECT username FROM users WHERE id=?').get(slaveRec.owner_id)?.username:'';
      const lostCases=db.prepare("SELECT COUNT(*) as c FROM cases WHERE defendant_id=? AND verdict='plaintiff'").get(u.id);
      return msg.reply({embeds:[new EmbedBuilder()
        .setTitle(`📊 الملف الاقتصادي — ${target?.username||msg.author.username}`)
        .setThumbnail((target||msg.author).displayAvatarURL())
        .setColor(prot?'#00ff88':'#4e8aff')
        .addFields(
          {name:'💰 المحفظة',value:fmt(u.balance),inline:true},{name:'🏦 البنك',value:fmt(u.bank),inline:true},{name:'📊 الإجمالي',value:fmt(u.balance+u.bank),inline:true},
          {name:'🏆 المستوى',value:level.name,inline:true},{name:'⭐ السمعة',value:`${u.reputation}/100 ${repLvl.name}`,inline:true},{name:'🛡 الحماية',value:prot?`⏰ ${fmtTime(u.protection_until-Date.now())}`:'❌',inline:true},
          {name:'⛏️ المنجم',value:myMine?MINES_LIST.find(m=>m.id===myMine.mine_id)?.name:'لا يوجد',inline:true},{name:'💳 القرض',value:u.loan>0?fmt(u.loan):'لا يوجد',inline:true},
          {name:'⛓️ وضع العبودية',value:slaveRec?`مملوك لـ **${ownerName}** | للتحرير: ${fmt(slaveRec.buy_price*2)}`:'حر 🕊️',inline:false},
          {name:'👥 عبيدي',value:mySlaves.length>0?`${mySlaves.length} عبيد`:'لا يوجد',inline:true},
          {name:'⚖️ السجل الجنائي',value:lostCases.c>0?`🔴 حرامي موثق (${lostCases.c} قضية)`:'✅ نظيف',inline:true},
        ).setFooter({text:`راتبك: ${fmt(level.salary)} كل ساعة`}).setTimestamp()]});
    }

    // رصيد
    if (cmd==='رصيد') {
      const repLvl=getReputation(user.reputation);
      return msg.reply({embeds:[new EmbedBuilder().setTitle('💳 رصيدك').setColor('#4e8aff')
        .addFields({name:'💰 المحفظة',value:fmt(user.balance),inline:true},{name:'🏦 البنك',value:fmt(user.bank),inline:true},{name:'📊 الإجمالي',value:fmt(user.balance+user.bank),inline:true},{name:'⭐ السمعة',value:`${user.reputation}/100 ${repLvl.name}`,inline:true})]});
    }

    const repLvl=getReputation(user.reputation);
    const allowedWhenBlocked=['ملفي','بروفايل','رصيد','وقت','اوامر','أوامر','سمعة','راتب','عمل'];
    if (repLvl.blocked && !allowedWhenBlocked.includes(cmd))
      return msg.reply('🚫 **خدماتك موقوفة!**\nاكتب `راتب` أو `عمل` لترفع سمعتك!');

    // راتب
    if (cmd==='راتب') {
      const left=cooldownLeft(user,'راتب'); if(left>0) return msg.reply(`⏰ راتبك القادم بعد **${fmtTime(left)}**`);
      const level=getLevel(user.balance+user.bank), tax=Math.floor(level.salary*0.01);
      let net=level.salary-tax;
      db.prepare('UPDATE users SET last_salary=?, reputation=MIN(100,reputation+1) WHERE id=?').run(Date.now(),msg.author.id);
      db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(tax);
      net=slaveCut(msg.author.id, net, 'الراتب');
      db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(net, msg.author.id);
      const slaveRec=db.prepare('SELECT * FROM slaves WHERE slave_id=?').get(msg.author.id);
      return msg.reply({embeds:[new EmbedBuilder().setTitle('💰 تم استلام الراتب!').setColor('#00ff88')
        .addFields({name:'📥 الراتب',value:fmt(level.salary),inline:true},{name:'⚖️ ضريبة 1%',value:fmt(tax),inline:true},{name:'✅ الصافي',value:fmt(net),inline:true})
        .setFooter({text:slaveRec?'⛓️ -20% لمالكك | ⭐ +1 سمعة':'⭐ +1 سمعة | الراتب القادم بعد ساعة'})]});
    }

    // عمل
    if (cmd==='عمل') {
      const left=cooldownLeft(user,'عمل'); if(left>0) return msg.reply(`⏰ تعب! ارجع بعد **${fmtTime(left)}**`);
      const level=getLevel(user.balance+user.bank);
      let earned=Math.floor(level.salary*0.3+Math.random()*level.salary*0.4);
      const jobs=['🔨 عمل في البناء','💻 برمج موقع','🚗 وصّل طلبيات','📦 رتّب مستودع','🍳 طبخ في مطعم','🌿 شغل في المزرعة','🔧 صيانة سيارات'];
      db.prepare('UPDATE users SET last_work=?, reputation=MIN(100,reputation+1) WHERE id=?').run(Date.now(),msg.author.id);
      earned=slaveCut(msg.author.id, earned, 'العمل');
      db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(earned, msg.author.id);
      const slaveRec=db.prepare('SELECT * FROM slaves WHERE slave_id=?').get(msg.author.id);
      return msg.reply({embeds:[new EmbedBuilder().setTitle(jobs[Math.floor(Math.random()*jobs.length)]).setColor('#ffd700')
        .setDescription(`عملت وكسبت **${fmt(earned)}**!`)
        .setFooter({text:slaveRec?'⛓️ -20% لمالكك | ⭐ +1 سمعة':'⭐ +1 سمعة | ارجع كل ساعة'})]});
    }

    // تحويل
    if (cmd==='تحويل') {
      const target=msg.mentions.users.first(), amount=parseAmount(args[1],user.balance);
      if(!target||isNaN(amount)||amount<=0) return msg.reply('❌ الاستخدام: `تحويل @شخص المبلغ`');
      if(target.id===msg.author.id) return msg.reply('❌ ما تقدر تحوّل لنفسك!');
      const transLeft=Math.max(0,TRANSFER_COOLDOWN-(Date.now()-(user.last_transfer||0)));
      if(transLeft>0) return msg.reply(`⏰ التحويل القادم بعد **${fmtTime(transLeft)}**`);
      const maxTransfer=Math.floor((user.balance+user.bank)*0.50);
      if(amount>maxTransfer) return msg.reply(`❌ الحد الأقصى: **${fmt(maxTransfer)}** (50% من ثروتك)`);
      if(user.balance<amount) return msg.reply('❌ رصيدك ما يكفي!');
      const fee=Math.max(1,Math.floor(amount*0.02)), received=amount-fee;
      db.prepare('UPDATE users SET balance=balance-?, last_transfer=? WHERE id=?').run(amount,Date.now(),msg.author.id);
      getUser(target.id,target.username);
      db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(received,target.id);
      db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(fee);
      try { client.users.fetch(target.id).then(u=>u.send(`💸 **تحويل جديد!**\n**${msg.author.username}** حوّل لك **${fmt(received)}** 💰`).catch(()=>{})).catch(()=>{}); } catch(e){}
      return msg.reply({embeds:[new EmbedBuilder().setTitle('✅ تم التحويل').setColor('#00ff88')
        .addFields({name:'📤 المرسل',value:msg.author.username,inline:true},{name:'📥 المستلم',value:target.username,inline:true},{name:'💰 المبلغ',value:fmt(amount),inline:true},{name:'💸 رسوم 2%',value:fmt(fee),inline:true},{name:'✅ وصل',value:fmt(received),inline:true})
        .setFooter({text:'التحويل القادم بعد ساعة'})]});
    }

    // إيداع / سحب
    if (cmd==='إيداع'||cmd==='ايداع') {
      const amount=parseAmount(args[0],user.balance);
      if(isNaN(amount)||amount<=0) return msg.reply('❌ الاستخدام: `إيداع [مبلغ/كل/نص/ربع/ثلث]`');
      if(user.balance<amount) return msg.reply('❌ رصيدك ما يكفي!');
      db.prepare('UPDATE users SET balance=balance-?, bank=bank+? WHERE id=?').run(amount,amount,msg.author.id);
      return msg.reply({embeds:[new EmbedBuilder().setTitle('🏦 تم الإيداع').setColor('#00ff88').setDescription(`أودعت **${fmt(amount)}** في البنك`)]});
    }
    if (cmd==='سحب') {
      const amount=parseAmount(args[0],user.bank);
      if(isNaN(amount)||amount<=0) return msg.reply('❌ الاستخدام: `سحب [مبلغ/كل/نص/ربع/ثلث]`');
      if(user.bank<amount) return msg.reply('❌ رصيد البنك ما يكفي!');
      db.prepare('UPDATE users SET bank=bank-?, balance=balance+? WHERE id=?').run(amount,amount,msg.author.id);
      return msg.reply({embeds:[new EmbedBuilder().setTitle('💰 تم السحب').setColor('#00ff88').setDescription(`سحبت **${fmt(amount)}** من البنك`)]});
    }

    // مناجم
    if (cmd==='مناجم') { const {embed,totalPages}=buildMinesEmbed(0); return msg.reply({embeds:[embed],components:[buildPageButtons(0,totalPages,'mines')]}); }

    // شراء
    if (cmd==='شراء') {
      const type=args[0], itemId=args[1]?.toLowerCase();
      if (type==='شخص') {
        const target=msg.mentions.users.first(), amount=parseAmount(args[2],user.balance);
        if(!target||isNaN(amount)||amount<=0) return msg.reply('❌ الاستخدام: `شراء شخص @شخص مبلغ`');
        if(target.id===msg.author.id) return msg.reply('❌ ما تقدر تشتري نفسك!');
        if(db.prepare('SELECT * FROM slaves WHERE slave_id=?').get(target.id)) return msg.reply('❌ هذا الشخص مملوك بالفعل!');
        if(user.balance<amount) return msg.reply(`❌ رصيدك ما يكفي!`);
        getUser(target.id,target.username);
        db.prepare('UPDATE users SET balance=balance-? WHERE id=?').run(amount,msg.author.id);
        db.prepare('INSERT OR REPLACE INTO slaves (slave_id,owner_id,buy_price) VALUES (?,?,?)').run(target.id,msg.author.id,amount);
        try { client.users.fetch(target.id).then(u=>u.send(`⛓️ **تم شراؤك!**\n**${msg.author.username}** اشتراك بـ **${fmt(amount)}**\nيأخذ 20% من كل أرباحك.\nللتحرر: \`تحرير\` وادفع **${fmt(amount*2)}**`).catch(()=>{})).catch(()=>{}); } catch(e){}
        return msg.reply({embeds:[new EmbedBuilder().setTitle('⛓️ تم الشراء!').setColor('#ff6b35')
          .addFields({name:'👤 المشترى',value:target.username,inline:true},{name:'💰 السعر',value:fmt(amount),inline:true},{name:'📊 نسبة الأرباح',value:'20% من كل شيء',inline:false},{name:'🔓 للتحرر',value:`${fmt(amount*2)}`,inline:false})
          .setFooter({text:'ما يقدر يتحرر إلا بالدفع!'})]});
      }
      if (type==='صندوق') {
        const boxType=args[1];
        const box=LOOT_BOXES[boxType];
        if(!box) return msg.reply(`❌ الأنواع المتاحة: ${Object.keys(LOOT_BOXES).map(k=>`\`${k}\``).join(' | ')}`);
        const lootLeft=Math.max(0,5*60*60*1000-(Date.now()-(user.last_lootbox||0)));
        if(lootLeft>0) return msg.reply(`⏰ تقدر تشتري صندوق جديد بعد **${fmtTime(lootLeft)}**`);
        if(user.balance<box.price) return msg.reply(`❌ تحتاج **${fmt(box.price)}** لفتح صندوق ${boxType}`);
        db.prepare('UPDATE users SET balance=balance-? WHERE id=?').run(box.price,msg.author.id);
        const prize=rollPrize(box.prizes);
        let gained=0;
        if(prize.type==='money'){
          gained=prize.value;
          db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(gained,msg.author.id);
        } else if(prize.type==='protection'){
          const until=Date.now()+prize.value*3600000;
          db.prepare('UPDATE users SET protection_until=? WHERE id=?').run(until,msg.author.id);
        }
        db.prepare('INSERT INTO loot_boxes (user_id,box_type,prize,prize_value) VALUES (?,?,?,?)').run(msg.author.id,boxType,prize.name,prize.value);
        db.prepare('UPDATE users SET last_lootbox=? WHERE id=?').run(Date.now(),msg.author.id);
        const profit=gained-box.price;
        return msg.reply({embeds:[new EmbedBuilder().setTitle(`${box.emoji} فتحت صندوق ${boxType}!`).setColor(box.color)
          .addFields(
            {name:'🎁 الجائزة',value:prize.name,inline:true},
            {name:'💰 القيمة',value:prize.type==='money'?fmt(prize.value):`حماية ${prize.value} ساعة`,inline:true},
            {name:profit>=0?'📈 ربح':'📉 خسارة',value:fmt(Math.abs(profit)),inline:true},
          ).setFooter({text:`دفعت ${fmt(box.price)} | ${profit>=0?'مبروك!':'حظاً أوفر المرة القادمة!'}`})]});
      }
      if (type==='منجم') {
        if(!itemId) return msg.reply('❌ الاستخدام: `شراء منجم [id]`');
        const mine=MINES_LIST.find(m=>m.id===itemId);
        if(!mine) return msg.reply('❌ ID غير صحيح! اكتب `مناجم`');
        if(db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id)) return msg.reply('❌ عندك منجم! بيع منجمك أولاً');
        const mineCooldown=Math.max(0,2*60*60*1000-(Date.now()-(user.mine_sold_at||0)));
        if(mineCooldown>0) return msg.reply(`⏰ انتظر **${fmtTime(mineCooldown)}** قبل شراء منجم جديد!`);
        if(user.balance<mine.price) return msg.reply(`❌ تحتاج **${fmt(mine.price)}**`);
        db.prepare('UPDATE users SET balance=balance-?, reputation=MIN(100,reputation+2) WHERE id=?').run(mine.price,msg.author.id);
        db.prepare('INSERT INTO user_mines (owner_id,mine_id,last_mined) VALUES (?,?,0)').run(msg.author.id,mine.id);
        return msg.reply({embeds:[new EmbedBuilder().setTitle(`✅ اشتريت ${mine.name}!`).setColor('#00ff88')
          .addFields({name:'💰 السعر',value:fmt(mine.price),inline:true},{name:'📦 التخزين',value:`${mine.maxStorage} وحدة`,inline:true},{name:'⏰ التعدين',value:'كل 3 ساعات',inline:true},{name:'💎 الموارد',value:mine.resources.map(r=>`${r.emoji} ${r.name} (${r.chance}%) — ${fmt(r.value)}`).join('\n')})
          .setFooter({text:'⭐ +2 سمعة | اكتب: تعدين للبدء!'})]});
      }
      return msg.reply('❌ الاستخدام: `شراء منجم [id]` | `شراء شخص @شخص مبلغ` | `شراء صندوق [عادي/فضي/ذهبي/أسطوري]`');
    }

    // صناديق (عرض)
    if (cmd==='صناديق') {
      const desc=Object.entries(LOOT_BOXES).map(([name,box])=>{
        const maxPrize=Math.max(...box.prizes.map(p=>p.value));
        return `${box.emoji} **${name}** — 💰 ${fmt(box.price)} | 🏆 أعلى جائزة: ${fmt(maxPrize)}`;
      }).join('\n');
      return msg.reply({embeds:[new EmbedBuilder().setTitle('🎁 صناديق الحظ').setColor('#9b59b6')
        .setDescription(desc).setFooter({text:'شراء صندوق [عادي/فضي/ذهبي/أسطوري]'})]});
    }

    // تحرير
    if (cmd==='تحرير') {
      const slaveRec=db.prepare('SELECT * FROM slaves WHERE slave_id=?').get(msg.author.id);
      if(!slaveRec) return msg.reply('✅ أنت حر أصلاً!');
      const freedomPrice=slaveRec.buy_price*2;
      if(user.balance<freedomPrice) return msg.reply(`❌ تحتاج **${fmt(freedomPrice)}** للتحرر!\nرصيدك: **${fmt(user.balance)}**`);
      db.prepare('UPDATE users SET balance=balance-? WHERE id=?').run(freedomPrice,msg.author.id);
      db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(freedomPrice,slaveRec.owner_id);
      db.prepare('DELETE FROM slaves WHERE slave_id=?').run(msg.author.id);
      const ownerName=db.prepare('SELECT username FROM users WHERE id=?').get(slaveRec.owner_id)?.username||'المالك';
      try { client.users.fetch(slaveRec.owner_id).then(o=>o.send(`🔓 **عبدك تحرر!**\n**${msg.author.username}** دفع **${fmt(freedomPrice)}** وتحرر!`).catch(()=>{})).catch(()=>{}); } catch(e){}
      return msg.reply({embeds:[new EmbedBuilder().setTitle('🕊️ أنت حر الآن!').setColor('#00ff88').setDescription(`دفعت **${fmt(freedomPrice)}** لـ **${ownerName}** وتحررت! 🎉`)]});
    }

    // عبيدي
    if (cmd==='عبيدي') {
      const mySlaves=db.prepare('SELECT * FROM slaves WHERE owner_id=?').all(msg.author.id);
      if(mySlaves.length===0) return msg.reply('👥 ليس لديك عبيد!');
      const desc=mySlaves.map(s=>{const n=db.prepare('SELECT username FROM users WHERE id=?').get(s.slave_id);return `• **${n?.username||s.slave_id}** — ${fmt(s.buy_price)} | للتحرر: ${fmt(s.buy_price*2)}`;}).join('\n');
      return msg.reply({embeds:[new EmbedBuilder().setTitle(`⛓️ عبيدي — ${mySlaves.length}`).setColor('#ff6b35').setDescription(desc).setFooter({text:'تأخذ 20% من كل أرباحهم'})]});
    }

    // بيع
    if (cmd==='بيع') {
      if (args[0]==='مورد' && args[1]==='كل' && args.length===2) {
        const inv=db.prepare('SELECT * FROM mine_inventory WHERE owner_id=? AND quantity>0').all(msg.author.id);
        if(inv.length===0) return msg.reply('📦 مستودعك فارغ!');
        let total=0;
        for(const i of inv){total+=i.quantity*i.unit_value;db.prepare('UPDATE mine_inventory SET quantity=0 WHERE owner_id=? AND resource_name=?').run(msg.author.id,i.resource_name);}
        db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(total,msg.author.id);
        return msg.reply({embeds:[new EmbedBuilder().setTitle('💰 تم بيع كل الموارد!').setColor('#00ff88').addFields({name:'📦 الأنواع',value:`${inv.length}`,inline:true},{name:'💰 الإجمالي',value:fmt(total),inline:true})]});
      }
      if (args[0]==='منجم') {
        const myMine=db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
        if(!myMine) return msg.reply('❌ ليس لديك منجم!');
        const mine=MINES_LIST.find(m=>m.id===myMine.mine_id), sellPrice=Math.floor(mine.price*0.70);
        db.prepare('DELETE FROM user_mines WHERE owner_id=?').run(msg.author.id);
        db.prepare('DELETE FROM mine_inventory WHERE owner_id=?').run(msg.author.id);
        db.prepare('UPDATE users SET balance=balance+?, mine_sold_at=? WHERE id=?').run(sellPrice,Date.now(),msg.author.id);
        return msg.reply({embeds:[new EmbedBuilder().setTitle(`💸 تم بيع ${mine.name}`).setColor('#ffd700')
          .addFields({name:'💰 سعر الشراء',value:fmt(mine.price),inline:true},{name:'✅ استلمت 70%',value:fmt(sellPrice),inline:true})
          .setFooter({text:'⚠️ تم حذف الموارد! انتظر ساعتين قبل شراء منجم جديد'})]});
      }
      if (args[0]==='مورد') {
        if(args.length<3) return msg.reply('❌ الاستخدام: `بيع مورد [اسم] [كمية/كل]`');
        const qtyArg=args[args.length-1], resourceName=args.slice(1,args.length-1).join(' ');
        const stored=db.prepare('SELECT * FROM mine_inventory WHERE owner_id=? AND resource_name=?').get(msg.author.id,resourceName);
        if(!stored||stored.quantity<=0) return msg.reply(`❌ ما عندك **${resourceName}**!\nاكتب \`مستودعي\``);
        const qty=qtyArg==='كل'?stored.quantity:parseInt(qtyArg);
        if(isNaN(qty)||qty<=0||qty>stored.quantity) return msg.reply(`❌ كمية غير صحيحة! عندك ${stored.quantity}`);
        const earned=qty*stored.unit_value;
        db.prepare('UPDATE mine_inventory SET quantity=quantity-? WHERE owner_id=? AND resource_name=?').run(qty,msg.author.id,resourceName);
        db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(earned,msg.author.id);
        return msg.reply({embeds:[new EmbedBuilder().setTitle('💰 تم بيع المورد!').setColor('#00ff88').addFields({name:'📦 المورد',value:`${qty}x ${resourceName}`,inline:true},{name:'💰 الربح',value:fmt(earned),inline:true})]});
      }
      return msg.reply('❌ الاستخدام: `بيع منجم` | `بيع مورد كل` | `بيع مورد [اسم] [كمية]`');
    }

    // تعدين
    if (cmd==='تعدين') {
      const myMine=db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
      if(!myMine) return msg.reply('❌ ليس لديك منجم! اكتب `مناجم`');
      const now=Date.now(), elapsed=now-(myMine.last_mined||0), left=Math.max(0,MINE_COOLDOWN-elapsed);
      if(left>0) return msg.reply(`⏰ ارجع بعد **${fmtTime(left)}**`);
      const mine=MINES_LIST.find(m=>m.id===myMine.mine_id);
      const units=Math.min(Math.max(1,Math.floor(elapsed/MINE_COOLDOWN)),mine.maxStorage);
      const roll=Math.random()*100; let cum=0, res=mine.resources[0];
      for(const r of mine.resources){cum+=r.chance;if(roll<=cum){res=r;break;}}
      const stored=db.prepare('SELECT * FROM mine_inventory WHERE owner_id=? AND resource_name=?').get(msg.author.id,res.name);
      const curQty=stored?stored.quantity:0, actual=Math.min(units,mine.maxStorage-curQty);
      if(actual<=0) return msg.reply(`⚠️ مستودع **${res.name}** ممتلئ!`);
      if(stored){db.prepare('UPDATE mine_inventory SET quantity=quantity+? WHERE owner_id=? AND resource_name=?').run(actual,msg.author.id,res.name);}
      else{db.prepare('INSERT INTO mine_inventory (owner_id,resource_name,quantity,unit_value) VALUES (?,?,?,?)').run(msg.author.id,res.name,actual,res.value);}
      db.prepare('UPDATE user_mines SET last_mined=? WHERE owner_id=?').run(now,msg.author.id);
      return msg.reply({embeds:[new EmbedBuilder().setTitle('⛏️ نتيجة التعدين!').setColor('#8B4513')
        .addFields({name:'🏔 المنجم',value:mine.name,inline:true},{name:`${res.emoji} المورد`,value:res.name,inline:true},{name:'📦 الكمية',value:`${actual} وحدة`,inline:true},{name:'💰 القيمة',value:fmt(actual*res.value),inline:true},{name:'📊 المستودع',value:`${curQty+actual}/${mine.maxStorage}`,inline:true})
        .setFooter({text:'مستودعي | بيع مورد [اسم] [كمية/كل] | بيع مورد كل'})]});
    }

    // مستودعي
    if (cmd==='مستودعي') {
      const inv=db.prepare('SELECT * FROM mine_inventory WHERE owner_id=? AND quantity>0').all(msg.author.id);
      if(inv.length===0) return msg.reply('📦 مستودعك فارغ!');
      const myMine=db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
      const mine=myMine?MINES_LIST.find(m=>m.id===myMine.mine_id):null;
      const totVal=inv.reduce((s,i)=>s+(i.quantity*i.unit_value),0);
      return msg.reply({embeds:[new EmbedBuilder().setTitle(`📦 مستودع ${msg.author.username}`).setColor('#8B4513')
        .setDescription(inv.map(i=>`${mine?.resources.find(r=>r.name===i.resource_name)?.emoji||'📦'} **${i.resource_name}**: ${i.quantity} — ${fmt(i.quantity*i.unit_value)}`).join('\n'))
        .addFields({name:'💰 إجمالي القيمة',value:fmt(totVal)}).setFooter({text:'بيع مورد كل — لبيع كل شيء دفعة واحدة'})]});
    }

    // مناجمي
    if (cmd==='مناجمي') {
      const myMine=db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
      if(!myMine) return msg.reply('❌ ليس لديك منجم!');
      const mine=MINES_LIST.find(m=>m.id===myMine.mine_id), left=Math.max(0,MINE_COOLDOWN-(Date.now()-(myMine.last_mined||0)));
      const inv=db.prepare('SELECT * FROM mine_inventory WHERE owner_id=? AND quantity>0').all(msg.author.id);
      return msg.reply({embeds:[new EmbedBuilder().setTitle(`⛏️ منجمك — ${mine.name}`).setColor('#8B4513')
        .addFields({name:'💰 السعر',value:fmt(mine.price),inline:true},{name:'📦 التخزين',value:`${mine.maxStorage} وحدة`,inline:true},{name:'⏰ القادم',value:left>0?fmtTime(left):'✅ جاهز!',inline:true},{name:'📊 المستودع',value:inv.length>0?inv.map(i=>`${i.resource_name}: ${i.quantity}`).join(' | '):'فارغ'},{name:'💰 قيمة المستودع',value:fmt(inv.reduce((s,i)=>s+(i.quantity*i.unit_value),0)),inline:true})
        .setFooter({text:'بيع منجم — لبيع بـ 70%'})]});
    }

    // قرض / سداد
    if (cmd==='قرض') {
      const amount=parseAmount(args[0]);
      if(isNaN(amount)||amount<=0) return msg.reply('❌ الاستخدام: `قرض المبلغ`');
      if(user.loan>0) return msg.reply('❌ عندك قرض! سدده أولاً');
      if(amount>20_000) return msg.reply(`❌ الحد الأقصى: **${fmt(20_000)}**`);
      const repay=Math.floor(amount*1.10), due=Date.now()+7*24*60*60*1000;
      db.prepare('UPDATE users SET balance=balance+?, loan=?, loan_due=? WHERE id=?').run(amount,repay,due,msg.author.id);
      return msg.reply({embeds:[new EmbedBuilder().setTitle('🏦 تم منح القرض').setColor('#ffd700').addFields({name:'💰 استلمت',value:fmt(amount),inline:true},{name:'💸 للسداد +10%',value:fmt(repay),inline:true},{name:'⏰ المهلة',value:'7 أيام',inline:true}).setFooter({text:'⚠️ عدم السداد يؤدي لمصادرة أموالك!'})]});
    }
    if (cmd==='سداد') {
      if(user.loan===0) return msg.reply('✅ ليس عليك أي قرض!');
      if(user.balance<user.loan) return msg.reply(`❌ تحتاج **${fmt(user.loan)}**`);
      const loan=user.loan;
      db.prepare('UPDATE users SET balance=balance-?, loan=0, loan_due=0, reputation=MIN(100,reputation+5) WHERE id=?').run(loan,msg.author.id);
      db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(Math.floor(loan*0.1));
      return msg.reply({embeds:[new EmbedBuilder().setTitle('✅ تم سداد القرض!').setColor('#00ff88').setDescription(`سددت **${fmt(loan)}** بنجاح! 🎉\n⭐ +5 سمعة!`)]});
    }

    // حماية
    if (cmd==='حماية') {
      const opts={'6':{hours:6,price:5_000},'12':{hours:12,price:9_000},'24':{hours:24,price:15_000},'72':{hours:72,price:35_000}};
      const opt=opts[args[0]];
      if(!opt) return msg.reply('❌ الاستخدام: `حماية 6/12/24/72`\n6س=5K | 12س=9K | 24س=15K | 3أيام=35K');
      if(user.balance<opt.price) return msg.reply(`❌ تحتاج **${fmt(opt.price)}**`);
      const until=Date.now()+opt.hours*3600000;
      db.prepare('UPDATE users SET balance=balance-?, protection_until=? WHERE id=?').run(opt.price,until,msg.author.id);
      return msg.reply({embeds:[new EmbedBuilder().setTitle('🛡 تم تفعيل الحماية!').setColor('#00ff88').addFields({name:'⏰ المدة',value:`${opt.hours} ساعة`,inline:true},{name:'💰 التكلفة',value:fmt(opt.price),inline:true},{name:'🕐 تنتهي',value:`<t:${Math.floor(until/1000)}:R>`,inline:true})]});
    }

    // مجازفة
    if (cmd==='مجازفة') {
      const left=cooldownLeft(user,'مجازفة'); if(left>0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);
      const amount=parseAmount(args[0],user.balance);
      if(isNaN(amount)||amount<100) return msg.reply('❌ الاستخدام: `مجازفة [مبلغ/نص/ربع/كل]` (الحد الأدنى 100)');
      if(user.balance<amount) return msg.reply('❌ رصيدك ما يكفي!');
      const win=Math.random()>0.5;
      db.prepare('UPDATE users SET last_gamble=? WHERE id=?').run(Date.now(),msg.author.id);
      if(win){let gain=slaveCut(msg.author.id,amount,'المجازفة');db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(gain,msg.author.id);return msg.reply({embeds:[new EmbedBuilder().setTitle('🎉 ربحت!').setColor('#00ff88').addFields({name:'🎲',value:'✅ فزت',inline:true},{name:'💰 الربح',value:fmt(gain),inline:true},{name:'💳 الرصيد',value:fmt(user.balance+gain),inline:true})]});}
      else{db.prepare('UPDATE users SET balance=MAX(0,balance-?) WHERE id=?').run(amount,msg.author.id);return msg.reply({embeds:[new EmbedBuilder().setTitle('😭 خسرت!').setColor('#e74c3c').addFields({name:'🎲',value:'❌ خسرت',inline:true},{name:'💰 الخسارة',value:fmt(amount),inline:true},{name:'💳 الرصيد',value:fmt(Math.max(0,user.balance-amount)),inline:true})]});}
    }

    // استثمر
    if (cmd==='استثمر') {
      const left=cooldownLeft(user,'استثمر'); if(left>0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);
      const amount=parseAmount(args[0],user.balance), riskKey=args[1]||'منخفض';
      if(isNaN(amount)||amount<1000) return msg.reply('❌ الاستخدام: `استثمر [مبلغ] [منخفض/متوسط/عالي]`');
      if(user.balance<amount) return msg.reply('❌ رصيدك ما يكفي!');
      const risks={منخفض:{winChance:0.80,minG:0.10,maxG:0.30,maxL:0.05},متوسط:{winChance:0.60,minG:0.20,maxG:0.60,maxL:0.25},عالي:{winChance:0.45,minG:0.50,maxG:1.50,maxL:0.40}};
      const cfg=risks[riskKey]||risks['منخفض'], win=Math.random()<cfg.winChance;
      db.prepare('UPDATE users SET last_invest=? WHERE id=?').run(Date.now(),msg.author.id);
      if(win){let gain=Math.floor(amount*(cfg.minG+Math.random()*(cfg.maxG-cfg.minG)));gain=slaveCut(msg.author.id,gain,'الاستثمار');db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(gain,msg.author.id);return msg.reply({embeds:[new EmbedBuilder().setTitle('📈 استثمار ناجح!').setColor('#00ff88').addFields({name:'💰 المستثمر',value:fmt(amount),inline:true},{name:'📈 الربح',value:fmt(gain),inline:true},{name:'💳 الرصيد',value:fmt(user.balance+gain),inline:true})]});}
      else{const loss=Math.floor(amount*cfg.maxL);db.prepare('UPDATE users SET balance=MAX(0,balance-?) WHERE id=?').run(loss,msg.author.id);return msg.reply({embeds:[new EmbedBuilder().setTitle('📉 خسارة!').setColor('#e74c3c').addFields({name:'💰 المستثمر',value:fmt(amount),inline:true},{name:'📉 الخسارة',value:fmt(loss),inline:true},{name:'💳 الرصيد',value:fmt(Math.max(0,user.balance-loss)),inline:true})]});}
    }

    // تداول
    if (cmd==='تداول') {
      const left=cooldownLeft(user,'تداول'); if(left>0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);
      const amount=parseAmount(args[0],user.balance);
      if(isNaN(amount)||amount<5000) return msg.reply('❌ الاستخدام: `تداول [مبلغ]` (الحد الأدنى 5000)');
      if(user.balance<amount) return msg.reply('❌ رصيدك ما يكفي!');
      const roll=Math.random(); let rawChange, result;
      if(roll>0.7){rawChange=Math.floor(amount*(0.5+Math.random()));result='📈 موجة صعود!';}
      else if(roll>0.4){rawChange=Math.floor(amount*0.1*Math.random());result='📊 ارتفاع بسيط';}
      else if(roll>0.15){rawChange=-Math.floor(amount*0.2*Math.random());result='📉 تراجع طفيف';}
      else{rawChange=-Math.floor(amount*(0.3+Math.random()*0.4));result='💥 انهيار!';}
      db.prepare('UPDATE users SET last_trade=? WHERE id=?').run(Date.now(),msg.author.id);
      if(rawChange>0){let gain=slaveCut(msg.author.id,rawChange,'التداول');db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(gain,msg.author.id);return msg.reply({embeds:[new EmbedBuilder().setTitle(`📊 ${result}`).setColor('#00ff88').addFields({name:'💰 المبلغ',value:fmt(amount),inline:true},{name:'📈 ربح',value:fmt(gain),inline:true},{name:'💳 الرصيد',value:fmt(user.balance+gain),inline:true})]});}
      else{const loss=Math.abs(rawChange);db.prepare('UPDATE users SET balance=MAX(0,balance-?) WHERE id=?').run(loss,msg.author.id);return msg.reply({embeds:[new EmbedBuilder().setTitle(`📊 ${result}`).setColor('#e74c3c').addFields({name:'💰 المبلغ',value:fmt(amount),inline:true},{name:'📉 خسارة',value:fmt(loss),inline:true},{name:'💳 الرصيد',value:fmt(Math.max(0,user.balance-loss)),inline:true})]});}
    }

    // سرقة
    if (cmd==='سرقة') {
      const left=cooldownLeft(user,'سرقة'); if(left>0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);
      const target=msg.mentions.users.first();
      if(!target) return msg.reply('❌ الاستخدام: `سرقة @شخص`');
      if(target.id===msg.author.id) return msg.reply('❌ ما تقدر تسرق نفسك!');
      const victim=db.prepare('SELECT * FROM users WHERE id=?').get(target.id);
      if(!victim||victim.balance<500) return msg.reply('😅 الضحية فقيرة!');
      if(victim.protection_until>Date.now()){db.prepare('UPDATE users SET reputation=MAX(0,reputation-5) WHERE id=?').run(msg.author.id);return msg.reply(`🛡 **${target.username}** محمي! -5 سمعة!`);}
      const success=Math.random()>0.45;
      db.prepare('UPDATE users SET last_rob=? WHERE id=?').run(Date.now(),msg.author.id);
      if(success){
        let stolen=Math.floor(Math.random()*victim.balance*0.15)+100;
        stolen=slaveCut(msg.author.id,stolen,'السرقة');
        db.prepare('UPDATE users SET balance=balance+?,reputation=MAX(0,reputation-10) WHERE id=?').run(stolen,msg.author.id);
        db.prepare('UPDATE users SET balance=MAX(0,balance-?) WHERE id=?').run(Math.floor(Math.random()*victim.balance*0.15)+100,target.id);
        db.prepare('INSERT INTO rob_log (robber_id,victim_id,amount) VALUES (?,?,?)').run(msg.author.id,target.id,stolen);
        try { client.users.fetch(target.id).then(u=>u.send(`🦹 **تم سرقتك!**\n**${msg.author.username}** سرق منك **${fmt(stolen)}**!`).catch(()=>{})).catch(()=>{}); } catch(e){}
        return msg.reply({embeds:[new EmbedBuilder().setTitle('🦹 نجحت السرقة!').setColor('#ffd700').setDescription(`سرقت **${fmt(stolen)}** من ${target.username}!`).setFooter({text:'⚠️ -10 سمعة'})]});
      } else {
        const fine=Math.floor(user.balance*0.10);
        db.prepare('UPDATE users SET balance=MAX(0,balance-?),reputation=MAX(0,reputation-15) WHERE id=?').run(fine,msg.author.id);
        db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(fine);
        return msg.reply({embeds:[new EmbedBuilder().setTitle('👮 تم القبض عليك!').setColor('#e74c3c').setDescription(`دفعت **${fmt(fine)}** غرامة و -15 سمعة!`)]});
      }
    }

    // رحلة استثمارية
    if (cmd==='رحلة') {
      const amount=parseAmount(args[0],user.balance);
      if(isNaN(amount)||amount<10_000) return msg.reply('❌ الاستخدام: `رحلة [مبلغ] [اسم الدولة]`\nاكتب `دول` لعرض الدول المتاحة');
      if(user.balance<amount) return msg.reply('❌ رصيدك ما يكفي!');
      const existing=db.prepare("SELECT * FROM trips WHERE user_id=? AND notified=0").get(msg.author.id);
      if(existing){const left=Math.max(0,existing.ends_at-Date.now());return msg.reply(`⏰ عندك رحلة نشطة! تنتهي بعد **${fmtTime(left)}**\nاكتب \`نتيجة_رحلة\` بعد انتهائها`);}
      // تحديد الدولة
      const countryName=args.slice(1).join(' ');
      const country=countryName?TRIP_COUNTRIES.find(c=>c.name.includes(countryName)):TRIP_COUNTRIES[Math.floor(Math.random()*TRIP_COUNTRIES.length)];
      if(countryName&&!country) return msg.reply(`❌ دولة غير موجودة! اكتب \`دول\` لعرض الدول`);
      const selectedCountry=country||TRIP_COUNTRIES[0];
      // النتائج حسب مستوى الخطورة
      const riskProfiles={
        منخفض: [{r:'كارثة',p:-0.30,c:5},{r:'خسارة',p:-0.10,c:20},{r:'عادي',p:0.03,c:35},{r:'جيد',p:0.15,c:25},{r:'ممتاز',p:0.35,c:12},{r:'استثنائي',p:0.70,c:3}],
        متوسط: [{r:'كارثة',p:-0.40,c:8},{r:'خسارة',p:-0.15,c:20},{r:'عادي',p:0.04,c:27},{r:'جيد',p:0.20,c:25},{r:'ممتاز',p:0.50,c:13},{r:'استثنائي',p:1.00,c:7}],
        عالي:  [{r:'كارثة',p:-0.60,c:15},{r:'خسارة',p:-0.25,c:20},{r:'عادي',p:0.05,c:20},{r:'جيد',p:0.30,c:20},{r:'ممتاز',p:0.80,c:15},{r:'استثنائي',p:1.50,c:10}],
        خطر:   [{r:'كارثة',p:-1.00,c:40},{r:'خسارة',p:-0.50,c:20},{r:'عادي',p:0.10,c:10},{r:'جيد',p:0.50,c:10},{r:'ممتاز',p:1.20,c:10},{r:'استثنائي',p:3.00,c:10}],
      };
      const profile=riskProfiles[selectedCountry.risk]||riskProfiles['متوسط'];
      const totalChance=profile.reduce((s,p)=>s+p.c,0);
      let r2=Math.random()*totalChance, cum2=0, chosen=profile[0];
      for(const p of profile){cum2+=p.c;if(r2<=cum2){chosen=p;break;}}
      const profit=Math.floor(amount*chosen.p*selectedCountry.bonus);
      const endsAt=Date.now()+3*60*60*1000;
      db.prepare('UPDATE users SET balance=balance-? WHERE id=?').run(amount,msg.author.id);
      db.prepare('INSERT INTO trips (user_id,amount,country,result,profit,started_at,ends_at) VALUES (?,?,?,?,?,?,?)').run(msg.author.id,amount,selectedCountry.name,chosen.r,profit,Date.now(),endsAt);
      return msg.reply({embeds:[new EmbedBuilder().setTitle(`✈️ انطلقت إلى ${selectedCountry.name}!`).setColor('#3498db')
        .addFields(
          {name:'💰 المستثمر',value:fmt(amount),inline:true},{name:'⚠️ مستوى الخطر',value:selectedCountry.risk,inline:true},{name:'📝 وصف',value:selectedCountry.desc,inline:false},
          {name:'⏰ تنتهي بعد',value:'3 ساعات',inline:true},{name:'🕐 موعد الرجوع',value:`<t:${Math.floor(endsAt/1000)}:R>`,inline:true},
        ).setFooter({text:'اكتب: نتيجة_رحلة بعد 3 ساعات!'})]});
    }

    // دول
    if (cmd==='دول') {
      const desc=TRIP_COUNTRIES.map(c=>`${c.name} — ⚠️ ${c.risk} | 📝 ${c.desc}`).join('\n');
      return msg.reply({embeds:[new EmbedBuilder().setTitle('🌍 دول الاستثمار').setColor('#3498db')
        .setDescription(desc).setFooter({text:'رحلة [مبلغ] [اسم الدولة] — مثال: رحلة 50000 السعودية'})]});
    }

    // نتيجة رحلة
    if (cmd==='نتيجة_رحلة') {
      const trip=db.prepare("SELECT * FROM trips WHERE user_id=? AND notified=0").get(msg.author.id);
      if(!trip) return msg.reply('❌ ما عندك رحلة نشطة!');
      if(Date.now()<trip.ends_at) return msg.reply(`⏰ الرحلة ما رجعت بعد! ارجع بعد **${fmtTime(trip.ends_at-Date.now())}**`);
      db.prepare('UPDATE trips SET notified=1 WHERE id=?').run(trip.id);
      const finalProfit=trip.profit>0?slaveCut(msg.author.id,trip.profit,'الرحلة الاستثمارية'):trip.profit;
      const netReturn=trip.profit>=0?trip.amount+finalProfit:Math.max(0,trip.amount-Math.abs(trip.profit));
      db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(netReturn,msg.author.id);
      const colors={كارثة:'#e74c3c',خسارة:'#e67e22',عادي:'#95a5a6',جيد:'#2ecc71',ممتاز:'#00ff88',استثنائي:'#ffd700'};
      const emojis={كارثة:'💥',خسارة:'📉',عادي:'📊',جيد:'📈',ممتاز:'🚀',استثنائي:'🌟'};
      return msg.reply({embeds:[new EmbedBuilder().setTitle(`${emojis[trip.result]||'✈️'} رجعت من ${trip.country||'رحلتك'} — ${trip.result}!`).setColor(colors[trip.result]||'#3498db')
        .addFields({name:'💰 المستثمر',value:fmt(trip.amount),inline:true},{name:trip.profit>=0?'📈 الربح':'📉 الخسارة',value:fmt(Math.abs(trip.profit)),inline:true},{name:'💳 استلمت',value:fmt(netReturn),inline:true})
        .setFooter({text:'يمكنك إطلاق رحلة جديدة الآن!'})]});
    }

    // رحلتي
    if (cmd==='رحلتي') {
      const trip=db.prepare("SELECT * FROM trips WHERE user_id=? AND notified=0").get(msg.author.id);
      if(!trip) return msg.reply('✈️ ما عندك رحلة نشطة. اكتب `رحلة [مبلغ]` للبدء!');
      const left=Math.max(0,trip.ends_at-Date.now());
      return msg.reply({embeds:[new EmbedBuilder().setTitle('✈️ رحلتي الاستثمارية').setColor('#3498db')
        .addFields({name:'🌍 الوجهة',value:trip.country||'غير محدد',inline:true},{name:'💰 المستثمر',value:fmt(trip.amount),inline:true},{name:'⏰ الوضع',value:left<=0?'✅ وصلت! اكتب `نتيجة_رحلة`':`⏳ ${fmtTime(left)}`,inline:true})]});
    }

    // سمعة
    if (cmd==='سمعة') {
      const repLvl=getReputation(user.reputation), nextLvl=REPUTATION_LEVELS.find(r=>r.min>user.reputation);
      return msg.reply({embeds:[new EmbedBuilder().setTitle('⭐ نظام السمعة').setColor('#ffd700')
        .addFields(
          {name:'📊 سمعتك',value:`${user.reputation}/100 — ${repLvl.name}`},
          {name:'📈 كيف ترفع؟',value:['`راتب` — +1','`عمل` — +1','`سداد` — +5','`شراء منجم` — +2'].join('\n')},
          {name:'📉 كيف تنخفض؟',value:['سرقة ناجحة — -10','سرقة فاشلة — -15','محاولة سرقة محمي — -5'].join('\n')},
          {name:'🏷 المستويات',value:REPUTATION_LEVELS.map(r=>`${r.name}: ${r.min}–${r.max}`).join('\n')},
        ).setFooter({text:nextLvl?`تحتاج ${nextLvl.min-user.reputation} نقطة لـ ${nextLvl.name}`:'🎉 أعلى مستوى!'})]});
    }

    // متصدرون
    if (cmd==='متصدرون'||cmd==='ليدربورد') {
      const top=db.prepare('SELECT *,(balance+bank) as total FROM users ORDER BY total DESC LIMIT 10').all();
      const medals=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
      return msg.reply({embeds:[new EmbedBuilder().setTitle('🏆 أغنى المواطنين').setColor('#ffd700').setDescription(top.map((u,i)=>`${medals[i]} **${u.username}** — ${fmt(u.total)}`).join('\n')||'لا بيانات').setTimestamp()]});
    }

    // إحصائياتي
    if (['إحصائياتي','احصائياتي','احصاياتي','إحصاياتي'].includes(cmd)) {
      const level=getLevel(user.balance+user.bank), repLvl=getReputation(user.reputation);
      const myMine=db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
      const slaveRec=db.prepare('SELECT * FROM slaves WHERE slave_id=?').get(msg.author.id);
      const mySlaves=db.prepare('SELECT * FROM slaves WHERE owner_id=?').all(msg.author.id);
      return msg.reply({embeds:[new EmbedBuilder().setTitle(`📊 إحصائيات — ${msg.author.username}`).setColor('#9b59b6')
        .addFields(
          {name:'🏆 المستوى',value:level.name,inline:true},{name:'⭐ السمعة',value:`${user.reputation}/100 ${repLvl.name}`,inline:true},{name:'💰 الثروة',value:fmt(user.balance+user.bank),inline:true},
          {name:'⛏️ المنجم',value:myMine?MINES_LIST.find(m=>m.id===myMine.mine_id)?.name:'لا يوجد',inline:true},{name:'💳 قرض',value:user.loan>0?fmt(user.loan):'لا يوجد',inline:true},{name:'🛡 حماية',value:user.protection_until>Date.now()?`✅ ${fmtTime(user.protection_until-Date.now())}`:'❌',inline:true},
          {name:'⛓️ العبودية',value:slaveRec?'مملوك (-20%)':'حر 🕊️',inline:true},{name:'👥 عبيدي',value:`${mySlaves.length}`,inline:true},
        )]});
    }

    // الحكومة
    if (cmd==='الحكومة'||cmd==='بنك') {
      const gov=db.prepare('SELECT * FROM government WHERE id=1').get(), cnt=db.prepare('SELECT COUNT(*) as c FROM users').get().c;
      return msg.reply({embeds:[new EmbedBuilder().setTitle('🏛 البنك الحكومي').setColor('#e74c3c').addFields({name:'💰 الخزنة',value:fmt(gov.treasury),inline:true},{name:'👥 المواطنون',value:`${cnt}`,inline:true}).setTimestamp()]});
    }

    // وقت
    if (cmd==='وقت') {
      const myMine=db.prepare('SELECT * FROM user_mines WHERE owner_id=?').get(msg.author.id);
      const mineLeft=myMine?Math.max(0,MINE_COOLDOWN-(Date.now()-(myMine.last_mined||0))):-1;
      const tranLeft=Math.max(0,TRANSFER_COOLDOWN-(Date.now()-(user.last_transfer||0)));
      const fields=[
        {name:'💰 راتب',value:cooldownLeft(user,'راتب')>0?`⏰ ${fmtTime(cooldownLeft(user,'راتب'))}`:'✅ جاهز',inline:true},
        {name:'🔨 عمل',value:cooldownLeft(user,'عمل')>0?`⏰ ${fmtTime(cooldownLeft(user,'عمل'))}`:'✅ جاهز',inline:true},
        {name:'🎲 مجازفة',value:cooldownLeft(user,'مجازفة')>0?`⏰ ${fmtTime(cooldownLeft(user,'مجازفة'))}`:'✅ جاهز',inline:true},
        {name:'📈 استثمر',value:cooldownLeft(user,'استثمر')>0?`⏰ ${fmtTime(cooldownLeft(user,'استثمر'))}`:'✅ جاهز',inline:true},
        {name:'📊 تداول',value:cooldownLeft(user,'تداول')>0?`⏰ ${fmtTime(cooldownLeft(user,'تداول'))}`:'✅ جاهز',inline:true},
        {name:'🦹 سرقة',value:cooldownLeft(user,'سرقة')>0?`⏰ ${fmtTime(cooldownLeft(user,'سرقة'))}`:'✅ جاهز',inline:true},
        {name:'💸 تحويل',value:tranLeft>0?`⏰ ${fmtTime(tranLeft)}`:'✅ جاهز',inline:true},
      ];
      if(mineLeft>=0) fields.push({name:'⛏️ تعدين',value:mineLeft>0?`⏰ ${fmtTime(mineLeft)}`:'✅ جاهز',inline:true});
      const lootCooldown=Math.max(0,5*60*60*1000-(Date.now()-(user.last_lootbox||0)));
      fields.push({name:'🎁 صندوق',value:lootCooldown>0?`⏰ ${fmtTime(lootCooldown)}`:'✅ جاهز',inline:true});
      return msg.reply({embeds:[new EmbedBuilder().setTitle(`⏰ أوقات الأوامر — ${msg.author.username}`).setColor('#3498db').addFields(...fields).setTimestamp()]});
    }

    // قضية
    if (cmd==='قضية') {
      const target=msg.mentions.users.first();
      if(!target) return msg.reply('❌ الاستخدام: `قضية @السارق`');
      if(target.id===msg.author.id) return msg.reply('❌ ما تقدر ترفع قضية على نفسك!');
      const robRecord=db.prepare('SELECT * FROM rob_log WHERE robber_id=? AND victim_id=? ORDER BY at DESC LIMIT 1').get(target.id,msg.author.id);
      if(!robRecord) return msg.reply('❌ ما في سجل سرقة من هذا الشخص ضدك!');
      const existing=db.prepare("SELECT * FROM cases WHERE plaintiff_id=? AND defendant_id=? AND status='open'").get(msg.author.id,target.id);
      if(existing) return msg.reply('⚠️ عندك قضية مفتوحة على هذا الشخص!');
      db.prepare('INSERT INTO cases (plaintiff_id,defendant_id,stolen_amount) VALUES (?,?,?)').run(msg.author.id,target.id,robRecord.amount);
      const caseId=db.prepare('SELECT last_insert_rowid() as id').get().id;
      const targetUser=db.prepare('SELECT * FROM users WHERE id=?').get(target.id);
      const winChance=targetUser?Math.min(0.85,0.5+(100-targetUser.reputation)*0.004):0.6;
      const plaintiffWins=Math.random()<winChance;
      const award=robRecord.amount*3;
      if(plaintiffWins){
        const actualPay=Math.min(award,(targetUser?.balance||0)+(targetUser?.bank||0));
        db.prepare('UPDATE users SET balance=MAX(0,balance-?) WHERE id=?').run(Math.min(actualPay,targetUser?.balance||0),target.id);
        db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(actualPay,msg.author.id);
        db.prepare("UPDATE cases SET status='closed',verdict='plaintiff' WHERE id=?").run(caseId);
        db.prepare('UPDATE users SET reputation=MAX(0,reputation-20) WHERE id=?').run(target.id);
        try{client.users.fetch(target.id).then(u=>u.send(`⚖️ **خسرت القضية!**\nالحكم: دفع **${fmt(actualPay)}** و -20 سمعة`).catch(()=>{})).catch(()=>{});}catch(e){}
        return msg.reply({embeds:[new EmbedBuilder().setTitle('⚖️ فزت بالقضية!').setColor('#00ff88')
          .addFields({name:'🦹 المتهم',value:target.username,inline:true},{name:'💰 المسروق',value:fmt(robRecord.amount),inline:true},{name:'✅ التعويض ×3',value:fmt(actualPay),inline:true},{name:'📋 الحكم',value:'إدانة',inline:false})
          .setFooter({text:'⚠️ المتهم خسر 20 سمعة وسيظهر في ملفه كحرامي'})]});
      } else {
        db.prepare("UPDATE cases SET status='closed',verdict='defendant' WHERE id=?").run(caseId);
        const courtFee=Math.floor(robRecord.amount*0.1);
        db.prepare('UPDATE users SET balance=MAX(0,balance-?) WHERE id=?').run(courtFee,msg.author.id);
        db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(courtFee);
        return msg.reply({embeds:[new EmbedBuilder().setTitle('⚖️ خسرت القضية!').setColor('#e74c3c')
          .addFields({name:'📋 الحكم',value:'تبرئة',inline:true},{name:'💸 رسوم المحكمة',value:fmt(courtFee),inline:true})]});
      }
    }

    // قضاياي
    if (cmd==='قضاياي') {
      const myCases=db.prepare('SELECT * FROM cases WHERE plaintiff_id=? OR defendant_id=? ORDER BY created_at DESC LIMIT 5').all(msg.author.id,msg.author.id);
      if(myCases.length===0) return msg.reply('📋 ليس لديك قضايا!');
      const desc=myCases.map(c=>{
        const other=c.plaintiff_id===msg.author.id?db.prepare('SELECT username FROM users WHERE id=?').get(c.defendant_id):db.prepare('SELECT username FROM users WHERE id=?').get(c.plaintiff_id);
        const role=c.plaintiff_id===msg.author.id?'مدعي':'متهم';
        const status=c.status==='open'?'🟡 مفتوحة':c.verdict==='plaintiff'?'✅ فاز المدعي':'❌ تبرئة';
        return `• ${role} ضد **${other?.username||'مجهول'}** — ${fmt(c.stolen_amount)} — ${status}`;
      }).join('\n');
      return msg.reply({embeds:[new EmbedBuilder().setTitle('⚖️ قضاياي').setColor('#3498db').setDescription(desc)]});
    }

    // عصابات
    if (cmd==='انشاء_عصابة'||cmd==='إنشاء_عصابة') {
      const name=args[0]; if(!name) return msg.reply('❌ الاستخدام: `انشاء_عصابة [اسم]`');
      const existing=db.prepare('SELECT * FROM gangs WHERE leader_id=? OR member2_id=? OR member3_id=?').get(msg.author.id,msg.author.id,msg.author.id);
      if(existing) return msg.reply('❌ أنت بالفعل في عصابة!');
      if(db.prepare('SELECT * FROM gangs WHERE name=?').get(name)) return msg.reply('❌ اسم العصابة مأخوذ!');
      const cost=50_000; if(user.balance<cost) return msg.reply(`❌ تحتاج **${fmt(cost)}**`);
      db.prepare('UPDATE users SET balance=balance-? WHERE id=?').run(cost,msg.author.id);
      db.prepare('INSERT INTO gangs (name,leader_id) VALUES (?,?)').run(name,msg.author.id);
      return msg.reply({embeds:[new EmbedBuilder().setTitle('🔫 تم إنشاء العصابة!').setColor('#e74c3c')
        .addFields({name:'🏴 الاسم',value:name,inline:true},{name:'👑 القائد',value:msg.author.username,inline:true},{name:'💰 التكلفة',value:fmt(cost),inline:true},{name:'📋 المميزات',value:['👥 حد أقصى 3 أعضاء','💰 خزنة مشتركة','⚔️ سرقة جماعية (×1.5)','📊 ليدربورد العصابات'].join('\n')})
        .setFooter({text:'دعوة_عصابة @شخص — لإضافة أعضاء'})]});
    }
    if (cmd==='دعوة_عصابة') {
      const target=msg.mentions.users.first(); if(!target) return msg.reply('❌ الاستخدام: `دعوة_عصابة @شخص`');
      const gang=db.prepare('SELECT * FROM gangs WHERE leader_id=?').get(msg.author.id);
      if(!gang) return msg.reply('❌ لست قائد عصابة!');
      if(db.prepare('SELECT * FROM gangs WHERE leader_id=? OR member2_id=? OR member3_id=?').get(target.id,target.id,target.id)) return msg.reply('❌ هذا الشخص في عصابة!');
      const count=[gang.leader_id,gang.member2_id,gang.member3_id].filter(Boolean).length;
      if(count>=3) return msg.reply('❌ العصابة ممتلئة! (حد أقصى 3)');
      if(!gang.member2_id){db.prepare('UPDATE gangs SET member2_id=? WHERE id=?').run(target.id,gang.id);}
      else{db.prepare('UPDATE gangs SET member3_id=? WHERE id=?').run(target.id,gang.id);}
      getUser(target.id,target.username);
      try{client.users.fetch(target.id).then(u=>u.send(`🔫 **دُعيت لعصابة ${gang.name}!**`).catch(()=>{})).catch(()=>{});}catch(e){}
      return msg.reply(`✅ تم إضافة **${target.username}** لعصابة **${gang.name}**!`);
    }
    if (cmd==='مغادرة_عصابة') {
      const gang=db.prepare('SELECT * FROM gangs WHERE leader_id=? OR member2_id=? OR member3_id=?').get(msg.author.id,msg.author.id,msg.author.id);
      if(!gang) return msg.reply('❌ لست في عصابة!');
      if(gang.leader_id===msg.author.id){
        db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(gang.treasury,msg.author.id);
        db.prepare('DELETE FROM gangs WHERE id=?').run(gang.id);
        return msg.reply({embeds:[new EmbedBuilder().setTitle('🔫 تم حل العصابة').setColor('#888').setDescription(`حُلّت عصابة **${gang.name}**\nالخزنة: **${fmt(gang.treasury)}** أُعيدت للقائد`)]});
      } else {
        if(gang.member2_id===msg.author.id)db.prepare('UPDATE gangs SET member2_id=NULL WHERE id=?').run(gang.id);
        else db.prepare('UPDATE gangs SET member3_id=NULL WHERE id=?').run(gang.id);
        return msg.reply(`✅ غادرت عصابة **${gang.name}**`);
      }
    }
    if (cmd==='عصابتي') {
      const gang=db.prepare('SELECT * FROM gangs WHERE leader_id=? OR member2_id=? OR member3_id=?').get(msg.author.id,msg.author.id,msg.author.id);
      if(!gang) return msg.reply('❌ لست في عصابة!');
      const leader=db.prepare('SELECT username FROM users WHERE id=?').get(gang.leader_id);
      const m2=gang.member2_id?db.prepare('SELECT username FROM users WHERE id=?').get(gang.member2_id):null;
      const m3=gang.member3_id?db.prepare('SELECT username FROM users WHERE id=?').get(gang.member3_id):null;
      return msg.reply({embeds:[new EmbedBuilder().setTitle(`🔫 عصابة ${gang.name}`).setColor('#e74c3c')
        .addFields({name:'👥 الأعضاء',value:[`👑 ${leader?.username||'?'}`,m2?`👤 ${m2.username}`:'🔘 فارغ',m3?`👤 ${m3.username}`:'🔘 فارغ'].join('\n'),inline:true},{name:'💰 الخزنة',value:fmt(gang.treasury),inline:true},{name:'⚔️ انتصارات',value:`${gang.wins}`,inline:true})
        .setFooter({text:'سرقة_جماعية @ضحية | إيداع_عصابة مبلغ'})]});
    }
    if (cmd==='سرقة_جماعية') {
      const left=cooldownLeft(user,'سرقة'); if(left>0) return msg.reply(`⏰ انتظر **${fmtTime(left)}**`);
      const gang=db.prepare('SELECT * FROM gangs WHERE leader_id=? OR member2_id=? OR member3_id=?').get(msg.author.id,msg.author.id,msg.author.id);
      if(!gang) return msg.reply('❌ لست في عصابة!');
      const target=msg.mentions.users.first(); if(!target) return msg.reply('❌ الاستخدام: `سرقة_جماعية @شخص`');
      if([gang.leader_id,gang.member2_id,gang.member3_id].includes(target.id)) return msg.reply('❌ ما تسرق زميلك!');
      const victim=db.prepare('SELECT * FROM users WHERE id=?').get(target.id);
      if(!victim||victim.balance<500) return msg.reply('😅 الضحية فقيرة!');
      if(victim.protection_until>Date.now()) return msg.reply(`🛡 **${target.username}** محمي!`);
      const success=Math.random()>0.35;
      db.prepare('UPDATE users SET last_rob=? WHERE id=?').run(Date.now(),msg.author.id);
      if(success){
        let stolen=Math.floor(Math.random()*victim.balance*0.20)+200;
        stolen=slaveCut(msg.author.id,stolen,'السرقة الجماعية');
        db.prepare('UPDATE users SET balance=balance+?,reputation=MAX(0,reputation-10) WHERE id=?').run(stolen,msg.author.id);
        db.prepare('UPDATE users SET balance=MAX(0,balance-?) WHERE id=?').run(stolen,target.id);
        db.prepare('INSERT INTO rob_log (robber_id,victim_id,amount) VALUES (?,?,?)').run(msg.author.id,target.id,stolen);
        db.prepare('UPDATE gangs SET wins=wins+1 WHERE id=?').run(gang.id);
        try{client.users.fetch(target.id).then(u=>u.send(`🔫 **سرقة جماعية!**\nعصابة **${gang.name}** سرقت **${fmt(stolen)}**!`).catch(()=>{})).catch(()=>{});}catch(e){}
        return msg.reply({embeds:[new EmbedBuilder().setTitle('🔫 نجحت السرقة الجماعية!').setColor('#ff6b35').setDescription(`سرقت **${fmt(stolen)}** من ${target.username}!`).setFooter({text:'⚠️ -10 سمعة | +1 انتصار'})]});
      } else {
        const fine=Math.floor(user.balance*0.12);
        db.prepare('UPDATE users SET balance=MAX(0,balance-?),reputation=MAX(0,reputation-15) WHERE id=?').run(fine,msg.author.id);
        db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(fine);
        return msg.reply({embeds:[new EmbedBuilder().setTitle('👮 فشلت!').setColor('#e74c3c').setDescription(`دفعت **${fmt(fine)}** غرامة و -15 سمعة!`)]});
      }
    }
    if (cmd==='إيداع_عصابة'||cmd==='ايداع_عصابة') {
      const amount=parseAmount(args[0],user.balance); if(isNaN(amount)||amount<=0) return msg.reply('❌ الاستخدام: `إيداع_عصابة [مبلغ]`');
      const gang=db.prepare('SELECT * FROM gangs WHERE leader_id=? OR member2_id=? OR member3_id=?').get(msg.author.id,msg.author.id,msg.author.id);
      if(!gang) return msg.reply('❌ لست في عصابة!');
      if(user.balance<amount) return msg.reply('❌ رصيدك ما يكفي!');
      db.prepare('UPDATE users SET balance=balance-? WHERE id=?').run(amount,msg.author.id);
      db.prepare('UPDATE gangs SET treasury=treasury+? WHERE id=?').run(amount,gang.id);
      return msg.reply(`✅ أودعت **${fmt(amount)}** في خزنة **${gang.name}**!`);
    }
    if (cmd==='عصابات') {
      const topGangs=db.prepare('SELECT * FROM gangs ORDER BY wins DESC LIMIT 5').all();
      if(topGangs.length===0) return msg.reply('🔫 لا توجد عصابات بعد!');
      const medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
      const desc=topGangs.map((g,i)=>{const leader=db.prepare('SELECT username FROM users WHERE id=?').get(g.leader_id);const cnt=[g.leader_id,g.member2_id,g.member3_id].filter(Boolean).length;return `${medals[i]} **${g.name}** — قائد: ${leader?.username||'?'} | أعضاء: ${cnt}/3 | انتصارات: ${g.wins} | خزنة: ${fmt(g.treasury)}`;}).join('\n');
      return msg.reply({embeds:[new EmbedBuilder().setTitle('🔫 أقوى العصابات').setColor('#e74c3c').setDescription(desc).setTimestamp()]});
    }

    // اوامر
    if (cmd==='اوامر'||cmd==='أوامر') {
      return msg.reply({embeds:[new EmbedBuilder().setTitle('📋 قائمة الأوامر الكاملة').setColor('#4e8aff')
        .addFields(
          {name:'👤 الحساب',value:['`ملفي` `رصيد` `إحصائياتي` `وقت` `سمعة`'].join('\n')},
          {name:'💰 الكسب',value:['`راتب` — كل ساعة','`عمل` — كل ساعة'].join('\n')},
          {name:'🏦 البنك',value:['`إيداع` `سحب` `تحويل @شخص مبلغ` `قرض مبلغ` `سداد`'].join('\n')},
          {name:'⛏️ المناجم',value:['`مناجم` `شراء منجم [id]` `تعدين` `مستودعي` `مناجمي`','`بيع مورد كل` — يبيع كل شيء دفعة','`بيع مورد [اسم] [كمية]` `بيع منجم`'].join('\n')},
          {name:'🎁 صناديق الحظ',value:['`صناديق` — عرض الصناديق','`شراء صندوق [عادي/فضي/ذهبي/أسطوري]`'].join('\n')},
          {name:'✈️ الرحلات',value:['`دول` — عرض دول الاستثمار','`رحلة [مبلغ] [الدولة]` — 3 ساعات','`نتيجة_رحلة` `رحلتي`'].join('\n')},
          {name:'⛓️ العبودية',value:['`شراء شخص @شخص مبلغ` `تحرير` `عبيدي`'].join('\n')},
          {name:'🎮 الألعاب',value:['`مجازفة` `استثمر` `تداول` `سرقة @شخص`'].join('\n')},
          {name:'🛡 الحماية',value:['`حماية 6/12/24/72`'].join('\n')},
          {name:'⚖️ القضايا',value:['`قضية @شخص` `قضاياي`'].join('\n')},
          {name:'🔫 العصابات',value:['`انشاء_عصابة [اسم]` `دعوة_عصابة @شخص` `عصابتي`','`سرقة_جماعية @شخص` `إيداع_عصابة مبلغ` `مغادرة_عصابة` `عصابات`'].join('\n')},
          {name:'📊 عام',value:['`متصدرون` `الحكومة`'].join('\n')},
        ).setFooter({text:'💡 كل | نص | ربع | ثلث | 1k | 1m | 1b | 1t'})]});
    }

    // أوامر الإدارة
    const isOwner=msg.author.id===CONFIG.OWNER_ID||CONFIG.EXTRA_OWNERS.includes(msg.author.id);
    if (!isOwner) return;

    if (cmd==='تفضل'||cmd==='أعطِ') {
      const target=msg.mentions.users.first(), amount=parseAmount(args[1]);
      if(!target||isNaN(amount)) return msg.reply('❌ الاستخدام: `تفضل @شخص مبلغ`');
      getUser(target.id,target.username); db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(amount,target.id);
      return msg.reply(`✅ أضفت **${fmt(amount)}** لـ ${target.username}`);
    }
    if (cmd==='خذ') {
      const target=msg.mentions.users.first(), amount=parseAmount(args[1]);
      if(!target||isNaN(amount)) return msg.reply('❌ الاستخدام: `خذ @شخص مبلغ`');
      db.prepare('UPDATE users SET balance=MAX(0,balance-?) WHERE id=?').run(amount,target.id);
      db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(amount,msg.author.id);
      return msg.reply(`✅ أخذت **${fmt(amount)}** من ${target.username}`);
    }
    if (cmd==='ريست') {
      const target=msg.mentions.users.first(); if(!target) return msg.reply('❌ الاستخدام: `ريست @شخص`');
      db.prepare('UPDATE users SET balance=5000,bank=0,loan=0,loan_due=0,reputation=100 WHERE id=?').run(target.id);
      db.prepare('DELETE FROM user_mines WHERE owner_id=?').run(target.id);
      db.prepare('DELETE FROM mine_inventory WHERE owner_id=?').run(target.id);
      db.prepare('DELETE FROM slaves WHERE slave_id=? OR owner_id=?').run(target.id,target.id);
      return msg.reply(`✅ تم ريست حساب **${target.username}**`);
    }
    if (cmd==='ريست_الكل') {
      if(args[0]!=='تأكيد') return msg.reply('⚠️ للتأكيد: `ريست_الكل تأكيد`');
      db.prepare('UPDATE users SET balance=5000,bank=0,loan=0,loan_due=0,reputation=100,last_salary=0,last_work=0,last_gamble=0,last_invest=0,last_trade=0,last_rob=0,last_transfer=0,last_mine=0,protection_until=0').run();
      db.prepare('DELETE FROM user_mines').run(); db.prepare('DELETE FROM mine_inventory').run();
      db.prepare('DELETE FROM slaves').run(); db.prepare('UPDATE government SET treasury=0').run();
      return msg.reply('✅ تم ريست الكل! 🔄');
    }
    if (cmd==='سمعة_أدمن') {
      const target=msg.mentions.users.first(), amount=parseInt(args[1]);
      if(!target||isNaN(amount)) return msg.reply('❌ الاستخدام: `سمعة_أدمن @شخص رقم`');
      db.prepare('UPDATE users SET reputation=MAX(0,MIN(100,reputation+?)) WHERE id=?').run(amount,target.id);
      return msg.reply(`✅ تم تعديل سمعة **${target.username}** بـ ${amount>0?'+':''}${amount}`);
    }

  } catch(e) { console.error('خطأ:',e); msg.reply('❌ حدث خطأ غير متوقع!').catch(()=>{}); }
});

client.on('interactionCreate', async (interaction) => {
  if(!interaction.isButton()) return;
  const [type,pageStr]=interaction.customId.split('_');
  if(pageStr==='info') return interaction.deferUpdate();
  const page=parseInt(pageStr); if(isNaN(page)) return;
  if(type==='mines'){const p=Math.max(0,Math.min(page,Math.ceil(MINES_LIST.length/MINES_PER_PAGE)-1));const {embed,totalPages}=buildMinesEmbed(p);return interaction.update({embeds:[embed],components:[buildPageButtons(p,totalPages,'mines')]});}
});

function startTaxSystem() {
  setInterval(()=>{
    try{
      const users=db.prepare('SELECT * FROM users').all(); let total=0;
      for(const u of users){const tax=Math.floor((u.balance+u.bank)*0.01);if(tax<=0)continue;const fromBal=Math.min(tax,u.balance),fromBank=tax-fromBal;db.prepare('UPDATE users SET balance=balance-?,bank=MAX(0,bank-?) WHERE id=?').run(fromBal,fromBank,u.id);total+=tax;}
      db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(total);
      console.log(`⚖️ ضرائب: ${total.toLocaleString()}`);
    }catch(e){console.error('خطأ ضرائب:',e);}
  },24*60*60*1000);
}

function startConfiscationSystem() {
  setInterval(()=>{
    try{
      const now=Date.now(), overdue=db.prepare('SELECT * FROM users WHERE loan>0 AND loan_due>0 AND loan_due<?').all(now);
      for(const u of overdue){
        if(u.protection_until>now) continue;
        const cut=Math.floor((u.balance+u.bank)*0.3);
        db.prepare('UPDATE users SET balance=MAX(0,balance-?),loan=0,loan_due=0 WHERE id=?').run(cut,u.id);
        db.prepare('UPDATE government SET treasury=treasury+? WHERE id=1').run(cut);
      }
    }catch(e){console.error('خطأ مصادرة:',e);}
  },60*60*1000);
}

client.login(process.env.TOKEN);
