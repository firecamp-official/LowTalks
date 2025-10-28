import { supabase } from './supabase.js';

const denied = document.querySelector('#access-denied');
const chat = document.querySelector('#chat');
const messagesList = document.querySelector('#messages');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#message-input');
const userInput = document.querySelector('#user');

navigator.getBattery().then(battery => {
  function checkBattery() {
    if (battery.level <= 0.05) {
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

// Charger anciens messages
async function loadMessages() {
  const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
  if (data) {
    messagesList.innerHTML = data.map(m => `<p><b>${m.user}:</b> ${m.text}</p>`).join('');
  }
}

// Envoyer message
async function sendMessage(e) {
  e.preventDefault();
  const user = userInput.value.trim();
  const text = input.value.trim();
  if (!user || !text) return;

  await supabase.from('messages').insert([{ user, text }]);
  input.value = '';
}

// Réception en temps réel
supabase.channel('messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
    const m = payload.new;
    messagesList.innerHTML += `<p><b>${m.user}:</b> ${m.text}</p>`;
    messagesList.scrollTop = messagesList.scrollHeight;
  })
  .subscribe();

form.addEventListener('submit', sendMessage);
loadMessages();
