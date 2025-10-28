import { supabase } from 'supabase.js';

const denied = document.querySelector('#access-denied');
const chat = document.querySelector('#chat');
const messagesList = document.querySelector('#messages');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#message-input');
const userInput = document.querySelector('#user');

// 🕒 Anti-spam : délai minimal entre deux messages (en ms)
const MESSAGE_COOLDOWN = 5000;
let lastMessageTime = 0;

// ✅ Mode dev/test toggle
function isDevMode() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('dev') === '1') return true;
  if (localStorage.getItem('devMode') === '1') return true;
  return false;
}

// Activer le chat
function enableChatUI() {
  denied.style.display = 'none';
  chat.style.display = 'flex';
}

// Désactiver le chat
function disableChatUI() {
  denied.style.display = 'flex';
  chat.style.display = 'none';
}

// 🔋 Détection batterie avec fallback dev mode
if (isDevMode()) {
  console.info('[5% Club] Mode DEV activé — chat accessible quel que soit le niveau de batterie.');
  enableChatUI();
} else if ('getBattery' in navigator) {
  navigator.getBattery().then(battery => {
    function checkBattery() {
      if (battery.level <= 0.05) {
        enableChatUI();
      } else {
        disableChatUI();
      }
    }
    checkBattery();
    battery.addEventListener('levelchange', checkBattery);
  }).catch(err => {
    console.warn('[5% Club] API Battery non disponible ou erreur :', err);
    disableChatUI();
  });
} else {
  console.warn('[5% Club] navigator.getBattery() non supporté — chat désactivé par défaut.');
  disableChatUI();
}

// 💬 Chargement des anciens messages
async function loadMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur chargement messages:', error);
    return;
  }

  messagesList.innerHTML = data
    .map(m => `<p><b>${escapeHTML(m.username)}:</b> ${escapeHTML(m.text)}</p>`)
    .join('');
  messagesList.scrollTop = messagesList.scrollHeight;
}

// 🚫 Sécurité : empêcher l’injection HTML
function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ✉️ Envoi d’un message (anti-spam)
async function sendMessage(e) {
  e.preventDefault();

  const user = userInput.value.trim();
  const text = input.value.trim();
  if (!user || !text) return;

  const now = Date.now();
  if (now - lastMessageTime < MESSAGE_COOLDOWN) {
    alert("Hey, respire un peu ! Attends quelques secondes avant de renvoyer un message 😉");
    return;
  }

  lastMessageTime = now;

  const { error } = await supabase.from('messages').insert([{ username: user, text }]);
  if (error) console.error('Erreur envoi message:', error);

  input.value = '';
}

// 🔁 Écoute en temps réel
supabase
  .channel('messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
    const m = payload.new;
    messagesList.innerHTML += `<p><b>${escapeHTML(m.username)}:</b> ${escapeHTML(m.text)}</p>`;
    messagesList.scrollTop = messagesList.scrollHeight;
  })
  .subscribe();

form.addEventListener('submit', sendMessage);
loadMessages();
