// app.js - main logic (ES module)
const CLIENT_ID = ''; // paste your Google OAuth client id
const API_KEY = '';   // paste your Google API key
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

const $ = sel => document.querySelector(sel);
const uid = () => 'id-'+Math.random().toString(36).slice(2,9);
function toast(msg, ms=3200){ const c = document.getElementById('toastContainer'); const t = document.createElement('div'); t.className='toast'; t.textContent = msg; c.appendChild(t); setTimeout(()=>t.remove(), ms); }

const STORAGE_KEY = 'ganesa_v5_5_appdata';
let appData = {
  tasks:[], journals:[], goals:[],
  finance:{transactions:[], savings:[]},
  timerHistory:[], settings:{theme:'light', pinHash:null, lastSync:null}
};

function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); }
function loadData(){ const raw = localStorage.getItem(STORAGE_KEY); if(raw) try{ appData = JSON.parse(raw); }catch(e){console.error(e);} }
async function sha256Hex(message){ const enc = new TextEncoder(); const data = enc.encode(message); const hash = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join(''); }

function buildLayout(){
  document.getElementById('app-root').innerHTML = `
  <div class="bg-wrap"><div class="bg-gradient"></div><div class="particle p1"></div><div class="particle p2"></div></div>
  <div class="toast-container" id="toastContainer"></div>
  <div class="app">
    <aside class="sidebar">
      <div class="logo"><div class="g">G</div><div><div class="brand">Ganesa Setya</div><div class="brand-sub">Private Workspace</div></div></div>
      <nav class="nav">
        <div class="nav-item active" data-panel="dashboard">📊 Dashboard</div>
        <div class="nav-item" data-panel="tasks">✅ Tugas</div>
        <div class="nav-item" data-panel="journal">📝 Jurnal</div>
        <div class="nav-item" data-panel="goals">🎯 Goals</div>
        <div class="nav-item" data-panel="finance">💰 Keuangan</div>
        <div class="nav-item" data-panel="calendar">📅 Kalender</div>
        <div style="margin-top:12px" class="muted-xs">Alat</div>
        <div class="nav-item" data-panel="timer">⏳ Timer</div>
        <div class="nav-item" data-panel="analytics">📈 Analytics</div>
        <div class="nav-item" data-panel="integrations">🔄 Backup/Sync</div>
      </nav>
      <div style="margin-top:auto">
        <div class="muted-xs" style="margin-bottom:8px">Privasi: data tersimpan lokal</div>
        <div style="display:flex;gap:8px">
          <button id="lockBtn" class="btn ghost small" style="flex:1">Kunci</button>
          <button id="clearBtn" class="btn ghost small" style="flex:1">Reset</button>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
          <label class="muted-xs">Tema</label>
          <button id="themeToggle" class="btn small">Toggle</button>
        </div>
      </div>
    </aside>
    <main class="main">
      <div class="panel" id="mainPanel">
        <div class="header"><div><h1 style="margin:0;font-family:Poppins,Inter">Dashboard</h1><div class="muted-xs" id="panelDesc">Ringkasan</div></div>
        <div style="display:flex;gap:12px;align-items:center"><div class="muted-xs" id="dateTime">—</div><div class="muted-xs" id="userBadge">Ganesa</div></div></div>
        <div class="kpis">
          <div class="card"><div class="muted-xs">Produktivitas</div><div class="amount" id="productivityScore">0%</div></div>
          <div class="card"><div class="muted-xs">Tugas Selesai</div><div class="amount" id="doneCount">0</div><div class="muted-xs">dari <span id="totalCount">0</span></div></div>
          <div class="card"><div class="muted-xs">Saldo</div><div class="amount" id="balance">Rp 0</div></div>
          <div class="card"><div class="muted-xs">Tabungan Tercapai</div><div class="amount" id="savingsReached">0</div></div>
        </div>
        <div class="cols-2" style="display:grid;grid-template-columns:1fr 380px;gap:14px">
          <div>
            <div class="card" style="margin-bottom:12px">
              <h3 style="margin:0">Fokus Hari Ini</h3>
              <div style="margin-top:8px"><input id="dailyFocus" class="input" placeholder="Apa fokus utama hari ini?" /></div>
              <div style="display:flex;gap:8px;margin-top:8px"><button id="saveFocus" class="btn small">Simpan</button><button id="clearFocus" class="btn ghost small">Hapus</button></div>
            </div>
            <div class="card" style="margin-bottom:12px">
              <h3 style="margin:0">Tugas Terbaru</h3>
              <ul id="recentTasks" class="list" style="margin-top:10px"></ul>
            </div>
            <div class="card">
              <h3 style="margin:0">Ringkasan Keuangan</h3>
              <div style="margin-top:8px" class="muted-xs">Pemasukan terakhir: <span id="lastIncome">-</span></div>
              <div class="muted-xs">Pengeluaran terakhir: <span id="lastExpense">-</span></div>
            </div>
          </div>
          <aside>
            <div class="card" style="margin-bottom:12px">
              <h3 style="margin:0">Timer Pomodoro</h3>
              <div style="font-size:2.2rem;font-weight:800;text-align:center;margin-top:12px" id="timerDisplay">25:00</div>
              <div style="display:flex;gap:8px;justify-content:center;margin-top:10px"><button id="timerStart" class="btn small">Mulai</button><button id="timerPause" class="btn ghost small">Jeda</button><button id="timerReset" class="btn ghost small">Reset</button></div>
            </div>
            <div class="card"><h3 style="margin:0">Mini Calendar</h3><div id="miniCalendar" style="margin-top:10px"></div></div>
          </aside>
        </div>
      </div>

      <!-- other panels simplified -->
      <div class="panel hidden" id="tasksPanel"><h3>Tugas</h3><div id="tasksList"></div></div>
      <div class="panel hidden" id="journalPanel"><h3>Jurnal</h3><div id="journalList"></div></div>
      <div class="panel hidden" id="goalsPanel"><h3>Goals</h3><div id="goalsList"></div></div>
      <div class="panel hidden" id="financePanel"><h3>Keuangan</h3><div id="txnList"></div><div id="savingsList"></div></div>
      <div class="panel hidden" id="timerPanel"><h3>Timer</h3><div id="timerHistory"></div></div>
      <div class="panel hidden" id="analyticsPanel"><h3>Analytics</h3><canvas id="prodChart" width="380" height="220"></canvas></div>
      <div class="panel hidden" id="integrationsPanel"><h3>Backup & Sync</h3>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button id="gsSignIn" class="btn">Sign in Google</button>
          <button id="syncToGs" class="btn">Sinkron ke Google Sheets</button>
          <button id="exportXlsx" class="btn ghost">Ekspor .xlsx</button>
          <button id="exportJson" class="btn ghost small">Ekspor JSON</button>
        </div>
        <div style="margin-top:8px" class="muted-xs" id="gsStatus">Status: belum terhubung</div>
      </div>
    </main>
  </div>
  <div class="voice-fab" id="voiceFab" title="Asisten Suara">🎤</div>
  <div class="login-overlay" id="loginOverlay">
    <div class="login-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div><h2 style="margin:0">Silakan login</h2><div class="muted-xs">Masukkan PIN 4-6 digit untuk membuka workspace Anda</div></div>
        <div style="font-weight:800;color:var(--accent);font-size:24px">G</div>
      </div>
      <div id="firstTime"><div class="muted-xs">Belum ada PIN? Buat PIN 4-6 digit.</div><div style="margin-top:8px"><input id="newPin" class="input" placeholder="Buat PIN (4-6 digit)" type="password" maxlength="6" inputmode="numeric"/></div><div style="margin-top:8px"><button id="createPin" class="btn">Buat PIN</button></div></div>
      <div id="loginBox" style="display:none;margin-top:10px"><div class="muted-xs">Masukkan PIN</div><input id="pinInput" class="input" placeholder="PIN" type="password" maxlength="6" inputmode="numeric" style="margin-top:8px"/><div style="display:flex;gap:8px;margin-top:8px"><button id="enterPin" class="btn">Masuk</button><button id="resetApp" class="btn ghost">Reset App</button></div></div>
      <div style="margin-top:10px" class="muted-xs">PIN di-hash & disimpan lokal — jangan bagikan PIN Anda.</div>
    </div>
  </div>
  `;

  // attach nav listeners
  document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', e => {
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    e.currentTarget.classList.add('active');
    const panel = e.currentTarget.dataset.panel;
    switchPanel(panel);
  }));
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('lockBtn').addEventListener('click', ()=>{ document.getElementById('loginOverlay').style.display='flex'; toast('Dashboard terkunci'); });
  document.getElementById('clearBtn').addEventListener('click', ()=>{ if(confirm('Hapus semua data lokal?')){ localStorage.removeItem(STORAGE_KEY); location.reload(); }});
  document.getElementById('gsSignIn').addEventListener('click', gsSignIn);
  document.getElementById('syncToGs').addEventListener('click', syncToGoogleSheets);
  document.getElementById('exportXlsx').addEventListener('click', exportXlsx);
  document.getElementById('exportJson').addEventListener('click', exportJson);
  document.getElementById('voiceFab').addEventListener('click', startVoice);
  // pin handlers
  document.getElementById('createPin').addEventListener('click', async ()=>{
    const p = document.getElementById('newPin').value.trim();
    if(!/^[0-9]{4,6}$/.test(p)){ toast('PIN harus 4-6 digit'); return; }
    const h = await sha256Hex(p);
    appData.settings.pinHash = h; saveData(); document.getElementById('newPin').value=''; toast('PIN dibuat. Silakan masuk.'); showLogin();
  });
  document.getElementById('enterPin').addEventListener('click', async ()=>{
    const p = document.getElementById('pinInput').value.trim(); if(!p){ toast('Masukkan PIN'); return; }
    const h = await sha256Hex(p); if(h === appData.settings.pinHash){ document.getElementById('pinInput').value=''; document.getElementById('loginOverlay').style.display='none'; afterAuth(); toast('Selamat datang!'); } else toast('PIN salah');
  });
}

