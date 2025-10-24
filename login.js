
// login.js - handles PIN create/login and redirects to dashboard.html
const STORAGE_KEY = 'ganesa_v5_5_appdata';
function toast(msg, ms=2800){ const c = document.getElementById('loginMsg'); if(!c) return; c.textContent = msg; setTimeout(()=>{ if(c.textContent===msg) c.textContent=''; }, ms); }
async function sha256Hex(message){ const enc = new TextEncoder(); const data = enc.encode(message); const hash = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join(''); }

function loadData(){ const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return null; try{ return JSON.parse(raw); }catch(e){ return null; } }
function saveData(obj){ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

document.getElementById('createPinBtn').addEventListener('click', async ()=>{
  const p = document.getElementById('pinInput').value.trim();
  if(!/^[0-9]{4,6}$/.test(p)){ toast('PIN harus 4-6 digit'); return; }
  const h = await sha256Hex(p);
  let data = loadData() || {settings:{}};
  data.settings = data.settings || {};
  data.settings.pinHash = h;
  saveData(data);
  // set session logged in
  localStorage.setItem('ganesa_logged_in','1');
  toast('PIN dibuat. Mengarahkan ke dashboard...');
  setTimeout(()=> location.href = 'dashboard.html', 900);
});

document.getElementById('loginBtn').addEventListener('click', async ()=>{
  const p = document.getElementById('pinInput').value.trim();
  if(!p){ toast('Masukkan PIN'); return; }
  const h = await sha256Hex(p);
  const data = loadData();
  if(!data || !data.settings || !data.settings.pinHash){ toast('Belum ada PIN. Silakan buat PIN terlebih dahulu.'); return; }
  if(h === data.settings.pinHash){
    localStorage.setItem('ganesa_logged_in','1');
    toast('PIN benar. Mengarahkan...');
    setTimeout(()=> location.href = 'dashboard.html', 700);
  } else {
    toast('PIN salah');
  }
});

// if already logged in, redirect immediately
if(localStorage.getItem('ganesa_logged_in')==='1'){
  // small delay to show message
  setTimeout(()=> location.href='dashboard.html', 400);
}
