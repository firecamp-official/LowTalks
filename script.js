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

// 🔋 Détection du niveau de batterie
navigator.getBattery().then(battery => {
  function checkBattery() {
    if (battery.level <= 1.00) {
      denied.style.display = 'none';
      chat.style.display = 'flex';
    } else {
      denied.style.display = 'flex';
      chat.style.display = 'none';
    }
  }
  checkBattery();
  battery.addEventListener('levelchange', checkBattery);
});

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

// 🚫 Sécurité basique : empêcher HTML ou script injection
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ✉️ Envoi d’un message (avec anti-spam)
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

// 🔁 Écoute en temps réel des nouveaux messages
supabase
  .channel('messages')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    payload => {
      const m = payload.new;
      messagesList.innerHTML += `<p><b>${escapeHTML(m.username)}:</b> ${escapeHTML(m.text)}</p>`;
      messagesList.scrollTop = messagesList.scrollHeight;
    }
  )
  .subscribe();

form.addEventListener('submit', sendMessage);

// 🚀 Chargement initial
loadMessages();