function switchPanel(panel){
  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  if(panel === 'dashboard') document.getElementById('mainPanel').classList.remove('hidden');
  else {
    document.getElementById('mainPanel').classList.add('hidden');
    const el = document.getElementById(panel+'Panel');
    if(el) el.classList.remove('hidden');
  }
}

function toggleTheme(){ const cur = document.body.getAttribute('data-theme'); const next = cur === 'light' ? 'dark' : 'light'; document.body.setAttribute('data-theme', next); appData.settings.theme = next; saveData(); toast('Tema: '+next); }

function showLogin(){ document.getElementById('loginOverlay').style.display='flex'; const exists = !!appData.settings.pinHash; if(exists){ document.getElementById('firstTime').style.display='none'; document.getElementById('loginBox').style.display='block'; } else { document.getElementById('firstTime').style.display='block'; document.getElementById('loginBox').style.display='none'; } }

// minimal renderers
function renderAll(){ document.getElementById('dailyFocus') && (document.getElementById('dailyFocus').value = appData.focus ? appData.focus.text||'' : ''); renderTasks(); renderTxns(); renderSavings(); renderMiniCalendar(); renderDashboard(); }
function renderTasks(){ const el = document.getElementById('tasksList'); if(!el) return; el.innerHTML = appData.tasks.map(t=>`<div class="list-item"><div><strong>${escapeHtml(t.title)}</strong><div class="muted-xs">${t.due||''}</div></div></div>`).join('') || '<div class="muted-xs">Belum ada tugas</div>'; }
function renderTxns(){ const el = document.getElementById('txnList'); if(!el) return; el.innerHTML = appData.finance.transactions.map(tx=>`<div class="list-item"><div><strong>${tx.type==='income'? '+'+tx.amount: '-'+tx.amount}</strong><div class="muted-xs">${tx.category} • ${tx.date}</div></div></div>`).join('') || '<div class="muted-xs">Belum ada transaksi</div>'; }
function renderSavings(){ const el = document.getElementById('savingsList'); if(!el) return; el.innerHTML = appData.finance.savings.map(s=>`<div class="list-item"><div><strong>${escapeHtml(s.name)}</strong><div class="muted-xs">Target: ${s.target}</div></div></div>`).join('') || '<div class="muted-xs">Belum ada tabungan</div>'; }
function renderMiniCalendar(){ const el = document.getElementById('miniCalendar'); if(!el) return; el.innerHTML = '<div class="muted-xs">Mini calendar</div>'; }
function renderDashboard(){ const total = appData.tasks.length; const done = appData.tasks.filter(t=>t.done).length; document.getElementById('productivityScore') && (document.getElementById('productivityScore').textContent = total? Math.round((done/total)*100)+'%':'0%'); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// Voice (very simple)
let recognition = null;
function startVoice(){ if(!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)){ toast('SpeechRecognition tidak didukung'); return; } const SR = window.SpeechRecognition || window.webkitSpeechRecognition; recognition = new SR(); recognition.lang='id-ID'; recognition.interimResults=false; recognition.onresult = (e)=>{ const t = e.results[0][0].transcript; toast('Didengar: '+t); }; recognition.onerror = (e)=>{ toast('Voice error'); }; recognition.start(); }

