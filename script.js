import { supabase } from './supabase.js';

const denied = document.querySelector('#access-denied');
const chat = document.querySelector('#chat');
const messagesList = document.querySelector('#messages');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#message-input');
const userInput = document.querySelector('#user');
const userCountDisplay = document.querySelector('#user-count');
const themeToggle = document.querySelector('#theme-toggle');

let userCount = 0;
let lastMessageTime = 0;
const MESSAGE_COOLDOWN = 3000;

// ---------------- Theme ----------------
function loadTheme() {
  const t = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', t);
}
function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current==='dark'?'light':'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
themeToggle.addEventListener('click', toggleTheme);
loadTheme();

// ---------------- Dev / Battery ----------------
function isDevMode() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('dev')==='1' || localStorage.getItem('devMode')==='1';
}

function enableChatUI() { denied.style.display='none'; chat.style.display='flex'; initChat(); }
function disableChatUI() { denied.style.display='flex'; chat.style.display='none'; }

if (isDevMode()) { enableChatUI(); }
else if('getBattery' in navigator){
  navigator.getBattery().then(b => {
    const checkBattery=()=> b.level<=0.05 ? enableChatUI():disableChatUI();
    checkBattery();
    b.addEventListener('levelchange',checkBattery);
  }).catch(()=> disableChatUI());
} else { disableChatUI(); }

// ---------------- Messages ----------------
function escapeHTML(str=''){ return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }

async function loadMessages(){
  const { data, error } = await supabase.from('messages').select('*').order('created_at',{ascending:true});
  if(error) return console.error(error);
  messagesList.innerHTML = data.map(m=>`<p><b>${escapeHTML(m.username)}:</b> ${escapeHTML(m.text)}</p>`).join('');
  messagesList.scrollTop = messagesList.scrollHeight;
}

async function sendMessage(e){
  e.preventDefault();
  const user = userInput.value.trim();
  const text = input.value.trim();
  if(!user||!text) return;
  if(Date.now()-lastMessageTime<MESSAGE_COOLDOWN){ alert("Patiente un peu 😉"); return; }
  lastMessageTime=Date.now();
  const { error } = await supabase.from('messages').insert([{username:user,text}]);
  if(error) return console.error(error);
  input.value='';
  await loadMessages();
}

// ---------------- Realtime ----------------
function subscribeRealtime(){
  supabase.channel('public:messages')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>{
      const m=payload.new;
      const atBottom = messagesList.scrollTop + messagesList.clientHeight >= messagesList.scrollHeight-20;
      const p=document.createElement('p');
      p.innerHTML=`<b>${escapeHTML(m.username)}:</b> ${escapeHTML(m.text)}`;
      messagesList.appendChild(p);
      if(atBottom) messagesList.scrollTop = messagesList.scrollHeight;
    }).subscribe();
}

// ---------------- Users ----------------
function updateUserCount(change){ userCount+=change; userCountDisplay.textContent=`👥 ${Math.max(userCount,1)} connecté(s)`; }

// ---------------- Init ----------------
function initChat(){
  loadMessages();
  subscribeRealtime();
  form.addEventListener('submit',sendMessage);
  updateUserCount(1);
  window.addEventListener('beforeunload',()=>updateUserCount(-1));
}
