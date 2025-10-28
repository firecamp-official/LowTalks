import { supabase } from './supabase.js';

const denied = document.querySelector('#access-denied');
const chat = document.querySelector('#chat');
const messagesList = document.querySelector('#messages');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#message-input');
const userInput = document.querySelector('#user');
const userCountDisplay = document.querySelector('#user-count');

const MESSAGE_COOLDOWN = 3000; // délai anti-spam
let lastMessageTime = 0;
let userCount = 0;

/* ---------------------------
 🧠 Mode développeur ou batterie ≤ 5 %
--------------------------- */
function isDevMode() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('dev') === '1' || localStorage.getItem('devMode') === '1';
}

function enableChatUI() {
  denied.style.display = 'none';
  chat.style.display = 'flex';
  initChat();
}

function disableChatUI() {
  denied.style.display = 'flex';
  chat.style.display = 'none';
}

if (isDevMode()) {
  enableChatUI();
} else if ('getBattery' in navigator) {
  navigator.getBattery().then(battery => {
    const checkBattery = () => {
      if (battery.level <= 0.05) enableChatUI();
      else disableChatUI();
    };
    checkBattery();
    battery.addEventListener('levelchange', checkBattery);
  }).catch(err => {
    console.warn('⚠️ API Battery non dispo :', err);
    disableChatUI();
  });
} else {
  disableChatUI();
}

/* ---------------------------
 🧼 Sécurité texte
--------------------------- */
function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------------------------
 💬 Chargement des messages
--------------------------- */
async function loadMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Erreur chargement messages :', error);
    return;
  }

  messagesList.innerHTML = data
    .map(m => `<p><b>${escapeHTML(m.username)}</b> : ${escapeHTML(m.text)}</p>`)
    .join('');
  messagesList.scrollTop = messagesList.scrollHeight;
}

/* ---------------------------
 📩 Envoi d’un message
--------------------------- */
async function sendMessage(e) {
  e.preventDefault();

  const user = userInput.value.trim();
  const text = input.value.trim();
  if (!user || !text) return;

  const now = Date.now();
  if (now - lastMessageTime < MESSAGE_COOLDOWN) {
    showToast("⏳ Patiente un peu avant de renvoyer un message !");
    return;
  }
  lastMessageTime = now;

  const { error } = await supabase.from('messages').insert([{ username: user, text }]);
  if (error) {
    console.error('❌ Erreur envoi message :', error);
    showToast("Erreur d’envoi du message 😢");
    return;
  }

  input.value = '';
}

/* ---------------------------
 🔔 Abonnement temps réel
--------------------------- */
function subscribeRealtime() {
  supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const m = payload.new;
      const atBottom = messagesList.scrollTop + messagesList.clientHeight >= messagesList.scrollHeight - 20;
      const p = document.createElement('p');
      p.innerHTML = `<b>${escapeHTML(m.username)}</b> : ${escapeHTML(m.text)}`;
      messagesList.appendChild(p);
      if (atBottom) messagesList.scrollTop = messagesList.scrollHeight;
    })
    .subscribe();
}

/* ---------------------------
 👥 Gestion du nombre d’utilisateurs
--------------------------- */
function updateUserCount(change) {
  userCount += change;
  userCountDisplay.textContent = `👥 ${Math.max(userCount, 1)} connecté(s)`;
}

/* ---------------------------
 🍞 Petites notifications visuelles
--------------------------- */
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* ---------------------------
 🚀 Initialisation
--------------------------- */
function initChat() {
  loadMessages();
  subscribeRealtime();
  form.addEventListener('submit', sendMessage);
  updateUserCount(1);
  window.addEventListener('beforeunload', () => updateUserCount(-1));
}