// Google Sheets helpers (init & sync)
let tokenClient;
let accessTokenObj = null;
async function initGapiClient(){ if(!CLIENT_ID || !API_KEY){ document.getElementById('gsStatus') && (document.getElementById('gsStatus').textContent = 'CLIENT_ID/API_KEY belum diisi'); toast('Isi CLIENT_ID/API_KEY untuk Google Sync'); return; } await new Promise(res=> gapi.load('client', res)); await gapi.client.init({ apiKey: API_KEY, discoveryDocs:["https://sheets.googleapis.com/$discovery/rest?version=v4"] }); document.getElementById('gsStatus') && (document.getElementById('gsStatus').textContent='GAPI siap'); }
function gsSignIn(){ if(!CLIENT_ID) return toast('CLIENT_ID belum diset'); if(!tokenClient){ tokenClient = google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPES, callback: (resp)=>{ if(resp.error){ toast('Sign-in gagal'); return; } accessTokenObj = resp; document.getElementById('gsStatus') && (document.getElementById('gsStatus').textContent='Signed in'); toast('Signed in'); } }); } tokenClient.requestAccessToken(); }
async function syncToGoogleSheets(){ if(!accessTokenObj || !accessTokenObj.access_token){ toast('Silakan sign in dulu'); return; } const accessToken = accessTokenObj.access_token; const title = 'Private_Dashboard_Ganesa_'+(new Date()).toISOString().slice(0,10); const createBody = { properties:{title}, sheets:[{properties:{title:'Tasks'}},{properties:{title:'Journals'}},{properties:{title:'Goals'}},{properties:{title:'Finance'}},{properties:{title:'Savings'}},{properties:{title:'Timer'}}] }; try{ const resp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', { method:'POST', headers:{ 'Authorization':'Bearer '+accessToken, 'Content-Type':'application/json' }, body: JSON.stringify(createBody) }); if(!resp.ok){ const txt = await resp.text(); console.error(txt); toast('Gagal membuat spreadsheet'); return; } const sheet = await resp.json(); const sid = sheet.spreadsheetId; toast('Spreadsheet dibuat: '+sid); // batch update - simplified
    await batchUpdateSheet(sid,'Tasks',[['id','title','desc'],...appData.tasks.map(t=>[t.id,t.title,t.desc])],accessToken);
    toast('Sinkron selesai'); appData.settings.lastSync = new Date().toISOString(); saveData();
  }catch(e){ console.error(e); toast('Sinkron gagal'); }
}
async function batchUpdateSheet(spreadsheetId, sheetName, rows, accessToken){ const range = encodeURIComponent(sheetName+'!A1'); const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`; const body = { range: sheetName+'!A1', majorDimension:'ROWS', values: rows }; const resp = await fetch(url, { method:'PUT', headers:{ 'Authorization':'Bearer '+accessToken, 'Content-Type':'application/json' }, body: JSON.stringify(body) }); if(!resp.ok){ const txt = await resp.text(); console.error('batch err', txt); throw new Error('batch update err'); } }

// Exports
function exportXlsx(){ try{ const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appData.tasks), 'Tasks'); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appData.journals), 'Journals'); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appData.goals), 'Goals'); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appData.finance.transactions), 'Finance'); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appData.finance.savings), 'Savings'); XLSX.writeFile(wb, `ganesa-backup-${(new Date()).toISOString().slice(0,10)}.xlsx`); toast('.xlsx dibuat'); }catch(e){console.error(e); toast('.xlsx gagal');}}
function exportJson(){ const blob = new Blob([JSON.stringify(appData,null,2)],{type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ganesa-backup-${(new Date()).toISOString().slice(0,10)}.json`; a.click(); toast('Backup JSON dibuat'); }

// init
loadData();
buildLayout();
showLogin();
renderAll();
setInterval(()=>{ document.getElementById('dateTime') && (document.getElementById('dateTime').textContent = new Date().toLocaleString('id-ID', {weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'})); },60000);

export { appData, saveData };
