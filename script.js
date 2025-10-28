import { supabase } from './supabase.js';

const denied = document.querySelector('#access-denied');
const chat = document.querySelector('#chat');
const messagesList = document.querySelector('#messages');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#message-input');
const userInput = document.querySelector('#user');

const MESSAGE_COOLDOWN = 5000;
let lastMessageTime = 0;

// Mode dev/test
function isDevMode() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('dev') === '1' || localStorage.getItem('devMode') === '1';
}

// Afficher ou cacher le chat
function enableChatUI() {
  denied.style.display = 'none';
  chat.style.display = 'flex';
}
function disableChatUI() {
  denied.style.display = 'flex';
  chat.style.display = 'none';
}

// Activer chat selon batterie ou mode dev
if (isDevMode()) {
  enableChatUI();
} else if ('getBattery' in navigator) {
  navigator.getBattery().then(battery => {
    function checkBattery() {
      if (battery.level <= 0.05) enableChatUI();
      else disableChatUI();
    }
    checkBattery();
    battery.addEventListener('levelchange', checkBattery);
  }).catch(err => {
    console.warn('API Battery non dispo:', err);
    disableChatUI();
  });
} else {
  disableChatUI();
}

// Escape HTML pour éviter injections
function escapeHTML(str='') {
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

// Charger l'historique des messages
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

// Envoi d’un message avec anti-spam
async function sendMessage(e) {
  e.preventDefault();
  const user = userInput.value.trim();
  const text = input.value.trim();
  if (!user || !text) return;

  const now = Date.now();
  if (now - lastMessageTime < MESSAGE_COOLDOWN) {
    alert("Attends quelques secondes avant de renvoyer un message 😉");
    return;
  }
  lastMessageTime = now;

  const { error } = await supabase.from('messages').insert([{ username: user, text }]);
  if (error) {
    console.error('Erreur envoi message:', error);
    return;
  }

  // 🔄 Refresh automatique après l'envoi
  location.reload();
}


// Temps réel
function subscribeRealtime() {
  supabase.channel('messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      payload => {
        const m = payload.new;
        const atBottom = messagesList.scrollTop + messagesList.clientHeight >= messagesList.scrollHeight - 20;
        messagesList.innerHTML += `<p><b>${escapeHTML(m.username)}:</b> ${escapeHTML(m.text)}</p>`;
        if (atBottom) messagesList.scrollTop = messagesList.scrollHeight;
      }
    )
    .subscribe();
}

// Initialisation
form.addEventListener('submit', sendMessage);
loadMessages();
subscribeRealtime();
