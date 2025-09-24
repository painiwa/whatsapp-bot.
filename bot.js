const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./botdata.db', (err) => {
  if (err) console.log(err);
  else console.log('📂 Base de données connectée.');
});

// Création des tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS codes (number TEXT PRIMARY KEY, code TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS scores (userId TEXT PRIMARY KEY, score INTEGER)`);
});

const client = new Client({
  authStrategy: new LocalAuth()
});

const groupId = 'xxxxxxx-xxxx@g.us'; // Remplace par l’ID de ton groupe

// Quiz data
let currentQuiz = null;
let quizTimeout = null;
const quizQuestions = [
  { question: "Quelle est la balise HTML pour un paragraphe ?", answer: "p" },
  { question: "Quelle est la couleur hex de blanc ?", answer: "#ffffff" },
  { question: "Comment déclare-t-on une variable en JavaScript ?", answer: "let" }
];

// Commandes
const commands = {
  ".help": "Affiche les commandes",
  "!ping": "Test du bot",
  "!quiz": "Lancer un quiz",
  "!top": "Classement participants",
  "!tag": "Liste des membres et inactifs"
};

// Message de rappel chaque samedi
const rappelMessage = `
🩸🌑🩸🌑🩸🌑🩸🌑🩸🌑

███████  ██████  ██████       ██████  ██████  ███████ ███████
   ███  ██   ██ ██   ██     ██      ██   ██ ██      ██     
  ███   ██████  ██████      ██      ██████  █████   ███████
 ███    ██      ██          ██      ██      ██          ██
███████ ██      ██            ██████ ██      ███████ ███████

🩸🌑🩸🌑🩸🌑🩸🌑🩸

💀 *Planning des travaux – Communauté Programmation*💀
──────────────────────────────  
🗓 *Lundi* : 18h00 – 19h00 → Exercices & partage de code  
🗓 *Mercredi* : 18h00 – 19h00 → Mini-projets & défis  
🗓 *Vendredi* : 18h00 – 19h00 → Questions / réponses / résumé  
──────────────────────────────  
🔥 Soyez ponctuels, préparez vos questions, et plongez dans l’ombre du code… 🖤
`;

// Message de bienvenue
const welcomeText = `-m
🌑💀 BIENVENUE DANS LES ABYSSES 💀🌑

🕷️ Un nouveau membre vient de franchir les portes interdites…
Ici, le code devient arme, la connaissance devient pouvoir.

⚡ Devs of the Abyss n’est pas un simple groupe…
C’est une légion obscure, un ordre secret où seuls les dignes survivent.

🩸 Respecte le Code des Abysses, contribue à l’ombre, et tu seras des nôtres.
Sinon… le Néant t’attend.

🔥💻 Ton destin est scellé… Bienvenue parmi les ombres du Code. 💻🔥`;

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('🔗 Scanne le QR code pour connecter ton bot.');
});

client.on('ready', () => {
  console.log('🤖 Bot prêt !');

  // Rappel chaque samedi à 10h
  cron.schedule('0 10 * * 6', () => {
    client.sendMessage(groupId, rappelMessage);
  });
});

// Message de bienvenue
client.on('group_join', async (notification) => {
  try {
    let mentions = [];
    if (typeof notification.getRecipients === 'function') {
      const recipients = await notification.getRecipients();
      mentions = recipients.map(c => c);
      await notification.reply(welcomeText, { mentions });
    } else {
      await notification.reply(welcomeText);
    }
  } catch (err) {
    console.error("⚠️ Erreur bienvenue:", err);
    await notification.reply(welcomeText);
  }
});

// Gestion des commandes
client.on('message', async msg => {
  const text = msg.body.trim().toLowerCase();

  if (text === ".help") {
    let reply = '📜 Commandes disponibles :\n';
    for (const cmd in commands) reply += `${cmd} - ${commands[cmd]}\n`;
    msg.reply(reply);
    return;
  }

  if (text === "!ping") msg.reply("Pong !");
  if (text === "!quiz") {
    if (currentQuiz) { msg.reply("Quiz déjà en cours !"); return; }
    const q = quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
    currentQuiz = { ...q, winner: null };
    client.sendMessage(msg.from, `📝 Quiz : ${q.question}`);
    quizTimeout = setTimeout(() => {
      if (!currentQuiz.winner) {
        client.sendMessage(msg.from, `❌ Personne n'a trouvé ! Réponse : ${q.answer}`);
        currentQuiz = null;
      }
    }, 30000);
  }

  if (currentQuiz && text === currentQuiz.answer.toLowerCase()) {
    if (!currentQuiz.winner) {
      currentQuiz.winner = msg.author || msg.from;
      msg.reply(`🎉 Bravo ${msg._data.notifyName || "participant"} ! Bonne réponse !`);
      clearTimeout(quizTimeout);
      currentQuiz = null;
    }
  }
});

client.initialize();
